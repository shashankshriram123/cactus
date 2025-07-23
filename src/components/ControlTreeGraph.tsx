import React, { useRef, useEffect, useState } from 'react';
import './ControlTreeGraph.css';
import type {
  SerializableGraphState,
  GraphNode,
  GraphBranch,
  SerializableNode,
  SerializableBranch,
} from '../types';

export interface GraphApi {
  serialize: () => SerializableGraphState | null;
}

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


const ControlTreeGraph: React.FC<React.PropsWithChildren<{
  graphState: SerializableGraphState | null,
  ref: React.ForwardedRef<GraphApi>
}>> = React.forwardRef(({ graphState }, ref) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

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

  React.useImperativeHandle(ref, () => ({
    serialize: () => {
      const { branches, nodes, camera, state } = liveGraph.current;
      if (!state) return null;

      const serializableNodes: Record<string, SerializableNode> = {};
      nodes.forEach(node => { serializableNodes[node.id] = { id: node.id, x: node.x, y: node.y, isHead: node.isHead }; });
      
      const serializableBranches: Record<string, SerializableBranch> = {};
      const branchOrder: number[] = [];
      branches.forEach(branch => {
        serializableBranches[branch.id] = {
          id: branch.id, color: branch.color, nodeIds: branch.nodes.map(n => n.id),
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
        
        let localSelectedNode: GraphNode | null = null;
        let isPanning = false; let panStart = { x: 0, y: 0 };
        let mouseDownPos: { x: number; y: number } | null = null;
        let didDrag = false;
        
        const GRID_SPACING = 60, NODE_RADIUS = 8, NODE_SELECTED_RADIUS = 10, BRANCH_WIDTH = 4;
        const BRANCH_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
        
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
            id: number; nodes: GraphNode[]; color: string; parentNode: GraphNode | null; isHidden: boolean;
            constructor(id: number, color: string, parentNode: GraphNode | null = null) { this.id = id; this.nodes = []; this.color = color; this.parentNode = parentNode; this.isHidden = false; }
            addNode(node: GraphNode) { this.nodes.push(node); this.nodes.sort((a, b) => b.y - a.y); }
            draw() {
                if (this.isHidden) return;
                const visibleNodes = this.nodes.filter(n => !n.isHidden); if (visibleNodes.length < 1) return;
                ctx.strokeStyle = this.color; ctx.lineWidth = BRANCH_WIDTH; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
                if (this.parentNode) { ctx.beginPath(); ctx.moveTo(this.parentNode.x, this.parentNode.y); ctx.lineTo(visibleNodes[0].x, visibleNodes[0].y); ctx.stroke(); }
                for (let i = 0; i < visibleNodes.length - 1; i++) { const n1 = visibleNodes[i]; const n2 = visibleNodes[i+1]; ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke(); }
            }
        }
        
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
            ctx.restore();
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
            const worldX = (e.clientX - rect.left - liveGraph.current.camera.x) / liveGraph.current.camera.scale;
            const worldY = (e.clientY - rect.top - liveGraph.current.camera.y) / liveGraph.current.camera.scale;
            return { x: worldX, y: worldY };
        };

        liveGraph.current.state = graphState;
        liveGraph.current.camera = { ...graphState.camera };
        const nodes = new Map<number, GraphNode>(); const branches = new Map<number, GraphBranch>();
        for (const branchId of graphState.branchOrder) { const sBranch = graphState.branches[branchId]; branches.set(sBranch.id, new BranchImpl(sBranch.id, sBranch.color)); }
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
        const selectNode = (node: GraphNode | null) => { localSelectedNode = node; setSelectedNode(node); draw(); }
        
        const getNextColor = () => { const state = liveGraph.current.state!; const color = BRANCH_COLORS[state.nextColorIndex]; state.nextColorIndex = (state.nextColorIndex + 1) % BRANCH_COLORS.length; return color; }
        const createSubBranch = () => { if (!localSelectedNode || liveGraph.current.branches.some(b => b.parentNode === localSelectedNode)) return; const parentNode = localSelectedNode; const state = liveGraph.current.state!; const newBranch = new BranchImpl(state.nextBranchId++, getNextColor(), parentNode); const newNode = new NodeImpl(state.nextNodeId++, parentNode.x + GRID_SPACING, parentNode.y, newBranch, true); newBranch.addNode(newNode); liveGraph.current.branches.push(newBranch); liveGraph.current.nodes.set(newNode.id, newNode); relayout(); selectNode(newNode); };
        const expandBranch = () => { if (!localSelectedNode || !localSelectedNode.isHead) return; const headNode = localSelectedNode; const branch = headNode.branch; const state = liveGraph.current.state!; headNode.isHead = false; const newHeadNode = new NodeImpl(state.nextNodeId++, headNode.x, headNode.y - GRID_SPACING, branch, true); branch.addNode(newHeadNode); liveGraph.current.nodes.set(newHeadNode.id, newHeadNode); relayout(); selectNode(newHeadNode); };
        const foldSelected = () => { if(!localSelectedNode) return; getDescendantBranches(localSelectedNode, liveGraph.current.branches).forEach(b => b.isHidden = true); relayout(); };
        const collapseSelected = () => { if (!localSelectedNode || localSelectedNode.isHead) return; const branch = localSelectedNode.branch; const nodesToHide = branch.nodes.filter(node => node.y < localSelectedNode!.y); nodesToHide.forEach(node => { getDescendantBranches(node, liveGraph.current.branches).forEach(b => b.isHidden = true); }); nodesToHide.forEach(node => node.isHidden = true); localSelectedNode.isHead = true; relayout(); };
        const unfoldSelected = () => { if (!localSelectedNode) return; getDescendantBranches(localSelectedNode, liveGraph.current.branches).forEach(b => { b.isHidden = false; b.nodes.forEach(n => n.isHidden = false); }); const branch = localSelectedNode.branch; branch.nodes.forEach(n => { n.isHidden = false; n.isHead = false; }); if (branch.nodes.length > 0) { const topNode = branch.nodes.reduce((prev, curr) => prev.y < curr.y ? prev : curr); topNode.isHead = true;} relayout(); };
        const deleteSelectedChildren = () => { if (!localSelectedNode) return; const branchesToRemove = getDescendantBranches(localSelectedNode, liveGraph.current.branches); branchesToRemove.forEach(b => b.nodes.forEach(n => liveGraph.current.nodes.delete(n.id))); liveGraph.current.branches = liveGraph.current.branches.filter(b => !branchesToRemove.includes(b)); selectNode(null); relayout(); };
        const deleteSelectedExtension = () => { if (!localSelectedNode || localSelectedNode.isHead) return; const branch = localSelectedNode.branch; const nodesToRemove = new Set(branch.nodes.filter(node => node.y < localSelectedNode!.y)); if(nodesToRemove.size === 0) return; const branchesToRemove = new Set<GraphBranch>(); nodesToRemove.forEach(node => { getDescendantBranches(node, liveGraph.current.branches).forEach(b => branchesToRemove.add(b)); }); branchesToRemove.forEach(b => b.nodes.forEach(n => liveGraph.current.nodes.delete(n.id))); liveGraph.current.branches = liveGraph.current.branches.filter(b => !branchesToRemove.has(b)); branch.nodes = branch.nodes.filter(n => !nodesToRemove.has(n)); nodesToRemove.forEach(n => liveGraph.current.nodes.delete(n.id)); localSelectedNode.isHead = true; selectNode(null); relayout(); };
        const deleteSelectedNode = () => { if (!localSelectedNode || localSelectedNode.branch.parentNode === null) return; const allBranchesToRemove = new Set(getDescendantBranches(localSelectedNode, liveGraph.current.branches)); allBranchesToRemove.add(localSelectedNode.branch); allBranchesToRemove.forEach(b => { b.nodes.forEach(n => liveGraph.current.nodes.delete(n.id)); }); liveGraph.current.branches = liveGraph.current.branches.filter(b => !allBranchesToRemove.has(b)); selectNode(null); relayout(); };
        
        const handleMouseUp = (e: MouseEvent) => { if (!didDrag) { const worldPos = getMousePos(e); let clickedNode: GraphNode | null = null; for (const branch of liveGraph.current.branches) { if (!branch.isHidden) { for (const node of branch.nodes) { if (node.isClicked(worldPos.x, worldPos.y)) { clickedNode = node; break; } } } if (clickedNode) break; } selectNode(clickedNode); } isPanning = false; canvas.style.cursor = 'grab'; mouseDownPos = null; };
        const handleMouseDown = (e: MouseEvent) => {isPanning=false;didDrag=false;mouseDownPos={x:e.clientX,y:e.clientY};panStart.x=e.clientX-liveGraph.current.camera.x;panStart.y=e.clientY-liveGraph.current.camera.y};
        const handleMouseMove = (e: MouseEvent) => {if(mouseDownPos){const dx=Math.abs(e.clientX-mouseDownPos.x);const dy=Math.abs(e.clientY-mouseDownPos.y);if(dx>5||dy>5){didDrag=true;isPanning=true;canvas.style.cursor='grabbing'}}if(isPanning){liveGraph.current.camera.x=e.clientX-panStart.x;liveGraph.current.camera.y=e.clientY-panStart.y;draw()}};
        const handleMouseLeave = () => {isPanning=false;canvas.style.cursor='grab';mouseDownPos=null};
        const handleWheel = (e: WheelEvent) => { e.preventDefault(); const { camera } = liveGraph.current; const zoomSpeed=0.1,minZoom=0.2,maxZoom=3.0,oldScale=camera.scale; const mousePos={x:e.clientX-canvas.getBoundingClientRect().left,y:e.clientY-canvas.getBoundingClientRect().top}; const zoomDirection=e.deltaY<0?1:-1; camera.scale+=zoomDirection*zoomSpeed*camera.scale; camera.scale=Math.max(minZoom,Math.min(camera.scale,maxZoom)); camera.x=mousePos.x-((mousePos.x-camera.x)/oldScale)*camera.scale; camera.y=mousePos.y-((mousePos.y-camera.y)/oldScale)*camera.scale; draw(); };
        canvas.addEventListener('mousedown', handleMouseDown); canvas.addEventListener('mousemove', handleMouseMove); canvas.addEventListener('mouseup', handleMouseUp); canvas.addEventListener('mouseleave', handleMouseLeave); canvas.addEventListener('wheel', handleWheel);

        const resizeObserver = new ResizeObserver(entries => { if (!entries || entries.length === 0) return; const { width, height } = entries[0].contentRect; canvas.width = width; canvas.height = height; draw(); });
        if (canvasContainerRef.current) { resizeObserver.observe(canvasContainerRef.current); }
        
        const funcs: {[key: string]: () => void} = { createSubBranch, expandBranch, foldSelected, collapseSelected, unfoldSelected, deleteSelectedChildren, deleteSelectedExtension, deleteSelectedNode };
        Object.keys(funcs).forEach(key => { (canvas as any)[key] = funcs[key]; });
        
        return () => {
            resizeObserver.disconnect();
            canvas.removeEventListener('mousedown', handleMouseDown); canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp); canvas.removeEventListener('mouseleave', handleMouseLeave);
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [graphState]);

    const getButtonStates = () => {
        if (!selectedNode) { return { create: true, expand: true, fold: true, collapse: true, unfold: true, deleteChildren: true, deleteExtension: true, deleteNode: true }; }
        const { branches } = liveGraph.current;
        const isMainBranchNode = selectedNode.branch.parentNode === null;
        const hasChildBranches = branches.some(b => b.parentNode === selectedNode);
        const hasVisibleChildren = branches.some(b => b.parentNode === selectedNode && !b.isHidden);
        const hasHiddenChildren = getDescendantBranches(selectedNode, branches).some(b => b.isHidden);
        const hasHiddenExtension = selectedNode.branch.nodes.some(n => n.y < selectedNode.y && n.isHidden);
        return {
            create: hasChildBranches,
            expand: !selectedNode.isHead,
            fold: !hasVisibleChildren,
            collapse: selectedNode.isHead,
            unfold: !hasHiddenChildren && !hasHiddenExtension,
            deleteChildren: !hasChildBranches,
            deleteExtension: selectedNode.isHead || isMainBranchNode,
            deleteNode: isMainBranchNode
        };
    };

    const buttonStates = getButtonStates();
    const callCanvasFunc = (funcName: string) => { if (canvasRef.current && (canvasRef.current as any)[funcName]) { (canvasRef.current as any)[funcName](); } }

    return (
        <div ref={canvasContainerRef} className="canvas-container">
            <canvas ref={canvasRef} className="graph-canvas" />
            {graphState && (
            <div className="controls-overlay">
                <button onClick={() => callCanvasFunc('createSubBranch')} disabled={buttonStates.create} className="btn">Create Sub-Branch</button>
                <button onClick={() => callCanvasFunc('expandBranch')} disabled={buttonStates.expand} className="btn">Expand Head</button>
                <button onClick={() => callCanvasFunc('collapseSelected')} disabled={buttonStates.collapse} className="btn">Collapse Extension</button>
                <button onClick={() => callCanvasFunc('foldSelected')} disabled={buttonStates.fold} className="btn">Fold Children</button>
                <button onClick={() => callCanvasFunc('unfoldSelected')} disabled={buttonStates.unfold} className="btn">Unfold</button>
                <button onClick={() => callCanvasFunc('deleteNode')} disabled={buttonStates.deleteNode} className="btn-danger">Delete Node</button>
                <button onClick={() => callCanvasFunc('deleteSelectedExtension')} disabled={buttonStates.deleteExtension} className="btn-danger">Delete Extension</button>
                <button onClick={() => callCanvasFunc('deleteSelectedChildren')} disabled={buttonStates.deleteChildren} className="btn-danger">Delete Children</button>
            </div>
            )}
        </div>
    );
});

export default ControlTreeGraph;