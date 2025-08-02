import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import './ControlTreeGraph.css';
import type {
  SerializableGraphState,
  GraphNode,
  GraphBranch,
  SerializableNode,
  SerializableBranch,
} from './types';
import { FiPlusCircle, FiEyeOff, FiEye, FiTrash2 } from 'react-icons/fi';

// --- API exposed by the component ---
export interface GraphApi {
  serialize: () => SerializableGraphState | null;
  createSubBranch: () => void;
  expandBranch: () => void;
  collapseSelected: () => void;
  foldSelected: () => void;
  unfoldSelected: () => void;
  deleteSelectedNode: () => void;
  deleteSelectedExtension: () => void;
  deleteSelectedChildren: () => void;
  hideChildren: () => void;
  hideExtension: () => void;
  unhideChildren: () => void;
  unhideExtension: () => void;
}

// --- Component Props ---
interface ControlTreeGraphProps {
  graphState: SerializableGraphState | null;
  onButtonStateChange: (states: any) => void; // Adjust type as needed
}

// --- Helper Functions ---
const getDescendantBranches = (startNode: GraphNode, allBranches: GraphBranch[]): GraphBranch[] => {
    const directChildren = allBranches.filter(b => b.parentNode === startNode);
    if (directChildren.length === 0) return [];
    
    const allDescendants = new Set<GraphBranch>(directChildren);
    let search = true;
    while (search) {
        search = false;
        allBranches.forEach(b => {
            if (b.parentNode && allDescendants.has(b.parentNode.branch)) {
                if (!allDescendants.has(b)) { allDescendants.add(b); search = true; }
            }
        });
    }
    return [...allDescendants];
}

// --- Main Component ---
const ControlTreeGraph = forwardRef<GraphApi, ControlTreeGraphProps>(
     ({ graphState, onButtonStateChange }, ref) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // State for the right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    actions: {
        hideExtension: boolean;
        hideChildren: boolean;
        unhide: boolean;
        deleteExtension: boolean;
        deleteChildren: boolean;
        deleteNode: boolean;
    }
  }>({
    visible: false, x: 0, y: 0,
    actions: { hideExtension: false, hideChildren: false, unhide: false, deleteExtension: false, deleteChildren: false, deleteNode: false }
  });

  const liveGraph = useRef<{
    branches: GraphBranch[];
    nodes: Map<number, GraphNode>;
    camera: { x: number; y: number; scale: number };
    state: SerializableGraphState | null;
  }>({
    branches: [],
    nodes: new Map(),
    camera: { x: 0, y: 0, scale: 1 },
    state: null
  });
    // track current selection so our overlay can enable/disable button
  const [selectedNode, setSelectedNode] = useState<GraphNode|null>(null);

  useImperativeHandle(ref, () => ({
    serialize: () => {
      const { branches, nodes, camera, state } = liveGraph.current;
      if (!state) return null;

      const serializableNodes: Record<string, SerializableNode> = {};
      nodes.forEach(node => { serializableNodes[node.id] = { id: node.id, x: node.x, y: node.y, isHead: node.isHead }; });
      
      const serializableBranches: Record<string, SerializableBranch> = {};
      const branchOrder: number[] = [];
      branches.forEach(branch => {
        serializableBranches[branch.id] = {
          id: branch.id,
          label: branch.label,
          color: branch.color, 
          nodeIds: branch.nodes.map(n => n.id),
          parentNodeId: branch.parentNode?.id ?? null,
        };
        branchOrder.push(branch.id);
      });

      const updatedState = { ...state };
      let maxNodeId = 0;
      nodes.forEach(node => { if(node.id > maxNodeId) maxNodeId = node.id });
      updatedState.nextNodeId = maxNodeId + 1;

      let maxBranchId = 0;
      branches.forEach(branch => { if(branch.id > maxBranchId) maxBranchId = branch.id });
      updatedState.nextBranchId = maxBranchId + 1;

      return { ...updatedState, camera, nodes: serializableNodes, branches: serializableBranches, branchOrder };
    },
    createSubBranch: () => (canvasRef.current as any)?.createSubBranch(),
    expandBranch: () => (canvasRef.current as any)?.expandBranch(),
    collapseSelected: () => (canvasRef.current as any)?.collapseSelected(),
    foldSelected: () => (canvasRef.current as any)?.foldSelected(),
    unfoldSelected: () => (canvasRef.current as any)?.unfoldSelected(),
    deleteSelectedNode: () => (canvasRef.current as any)?.deleteSelectedNode(),
    deleteSelectedExtension: () => (canvasRef.current as any)?.deleteSelectedExtension(),
    deleteSelectedChildren: () => (canvasRef.current as any)?.deleteSelectedChildren(),
    // new mappings
    hideChildren: () => (canvasRef.current as any)?.foldSelected(),
    hideExtension: () => (canvasRef.current as any)?.collapseSelected(),
    unhideChildren: () => (canvasRef.current as any)?.unfoldSelected(),
    unhideExtension: () => (canvasRef.current as any)?.expandBranch(),

  }));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !graphState) {
          const ctx = canvas?.getContext('2d');
          if(ctx && canvas) ctx.clearRect(0,0, canvas.width, canvas.height);
          return;
        };

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // --- Local state variables for the canvas effect ---
        let localSelectedNode: GraphNode | null = null;
        let hoveredBranch: GraphBranch | null = null;
        let hoverTimer: NodeJS.Timeout | null = null;
        let longPressTimer: NodeJS.Timeout | null = null;
        let mouseWorldPos = { x: 0, y: 0 };
        let showCoords = false;
        let isPanning = false; 
        let panStart = { x: 0, y: 0 };
        let mouseDownPos: { x: number; y: number } | null = null;
        let didDrag = false;
        
        // --- Constants ---
        const GRID_SPACING = 60;
        const NODE_RADIUS = 8;
        const NODE_SELECTED_RADIUS = 10;
        const BRANCH_WIDTH = 4;
        const BRANCH_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
        const NODE_SLOPE_Y = -GRID_SPACING; 
        const NODE_SLOPE_X = GRID_SPACING * 0.5;

        // --- Classes for graph elements ---
        class NodeImpl implements GraphNode {
            id: number; x: number; y: number; branch: GraphBranch; isHead: boolean; isHidden: boolean;
            constructor(id: number, x: number, y: number, branch: GraphBranch, isHead: boolean = false) { this.id = id; this.x = x; this.y = y; this.branch = branch; this.isHead = isHead; this.isHidden = false; }
            draw() {
                if (this.isHidden) return;
                const hasHiddenChildren = liveGraph.current.branches.some(b => b.parentNode === this && b.isHidden);
                const hasHiddenExtension = this.branch.nodes.some(n => n.y < this.y && n.isHidden);
                if (hasHiddenChildren || hasHiddenExtension) { ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 15; }
                ctx.beginPath();
                const radius = (this === localSelectedNode) ? NODE_SELECTED_RADIUS : NODE_RADIUS;
                const color = (this === localSelectedNode) ? '#ffffff' : this.branch.color;
                ctx.arc(this.x, this.y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
                if (this === localSelectedNode) { ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.stroke(); }
                ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
                if (this !== localSelectedNode) { ctx.beginPath(); ctx.arc(this.x, this.y, NODE_RADIUS * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#1a1a1a'; ctx.fill(); }
            }
            isClicked(pointX: number, pointY: number) { if (this.isHidden) return false; const distance = Math.sqrt(Math.pow(this.x - pointX, 2) + Math.pow(this.y - pointY, 2)); return distance < NODE_RADIUS * 1.5; }
        }
        class BranchImpl implements GraphBranch {
            id: number; label: string; nodes: GraphNode[]; color: string; parentNode: GraphNode | null; isHidden: boolean;
            constructor(id: number, label: string, color: string, parentNode: GraphNode | null = null) { this.id = id; this.label = label; this.nodes = []; this.color = color; this.parentNode = parentNode; this.isHidden = false; }
            addNode(node: GraphNode) { this.nodes.push(node); this.nodes.sort((a, b) => b.y - a.y); }
            draw() {
                if (this.isHidden) return;
                const visibleNodes = this.nodes.filter(n => !n.isHidden); if (visibleNodes.length < 1) return;
                ctx.strokeStyle = this.color; ctx.lineWidth = BRANCH_WIDTH; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
                if (this.parentNode) { ctx.beginPath(); ctx.moveTo(this.parentNode.x, this.parentNode.y); ctx.lineTo(visibleNodes[0].x, visibleNodes[0].y); ctx.stroke(); }
                for (let i = 0; i < visibleNodes.length - 1; i++) { const n1 = visibleNodes[i]; const n2 = visibleNodes[i+1]; ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke(); }
            }
        }
        
        // --- Drawing and Layout ---
        const draw = () => {
            const { camera } = liveGraph.current;
            ctx.save();
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.translate(camera.x, camera.y);
            ctx.scale(camera.scale, camera.scale);
            drawGrid();
            liveGraph.current.branches.forEach(branch => { if (!branch.isHidden) { branch.draw(); } });
            liveGraph.current.nodes.forEach(node => { if (!node.isHidden) { node.draw(); } });
            
            if (hoveredBranch) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = `${14 / camera.scale}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(hoveredBranch.label, mouseWorldPos.x, mouseWorldPos.y - 20 / camera.scale);
            }

            ctx.restore();
            if (showCoords) {
                ctx.font = '12px sans-serif';
                ctx.fillStyle = '#9ca3af';
                ctx.textAlign = 'left';
                ctx.fillText(`X: ${mouseWorldPos.x.toFixed(1)}, Y: ${mouseWorldPos.y.toFixed(1)}`, 10, canvas.height - 10);
            }
        };

        const drawGrid = () => {
            const { camera } = liveGraph.current;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1 / camera.scale;
            const viewLeft = -camera.x / camera.scale, viewTop = -camera.y / camera.scale;
            const viewRight = (canvas.width - camera.x) / camera.scale, viewBottom = (canvas.height - camera.y) / camera.scale;
            const firstCol = Math.floor(viewLeft / GRID_SPACING) * GRID_SPACING, lastCol = viewRight;
            const firstRow = Math.floor(viewTop / GRID_SPACING) * GRID_SPACING, lastRow = viewBottom;
            for (let x = firstCol; x <= lastCol; x += GRID_SPACING) { ctx.beginPath(); ctx.moveTo(x, viewTop); ctx.lineTo(x, viewBottom); ctx.stroke(); }
            for (let y = firstRow; y <= lastRow; y += GRID_SPACING) { ctx.beginPath(); ctx.moveTo(viewLeft, y); ctx.lineTo(viewRight, y); ctx.stroke(); }
            ctx.restore();
        };

        const getMousePos = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseWorldPos = {
                x: (e.clientX - rect.left - liveGraph.current.camera.x) / liveGraph.current.camera.scale,
                y: (e.clientY - rect.top - liveGraph.current.camera.y) / liveGraph.current.camera.scale
            };
            return mouseWorldPos;
        };

        // --- Deserialization ---
        liveGraph.current.state = graphState;
        liveGraph.current.camera = { ...graphState.camera };
        const nodes = new Map<number, GraphNode>(); const branches = new Map<number, GraphBranch>();
        for (const branchId of graphState.branchOrder) { const sBranch = graphState.branches[branchId]; branches.set(sBranch.id, new BranchImpl(sBranch.id, sBranch.label, sBranch.color)); }
        Object.values(graphState.nodes).forEach(sNode => { const parentBranch = Array.from(branches.values()).find(b => graphState.branches[b.id].nodeIds.includes(sNode.id))!; const node = new NodeImpl(sNode.id, sNode.x, sNode.y, parentBranch, sNode.isHead); nodes.set(sNode.id, node); parentBranch.addNode(node); });
        branches.forEach(branch => { const sBranch = graphState.branches[branch.id]; if (sBranch.parentNodeId) { branch.parentNode = nodes.get(sBranch.parentNodeId) ?? null; } });
        liveGraph.current.nodes = nodes; liveGraph.current.branches = graphState.branchOrder.map(id => branches.get(id)!);

        const relayout = () => {
            const mainBranch = liveGraph.current.branches.find(b => b.parentNode === null);
            if (!mainBranch) { draw(); return; }
            const childrenMap = new Map<number, GraphBranch[]>();
            liveGraph.current.branches.forEach(b => {
                if (b.parentNode) {
                    const parentId = b.parentNode.branch.id;
                    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
                    childrenMap.get(parentId)!.push(b);
                }
            });
            for (const children of childrenMap.values()) { children.sort((a, b) => a.parentNode!.y - b.parentNode!.y); }
            function layoutSubtree(branch: GraphBranch, startX: number): number {
                if (branch.nodes.length === 0) return startX;
                const currentX = branch.nodes[0].x;
                const shiftX = startX - currentX;
                if (shiftX !== 0) { branch.nodes.forEach(node => node.x += shiftX); }
                let rightmostX = startX;
                const children = childrenMap.get(branch.id) || [];
                children.forEach(child => {
                    if (!child.isHidden) {
                        const childStartX = rightmostX + GRID_SPACING;
                        const subtreeEndX = layoutSubtree(child, childStartX);
                        rightmostX = subtreeEndX;
                    }
                });
                return rightmostX;
            }
            let currentX = mainBranch.nodes[0].x;
            const rootChildren = childrenMap.get(mainBranch.id) || [];
            rootChildren.forEach(child => {
                if (!child.isHidden) {
                    const childStartX = currentX + GRID_SPACING;
                    const subtreeEndX = layoutSubtree(child, childStartX);
                    currentX = subtreeEndX;
                }
            });
            draw();
        };
        
        // --- Graph Manipulation Functions ---
        const selectNode = (node: GraphNode | null) => {
            localSelectedNode = node;
            // update our React state so overlay re-renders
            setSelectedNode(node);
            // This function prop was missing from the original file's dependencies
            if (onButtonStateChange) {
                onButtonStateChange({}); // You might want to pass actual button states here
            }
            draw();
        };
        
        const getNextColor = () => { const state = liveGraph.current.state!; const color = BRANCH_COLORS[state.nextColorIndex]; state.nextColorIndex = (state.nextColorIndex + 1) % BRANCH_COLORS.length; return color; }
        
        const createSubBranch = () => { 
            if (!localSelectedNode || liveGraph.current.branches.some(b => b.parentNode === localSelectedNode)) return; 
            const parentNode = localSelectedNode; 
            const state = liveGraph.current.state!; 
            const newLabel = `Sub-branch ${state.nextBranchId}`;
            const newBranch = new BranchImpl(state.nextBranchId++, newLabel, getNextColor(), parentNode); 
            const newNode = new NodeImpl(state.nextNodeId++, parentNode.x + NODE_SLOPE_X, parentNode.y + NODE_SLOPE_Y, newBranch, true); 
            newBranch.addNode(newNode); 
            liveGraph.current.branches.push(newBranch); 
            liveGraph.current.nodes.set(newNode.id, newNode); 
            relayout(); 
            selectNode(newNode); 
        };
        
        const expandBranch = () => { 
            if (!localSelectedNode || !localSelectedNode.isHead) return; 
            const headNode = localSelectedNode; 
            const branch = headNode.branch; 
            const state = liveGraph.current.state!; 
            headNode.isHead = false; 
            const newHeadNode = new NodeImpl(state.nextNodeId++, headNode.x, headNode.y - GRID_SPACING, branch, true); 
            branch.addNode(newHeadNode); 
            liveGraph.current.nodes.set(newHeadNode.id, newHeadNode); 
            relayout(); 
            selectNode(newHeadNode); 
        };
        
        const foldSelected = () => { getDescendantBranches(localSelectedNode, liveGraph.current.branches).forEach(b => { b.isHidden = true; b.nodes.forEach(n => n.isHidden = true); }); relayout(); selectNode(localSelectedNode); };
        const collapseSelected = () => { if (!localSelectedNode || localSelectedNode.isHead) return; const branch = localSelectedNode.branch; const nodesToHide = branch.nodes.filter(node => node.y < localSelectedNode!.y); nodesToHide.forEach(node => { node.isHidden = true; getDescendantBranches(node, liveGraph.current.branches).forEach(b => { b.isHidden = true; b.nodes.forEach(n => n.isHidden = true); }); }); localSelectedNode.isHead = true; relayout(); selectNode(localSelectedNode); };
        const unfoldSelected = () => {  getDescendantBranches(localSelectedNode, liveGraph.current.branches).forEach(b => { b.isHidden = false; b.nodes.forEach(n => n.isHidden = false); }); const branch = localSelectedNode.branch; branch.nodes.forEach(n => { n.isHidden = false; n.isHead = false; }); if (branch.nodes.length > 0) { const topNode = branch.nodes.reduce((prev, curr) => prev.y < curr.y ? prev : curr); topNode.isHead = true;} relayout(); selectNode(localSelectedNode); };
        const deleteSelectedChildren = () => {  const branchesToRemove = getDescendantBranches(localSelectedNode, liveGraph.current.branches); branchesToRemove.forEach(b => b.nodes.forEach(n => liveGraph.current.nodes.delete(n.id))); liveGraph.current.branches = liveGraph.current.branches.filter(b => !branchesToRemove.includes(b)); relayout(); selectNode(localSelectedNode); };
        const deleteSelectedExtension = () => { if (!localSelectedNode || localSelectedNode.isHead) return; const branch = localSelectedNode.branch; const nodesToRemove = new Set(branch.nodes.filter(node => node.y < localSelectedNode!.y)); if(nodesToRemove.size === 0) return; const branchesToRemove = new Set<GraphBranch>(); nodesToRemove.forEach(node => { getDescendantBranches(node, liveGraph.current.branches).forEach(b => branchesToRemove.add(b)); }); branchesToRemove.forEach(b => b.nodes.forEach(n => liveGraph.current.nodes.delete(n.id))); liveGraph.current.branches = liveGraph.current.branches.filter(b => !branchesToRemove.has(b)); branch.nodes = branch.nodes.filter(n => !nodesToRemove.has(n)); nodesToRemove.forEach(n => liveGraph.current.nodes.delete(n.id)); localSelectedNode.isHead = true; relayout(); selectNode(localSelectedNode); };
        const deleteSelectedNode = () => {
         if (!localSelectedNode) return;

          const nodeToDelete = localSelectedNode;
          const branchOfNode = nodeToDelete.branch;
          const allNodesToDelete = new Set<GraphNode>();
          const allBranchesToDelete = new Set<GraphBranch>();
          const nodesInExtension = branchOfNode.nodes.filter(n => n.y <= nodeToDelete.y);
          nodesInExtension.forEach(n => allNodesToDelete.add(n));
          allNodesToDelete.forEach(node => {
            const descendantBranches = getDescendantBranches(node, liveGraph.current.branches);
            descendantBranches.forEach(descBranch => {
              allBranchesToDelete.add(descBranch);
              descBranch.nodes.forEach(n => allNodesToDelete.add(n));
            });
          });
          liveGraph.current.branches = liveGraph.current.branches.filter(b => !allBranchesToDelete.has(b));
          allNodesToDelete.forEach(n => {
            if(n.branch && n.branch.nodes.every(node => allNodesToDelete.has(node))) {
                allBranchesToDelete.add(n.branch);
            }
            liveGraph.current.nodes.delete(n.id)
          });
          liveGraph.current.branches = liveGraph.current.branches.filter(b => !allBranchesToDelete.has(b));
          branchOfNode.nodes = branchOfNode.nodes.filter(n => !allNodesToDelete.has(n));
          if (branchOfNode.nodes.length > 0) {
            const newHead = branchOfNode.nodes.reduce((prev, curr) => (prev.y < curr.y ? prev : curr));
            newHead.isHead = true;
          } else {
            liveGraph.current.branches = liveGraph.current.branches.filter(b => b.id !== branchOfNode.id);
          }
          selectNode(null);
          relayout();
        };
        
        // --- Event Handlers ---
        const hideContextMenu = () => {
            setContextMenu(prev => ({ ...prev, visible: false }));
        };

        const handleDoubleClick = (e: MouseEvent) => {
            const worldPos = getMousePos(e);
            let clickedNode: GraphNode | null = null;
            for (const node of liveGraph.current.nodes.values()) {
                if (!node.isHidden && node.isClicked(worldPos.x, worldPos.y)) {
                    clickedNode = node;
                    break;
                }
            }

            if (clickedNode) {
                selectNode(clickedNode);
                createSubBranch();
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (longPressTimer) clearTimeout(longPressTimer);
            if (!didDrag) {
                const worldPos = getMousePos(e);
                let clickedNode: GraphNode | null = null;
                for (const node of liveGraph.current.nodes.values()) {
                    if (!node.isHidden && node.isClicked(worldPos.x, worldPos.y)) {
                        clickedNode = node;
                        break;
                    }
                }
                selectNode(clickedNode);
            }
            isPanning = false;
            canvas.style.cursor = 'grab';
            mouseDownPos = null;
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                hideContextMenu();
            }

            isPanning = false;
            didDrag = false;
            mouseDownPos = { x: e.clientX, y: e.clientY };
            panStart = { x: e.clientX - liveGraph.current.camera.x, y: e.clientY - liveGraph.current.camera.y };

            const worldPos = getMousePos(e);
            let clickedNode: GraphNode | null = null;
            for (const node of liveGraph.current.nodes.values()) {
                if (!node.isHidden && node.isClicked(worldPos.x, worldPos.y)) {
                    clickedNode = node;
                    break;
                }
            }

            if (clickedNode) {
                longPressTimer = setTimeout(() => {
                    selectNode(clickedNode);
                    const rect = canvas.getBoundingClientRect();
                    
                    const { branches } = liveGraph.current;
                    const isMainBranchNode = clickedNode.branch.parentNode === null;
                    const hasChildBranches = branches.some(b => b.parentNode === clickedNode);
                    const hasVisibleChildren = branches.some(b => b.parentNode === clickedNode && !b.isHidden);
                    const hasHiddenChildren = getDescendantBranches(clickedNode, branches).some(b => b.isHidden);
                    const hasHiddenExtension = clickedNode.branch.nodes.some(n => n.y < clickedNode!.y && n.isHidden);

                    setContextMenu({
                        visible: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        actions: {
                            hideExtension: !clickedNode.isHead,
                            hideChildren: hasVisibleChildren,
                            unhide: hasHiddenChildren || hasHiddenExtension,
                            deleteExtension: !clickedNode.isHead && !isMainBranchNode,
                            deleteChildren: hasChildBranches,
                            deleteNode: !isMainBranchNode,
                        }
                    });
                }, 500);
            }
        };
        
        const handleMouseMove = (e: MouseEvent) => {
            showCoords = true;
            getMousePos(e);
            if(mouseDownPos){
                const dx=Math.abs(e.clientX-mouseDownPos.x);
                const dy=Math.abs(e.clientY-mouseDownPos.y);
                if(dx>5||dy>5){
                    if (longPressTimer) clearTimeout(longPressTimer);
                    didDrag=true;
                    isPanning=true;
                    canvas.style.cursor='grabbing'
                }
            }
            
            if(isPanning){
                liveGraph.current.camera.x = e.clientX - panStart.x;
                liveGraph.current.camera.y = e.clientY - panStart.y;
            } else {
                if (hoverTimer) clearTimeout(hoverTimer);
                let potentialHoveredBranch: GraphBranch | null = null;
                const hoverRadius = NODE_RADIUS * 2.5; 
                for (const branch of liveGraph.current.branches) {
                    if (branch.isHidden) continue;
                    for (const node of branch.nodes) {
                        if (node.isHidden) continue;
                        const distance = Math.sqrt(Math.pow(node.x - mouseWorldPos.x, 2) + Math.pow(node.y - mouseWorldPos.y, 2));
                        if (distance < hoverRadius) {
                            potentialHoveredBranch = branch;
                            break;
                        }
                    }
                    if (potentialHoveredBranch) break;
                }
                if (potentialHoveredBranch) {
                    hoverTimer = setTimeout(() => {
                        if (potentialHoveredBranch !== hoveredBranch) {
                            hoveredBranch = potentialHoveredBranch;
                            draw();
                        }
                    }, 500);
                } else {
                    if (hoveredBranch) { hoveredBranch = null; }
                }
            }
            draw();
        };

        const handleMouseLeave = () => {
            showCoords = false;
            isPanning=false;
            canvas.style.cursor='grab';
            mouseDownPos=null; 
            if(longPressTimer) clearTimeout(longPressTimer);
            if(hoverTimer) clearTimeout(hoverTimer);
            if(hoveredBranch) { hoveredBranch=null; }
            draw();
        };

        const handleWheel = (e: WheelEvent) => { e.preventDefault(); const { camera } = liveGraph.current; const zoomSpeed=0.1,minZoom=0.2,maxZoom=3.0,oldScale=camera.scale; const mousePos={x:e.clientX-canvas.getBoundingClientRect().left,y:e.clientY-canvas.getBoundingClientRect().top}; const zoomDirection=e.deltaY<0?1:-1; camera.scale+=zoomDirection*zoomSpeed*camera.scale; camera.scale=Math.max(minZoom,Math.min(camera.scale,maxZoom)); camera.x=mousePos.x-((mousePos.x-camera.x)/oldScale)*camera.scale; camera.y=mousePos.y-((mousePos.y-camera.y)/oldScale)*camera.scale; draw(); };
        
        const funcs: Record<string, () => void> = {
            createSubBranch,
            expandBranch,
            foldSelected,
            collapseSelected,
            unfoldSelected,
            deleteSelectedChildren,
            deleteSelectedExtension,
            deleteSelectedNode,
        };

        Object.keys(funcs).forEach(key => {
            (canvas as any)[key] = funcs[key];
        });
                
        selectNode(null);

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            canvas.width = width;
            canvas.height = height;
            draw();
        });

        if (canvasContainerRef.current) { resizeObserver.observe(canvasContainerRef.current); }
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('wheel', handleWheel);
        canvas.addEventListener('dblclick', handleDoubleClick);

        return () => {
            resizeObserver.disconnect();
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [graphState, onButtonStateChange]);

    const handleMenuClick = (action: (() => void) | undefined) => {
        if (!action) {
            console.warn("Action was undefined — did you check the binding?");
            return;
        }
        action();
        hideContextMenu();;
        
    };

    const hideContextMenu = () => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    };

    // --- START: CORRECTED BLOCK ---
    const isRoot = selectedNode ? selectedNode.branch.parentNode === null : false;

    const hasChildren = selectedNode
        ? liveGraph.current.branches.some(b => b.parentNode === selectedNode)
        : false;

    const hasExtension = selectedNode ? !selectedNode.isHead : false;

    const hasHiddenChildren = selectedNode
        ? getDescendantBranches(selectedNode, liveGraph.current.branches).some(b => b.isHidden)
        : false;
        
    const hasHiddenExtension = selectedNode
        ? selectedNode.branch.nodes.some(n => n.y < selectedNode!.y && n.isHidden)
        : false;
    // --- END: CORRECTED BLOCK ---

   return (
    <div ref={canvasContainerRef} className="canvas-container">
      <canvas ref={canvasRef} className="graph-canvas" />

      <div className="controls-overlay">
        {/* 1) Create Sub‐Branch */}
        <button
          className="icon-btn create"
          disabled={!selectedNode}
          onClick={() => (ref as React.MutableRefObject<GraphApi>).current.createSubBranch()}
          title="Create Sub-Branch">
          <FiPlusCircle size={20}/>
        </button>

        {/* 2) Hide */}
        <div className="dropdown">
          <button
            className="icon-btn"
            disabled={!selectedNode}
            title="Hide…">
            <FiEyeOff size={20}/>
          </button>
          <div className="dropdown-menu">
            <button
              disabled={!hasChildren}
              onClick={() => (ref as React.MutableRefObject<GraphApi>).current.hideChildren()}>
              Hide Children
            </button>
            <button
              disabled={!hasExtension}
              onClick={() => (ref as React.MutableRefObject<GraphApi>).current.hideExtension()}>
              Hide Extension
            </button>
          </div>
        </div>

        {/* 3) Unhide (only if something’s hidden) */}
        {(hasHiddenChildren || hasHiddenExtension) && (
          <div className="dropdown">
            <button className="icon-btn" title="Unhide…">
              <FiEye size={20}/>
            </button>
            <div className="dropdown-menu">
              {hasHiddenChildren && (
                <button
                  onClick={() => (ref as React.MutableRefObject<GraphApi>).current.unhideChildren()}>
                  Unhide Children
                </button>
              )}
              {hasHiddenExtension && (
                <button
                  onClick={() => (ref as React.MutableRefObject<GraphApi>).current.unhideExtension()}>
                  Unhide Extension
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4) Delete */}
        <div className="dropdown">
          <button
            className="icon-btn danger"
            disabled={!selectedNode}
            title="Delete…">
            <FiTrash2 size={20}/>
          </button>
          <div className="dropdown-menu">
            <button
              disabled={!hasChildren}
              onClick={() => (ref as React.MutableRefObject<GraphApi>).current.deleteSelectedChildren()}>
              Delete Children
            </button>
            <button
              disabled={!hasExtension}
              onClick={() => (ref as React.MutableRefObject<GraphApi>).current.deleteSelectedExtension()}>
              Delete Extension
            </button>
            <button
              disabled={isRoot}
              onClick={() => (ref as React.MutableRefObject<GraphApi>).current.deleteSelectedNode()}>
              Delete Node
            </button>
          </div>
        </div>
      </div>
    </div>
    );
});

export default ControlTreeGraph;