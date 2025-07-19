import React, { useRef, useEffect, useState } from 'react';
import './ControlTreeGraph.css'; // Uses the same CSS file from the previous step

// --- Type Definitions (No Changes) ---
interface Node { id: number; x: number; y: number; branch: Branch; isHead: boolean; isHidden: boolean; draw: () => void; isClicked: (pointX: number, pointY: number) => boolean; }
interface Branch { id: number; nodes: Node[]; color: string; parentNode: Node | null; isHidden: boolean; addNode: (node: Node) => void; draw: () => void; }
interface GraphApi {
    branches: Branch[];
    createSubBranch: () => void; expandBranch: () => void; foldSelected: () => void; collapseSelected: () => void; unfoldSelected: () => void; deleteSelectedChildren: () => void; deleteSelectedExtension: () => void; deleteSelectedNode: () => void;
    handleResize: () => void;
}

const ControlTreeGraph: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const graphApi = useRef<GraphApi>({
        branches: [],
        createSubBranch: () => {}, expandBranch: () => {}, foldSelected: () => {}, collapseSelected: () => {}, unfoldSelected: () => {}, deleteSelectedChildren: () => {}, deleteSelectedExtension: () => {}, deleteSelectedNode: () => {},
        handleResize: () => {},
    });
    
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // --- Configuration & State ---
        const NODE_RADIUS = 8;
        const NODE_SELECTED_RADIUS = 10;
        const BRANCH_WIDTH = 4;
        const BRANCH_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
        const GRID_SPACING = 60;
        let localSelectedNode: Node | null = null;
        let nextColorIndex = 0;
        let nextNodeId = 1;
        let nextBranchId = 1;
        let camera = { x: 0, y: 0 };
        let isPanning = false;
        let panStart = { x: 0, y: 0 };
        let mouseDownPos: { x: number; y: number } | null = null;
        let didDrag = false;

        // --- Classes & Functions (No changes in logic) ---
        class NodeImpl implements Node { /* ... same as before ... */ 
            id: number; x: number; y: number; branch: Branch; isHead: boolean; isHidden: boolean;
            constructor(x: number, y: number, branch: Branch) { this.id = nextNodeId++; this.x = x; this.y = y; this.branch = branch; this.isHead = false; this.isHidden = false; }
            draw() {
                if (this.isHidden) return;
                const hasHiddenChildren = graphApi.current.branches.some(b => b.parentNode === this && b.isHidden);
                const hasHiddenExtension = this.branch.nodes.some(n => n.y < this.y && n.isHidden);
                if (hasHiddenChildren || hasHiddenExtension) { ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 15; }
                ctx.beginPath();
                const radius = (this === localSelectedNode) ? NODE_SELECTED_RADIUS : NODE_RADIUS;
                const color = (this === localSelectedNode) ? '#ffffff' : this.branch.color;
                ctx.arc(this.x, this.y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
                ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
                if (this !== localSelectedNode) { ctx.beginPath(); ctx.arc(this.x, this.y, NODE_RADIUS * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#1a1a1a'; ctx.fill(); }
            }
            isClicked(pointX: number, pointY: number) {
                if (this.isHidden) return false;
                const distance = Math.sqrt(Math.pow(this.x - pointX, 2) + Math.pow(this.y - pointY, 2));
                return distance < NODE_RADIUS * 1.5;
            }
        }
        class BranchImpl implements Branch { /* ... same as before ... */
            id: number; nodes: Node[]; color: string; parentNode: Node | null; isHidden: boolean;
            constructor(color: string, parentNode: Node | null = null) { this.id = nextBranchId++; this.nodes = []; this.color = color; this.parentNode = parentNode; this.isHidden = false; }
            addNode(node: Node) { this.nodes.push(node); this.nodes.sort((a, b) => b.y - a.y); }
            draw() {
                if (this.isHidden) return;
                const visibleNodes = this.nodes.filter(n => !n.isHidden);
                if (visibleNodes.length < 1) return;
                ctx.strokeStyle = this.color; ctx.lineWidth = BRANCH_WIDTH; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
                if (this.parentNode) { ctx.beginPath(); ctx.moveTo(this.parentNode.x + NODE_RADIUS, this.parentNode.y); ctx.lineTo(visibleNodes[0].x, visibleNodes[0].y); ctx.stroke(); }
                for (let i = 0; i < visibleNodes.length - 1; i++) { const n1 = visibleNodes[i]; const n2 = visibleNodes[i+1]; ctx.beginPath(); ctx.moveTo(n1.x, n1.y - NODE_RADIUS); ctx.lineTo(n2.x, n2.y + NODE_RADIUS); ctx.stroke(); }
            }
        }
        function relayout() { /* ... same as before ... */
            const mainBranch = graphApi.current.branches.find(b => b.parentNode === null);
            if (!mainBranch) return;
            const childrenMap = new Map<number, Branch[]>();
            graphApi.current.branches.forEach(b => { if (b.parentNode) { const parentId = b.parentNode.branch.id; if (!childrenMap.has(parentId)) childrenMap.set(parentId, []); childrenMap.get(parentId)!.push(b); } });
            for (const children of childrenMap.values()) { children.sort((a, b) => a.parentNode!.y - b.parentNode!.y); }
            function layoutSubtree(branch: Branch, startX: number): number {
                const visibleNodes = branch.nodes.filter(n => !n.isHidden);
                if (visibleNodes.length === 0 && !branch.isHidden) { return startX; }
                const currentX = branch.nodes[0].x;
                const shiftX = startX - currentX;
                if (shiftX !== 0) { branch.nodes.forEach(node => node.x += shiftX); }
                let rightmostX = startX;
                const children = childrenMap.get(branch.id) || [];
                children.forEach(child => { if (!child.isHidden) { const childStartX = rightmostX + GRID_SPACING; const subtreeEndX = layoutSubtree(child, childStartX); rightmostX = subtreeEndX; } });
                return rightmostX;
            }
            let currentX = mainBranch.nodes[0].x;
            const rootChildren = childrenMap.get(mainBranch.id) || [];
            rootChildren.forEach(child => { if (!child.isHidden) { const childStartX = currentX + GRID_SPACING; const subtreeEndX = layoutSubtree(child, childStartX); currentX = subtreeEndX; } });
        }
        function getDescendantBranches(startNode: Node): Branch[] { /* ... same as before ... */
            const directChildren = graphApi.current.branches.filter(b => b.parentNode === startNode);
            if (directChildren.length === 0) return [];
            const allDescendants = new Set<Branch>(directChildren);
            let search = true;
            while (search) { search = false; graphApi.current.branches.forEach(b => { if (b.parentNode && allDescendants.has(b.parentNode.branch)) { if (!allDescendants.has(b)) { allDescendants.add(b); search = true; } } }); }
            return [...allDescendants];
        }
        function getNextColor(): string { const color = BRANCH_COLORS[nextColorIndex]; nextColorIndex = (nextColorIndex + 1) % BRANCH_COLORS.length; return color; }
        function selectNode(node: Node) { localSelectedNode = node; setSelectedNode(node); }
        function deselectNode() { localSelectedNode = null; setSelectedNode(null); }
        function drawGrid() { /* ... same as before ... */
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1;
            const startX = Math.floor(-camera.x / GRID_SPACING) * GRID_SPACING;
            const startY = Math.floor(-camera.y / GRID_SPACING) * GRID_SPACING;
            for (let x = startX; x < canvas.width - camera.x; x += GRID_SPACING) { ctx.beginPath(); ctx.moveTo(x, -camera.y); ctx.lineTo(x, canvas.height - camera.y); ctx.stroke(); }
            for (let y = startY; y < canvas.height - camera.y; y += GRID_SPACING) { ctx.beginPath(); ctx.moveTo(-camera.x, y); ctx.lineTo(canvas.width - camera.x, y); ctx.stroke(); }
        }
        function draw() { /* ... same as before ... */
            ctx.save(); ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.translate(camera.x, camera.y);
            drawGrid();
            graphApi.current.branches.forEach(branch => { if (!branch.isHidden) { branch.draw(); branch.nodes.forEach(node => node.draw()); } });
            ctx.restore();
        }
        function getMousePos(e: MouseEvent): { x: number; y: number } { const rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left - camera.x, y: e.clientY - rect.top - camera.y }; }
        function _createSubBranch() { if (!localSelectedNode) return; const parentNode = localSelectedNode; if (graphApi.current.branches.some(b => b.parentNode === parentNode)) return; const newBranch = new BranchImpl(getNextColor(), parentNode); const newNode = new NodeImpl(parentNode.x + GRID_SPACING, parentNode.y, newBranch); newNode.isHead = true; newBranch.addNode(newNode); graphApi.current.branches.push(newBranch); relayout(); deselectNode(); draw(); }
        function _expandBranch() { if (!localSelectedNode) return; const headNode = localSelectedNode; const branch = headNode.branch; headNode.isHead = false; const newHeadNode = new NodeImpl(headNode.x, headNode.y - GRID_SPACING, branch); newHeadNode.isHead = true; branch.addNode(newHeadNode); relayout(); selectNode(newHeadNode); draw(); }
        function _foldSelected() { if (!localSelectedNode) return; getDescendantBranches(localSelectedNode).forEach(b => b.isHidden = true); relayout(); draw(); }
        function _collapseSelected() { if (!localSelectedNode) return; const branch = localSelectedNode.branch; const nodesToHide = branch.nodes.filter(node => node.y < localSelectedNode!.y); nodesToHide.forEach(node => { getDescendantBranches(node).forEach(b => b.isHidden = true); }); nodesToHide.forEach(node => node.isHidden = true); localSelectedNode.isHead = true; relayout(); draw(); }
        function _unfoldSelected() { if (!localSelectedNode) return; const descendants = getDescendantBranches(localSelectedNode); descendants.forEach(b => { b.isHidden = false; b.nodes.forEach(n => n.isHidden = false); }); const branch = localSelectedNode.branch; branch.nodes.forEach(n => { n.isHidden = false; n.isHead = false; }); if (branch.nodes.length > 0) { branch.nodes[branch.nodes.length - 1].isHead = true; } relayout(); draw(); }
        function _deleteSelectedChildren() { if (!localSelectedNode) return; const branchesToRemove = getDescendantBranches(localSelectedNode); graphApi.current.branches = graphApi.current.branches.filter(b => !branchesToRemove.includes(b)); deselectNode(); relayout(); draw(); }
        function _deleteSelectedExtension() { if (!localSelectedNode) return; const nodeToDeleteFrom = localSelectedNode; const branch = nodeToDeleteFrom.branch; const nodesToRemove = new Set(branch.nodes.filter(node => node.y < nodeToDeleteFrom.y)); const branchesToRemove = new Set<Branch>(); nodesToRemove.forEach(node => { getDescendantBranches(node).forEach(b => branchesToRemove.add(b)); }); graphApi.current.branches = graphApi.current.branches.filter(b => !branchesToRemove.has(b)); branch.nodes = branch.nodes.filter(n => !nodesToRemove.has(n)); nodeToDeleteFrom.isHead = true; deselectNode(); relayout(); draw(); }
        function _deleteSelectedNode() { if (!localSelectedNode) return; const childBranchesToRemove = getDescendantBranches(localSelectedNode); const branch = localSelectedNode.branch; const extensionNodesToRemove = new Set(branch.nodes.filter(node => node.y < localSelectedNode!.y)); const extensionChildrenToRemove = new Set<Branch>(); extensionNodesToRemove.forEach(node => { getDescendantBranches(node).forEach(b => extensionChildrenToRemove.add(b)); }); const allBranchesToRemove = new Set([...childBranchesToRemove, ...extensionChildrenToRemove]); graphApi.current.branches = graphApi.current.branches.filter(b => !allBranchesToRemove.has(b)); branch.nodes = branch.nodes.filter(n => n.y > localSelectedNode!.y); if (branch.nodes.length > 0) { branch.nodes[branch.nodes.length - 1].isHead = true; } else { graphApi.current.branches = graphApi.current.branches.filter(b => b.id !== branch.id); } deselectNode(); relayout(); draw(); }
        
        const handleMouseDown = (e: MouseEvent) => { isPanning = false; didDrag = false; mouseDownPos = { x: e.clientX, y: e.clientY }; panStart.x = e.clientX - camera.x; panStart.y = e.clientY - camera.y; };
        const handleMouseMove = (e: MouseEvent) => { if (mouseDownPos) { const dx = Math.abs(e.clientX - mouseDownPos.x); const dy = Math.abs(e.clientY - mouseDownPos.y); if (dx > 5 || dy > 5) { didDrag = true; isPanning = true; canvas.style.cursor = 'grabbing'; } } if (isPanning) { camera.x = e.clientX - panStart.x; camera.y = e.clientY - panStart.y; draw(); } };
        const handleMouseUp = (e: MouseEvent) => { if (!didDrag) { const worldPos = getMousePos(e); let clickedNode: Node | null = null; for (const branch of graphApi.current.branches) { if (!branch.isHidden) { for (const node of branch.nodes) { if (node.isClicked(worldPos.x, worldPos.y)) { clickedNode = node; break; } } } if (clickedNode) break; } if (clickedNode) { selectNode(clickedNode); } else { deselectNode(); } draw(); } isPanning = false; canvas.style.cursor = 'grab'; mouseDownPos = null; };
        const handleMouseLeave = () => { isPanning = false; canvas.style.cursor = 'grab'; mouseDownPos = null; };
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.style.cursor = 'grab';

        graphApi.current.createSubBranch = () => { if (localSelectedNode) _createSubBranch(); };
        graphApi.current.expandBranch = () => { if (localSelectedNode && localSelectedNode.isHead) _expandBranch(); };
        // ... all other API functions are the same ...
        graphApi.current.foldSelected = () => { if (localSelectedNode) _foldSelected(); };
        graphApi.current.collapseSelected = () => { if (localSelectedNode && !localSelectedNode.isHead) _collapseSelected(); };
        graphApi.current.unfoldSelected = () => { if (localSelectedNode) _unfoldSelected(); };
        graphApi.current.deleteSelectedChildren = () => { if (localSelectedNode) _deleteSelectedChildren(); };
        graphApi.current.deleteSelectedExtension = () => { if (localSelectedNode && !localSelectedNode.isHead && localSelectedNode.branch.parentNode !== null) _deleteSelectedExtension(); };
        graphApi.current.deleteSelectedNode = () => { if (localSelectedNode && !localSelectedNode.isHead && localSelectedNode.branch.parentNode !== null) _deleteSelectedNode(); };
        
        // --- KEY CHANGE: Resize and Initialization Logic ---
        let isInitialized = false;
        graphApi.current.handleResize = () => {
            const { width, height } = canvas.getBoundingClientRect();
            // This ensures the canvas drawing buffer is high-resolution
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            // Only set the initial camera position once
            if (!isInitialized) {
                camera.x = width / 2;
                camera.y = height / 2;
                isInitialized = true;
            }
            draw();
        };
        
        // Place initial nodes in a fixed "world" position (around 0,0)
        const mainBranch = new BranchImpl(getNextColor());
        const startX = 0;
        const startY = 0;
        const rootNode = new NodeImpl(startX, startY + GRID_SPACING, mainBranch);
        const middleNode = new NodeImpl(startX, startY, mainBranch);
        const headNode = new NodeImpl(startX, startY - GRID_SPACING, mainBranch);
        headNode.isHead = true;
        mainBranch.addNode(rootNode); mainBranch.addNode(middleNode); mainBranch.addNode(headNode);
        graphApi.current.branches.push(mainBranch);
        
        // Set initial size, camera, and draw the scene
        graphApi.current.handleResize(); 

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    // This effect hook for the resize listener remains the same
    useEffect(() => {
        const onResize = () => graphApi.current.handleResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const getButtonStates = () => {
        if (!selectedNode) { return { create: true, expand: true, fold: true, collapse: true, unfold: true, deleteChildren: true, deleteExtension: true, deleteNode: true }; }
        const { branches } = graphApi.current;
        const isMainBranchNode = selectedNode.branch.parentNode === null;
        const hasChildBranches = branches.some(b => b.parentNode === selectedNode);
        const hasVisibleChildren = branches.some(b => b.parentNode === selectedNode && !b.isHidden);
        const hasHiddenChildren = branches.some(b => b.parentNode === selectedNode && b.isHidden);
        const hasHiddenExtension = selectedNode.branch.nodes.some(n => n.y < selectedNode.y && n.isHidden);
        return { create: hasChildBranches, expand: !selectedNode.isHead, fold: !hasVisibleChildren, collapse: selectedNode.isHead || isMainBranchNode, unfold: !hasHiddenChildren && !hasHiddenExtension, deleteChildren: !hasChildBranches, deleteExtension: selectedNode.isHead || isMainBranchNode, deleteNode: isMainBranchNode };
    };

    const buttonStates = getButtonStates();

    return (
        <div className="graph-container">
            <canvas ref={canvasRef} className="graph-canvas" />
            <div className="controls-overlay">
                <button onClick={() => graphApi.current.createSubBranch()} disabled={buttonStates.create} className="btn">Create Sub-Branch</button>
                <button onClick={() => graphApi.current.expandBranch()} disabled={buttonStates.expand} className="btn">Expand Head</button>
                <button onClick={() => graphApi.current.collapseSelected()} disabled={buttonStates.collapse} className="btn">Collapse Extension</button>
                <button onClick={() => graphApi.current.foldSelected()} disabled={buttonStates.fold} className="btn">Fold Children</button>
                <button onClick={() => graphApi.current.unfoldSelected()} disabled={buttonStates.unfold} className="btn">Unfold</button>
                <button onClick={() => graphApi.current.deleteSelectedNode()} disabled={buttonStates.deleteNode} className="btn-danger">Delete Node</button>
                <button onClick={() => graphApi.current.deleteSelectedExtension()} disabled={buttonStates.deleteExtension} className="btn-danger">Delete Extension</button>
                <button onClick={() => graphApi.current.deleteSelectedChildren()} disabled={buttonStates.deleteChildren} className="btn-danger">Delete Children</button>
            </div>
        </div>
    );
};

export default ControlTreeGraph;