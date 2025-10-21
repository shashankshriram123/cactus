import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import ControlTreeGraph, { type GraphApi } from './components/ControlTreeGraph';

import type { SerializableGraphState } from './types';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import ChatPanel from './components/ChatPanel';

import './App.css';
import { cactusApi } from './api/cactusApi'; // ← thin API client

const createNewGraph = (): SerializableGraphState => {
  const id = crypto.randomUUID();
  return {
    id,
    name: `New Project ${new Date().toLocaleTimeString()}`,
    camera: { x: 150, y: window.innerHeight - 250, scale: 1 },
    nodes: {},
    branches: {},
    branchOrder: [],
    nextNodeId: 1,
    nextBranchId: 1,
    nextColorIndex: 0,
  };
};

const initialButtonStates = {
  create: true,
  expand: true,
  fold: true,
  collapse: true,
  unfold: true,
  deleteChildren: true,
  deleteExtension: true,
  deleteNode: true,
};

function App() {
  const [graphs, setGraphs] = useState<SerializableGraphState[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [buttonStates, setButtonStates] = useState<Record<string, boolean>>(
    initialButtonStates
  );

  const graphApiRef = useRef<GraphApi>(null);
  const [egoNodeId, setEgoNodeId] = useState<number | null>(null);

  // load from localStorage on boot
  useEffect(() => {
    try {
      const savedGraphs = localStorage.getItem('control-tree-graphs-v2');
      if (savedGraphs) {
        const parsedGraphs = JSON.parse(savedGraphs);
        if (Array.isArray(parsedGraphs) && parsedGraphs.length > 0) {
          setGraphs(parsedGraphs);
          setActiveGraphId(parsedGraphs[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load graphs from localStorage:', error);
    }
  }, []);

  // persist to localStorage whenever graphs change
  useEffect(() => {
    try {
      localStorage.setItem('control-tree-graphs-v2', JSON.stringify(graphs));
    } catch (e) {
      console.error('Failed to save graphs to localStorage:', e);
    }
  }, [graphs]);

  // create a new graph locally, then ensure it exists on server and sync state
  const handleNewGraph = async () => {
    const newGraph = createNewGraph();
    setGraphs(prev => [...prev, newGraph]);
    setActiveGraphId(newGraph.id);

    try {
      const serverState = await cactusApi.getGraph(newGraph.id);
      setGraphs(prev =>
        prev.map(g => (g.id === newGraph.id ? serverState : g))
      );
    } catch (e) {
      console.error('getGraph (new) failed; staying local for now', e);
    }
  };

  // select an existing project, then fetch latest state from server and sync
  const handleSelectGraph = async (id: string) => {
    setButtonStates(initialButtonStates);
    setActiveGraphId(id);

    try {
      const serverState = await cactusApi.getGraph(id);
      setGraphs(prev => prev.map(g => (g.id === id ? serverState : g)));
    } catch (e) {
      console.error('getGraph (select) failed; using local copy', e);
    }
  };

  // delete from server (best-effort), then remove locally
  const handleDeleteGraph = async (id: string) => {
    try {
      await cactusApi.deleteGraph(id);
    } catch (e) {
      console.warn('deleteGraph failed; removing locally anyway', e);
    }

    setGraphs(prev => {
      const newGraphs = prev.filter(g => g.id !== id);
      if (activeGraphId === id) {
        setActiveGraphId(newGraphs.length > 0 ? newGraphs[0].id : null);
      }
      return newGraphs;
    });
  };

  const activeGraph = graphs.find(g => g.id === activeGraphId) || null;

  const getRootHeadNodeId = (g: SerializableGraphState | null): number | null => {
    if (!g) return null;
    const branches = Object.values(g.branches ?? {});
    const rootBranch = branches.find(b => b.parentNodeId === null);
    if (!rootBranch) return null;
    const head = rootBranch.nodeIds.find(id => g.nodes[String(id)]?.isHead);
    return head ?? (rootBranch.nodeIds[rootBranch.nodeIds.length - 1] ?? null);
  };

  // handle sending chat messages -> backend
  const handleSend = async (text: string, model: string) => {
    if (!activeGraphId) return;
    const g = graphs.find(x => x.id === activeGraphId) ?? null;
    if (!g) return;

    const hasRoot = Object.values(g.branches ?? {}).some(
      b => b.parentNodeId === null
    );

    try {
      let serverState: SerializableGraphState;
      if (!hasRoot) {
        serverState = await cactusApi.createRoot(activeGraphId, text, 'user');
        // ego becomes the newly created root node (last nextNodeId - 1)
        setEgoNodeId(serverState.nextNodeId - 1);
      } else {
        const anchorId = egoNodeId ?? getRootHeadNodeId(g);
        if (!anchorId) return;
        serverState = await cactusApi.extendNode(anchorId, text, 'user');
        // ego becomes the head of the same branch as anchorId
        const branch = Object.values(serverState.branches || {}).find(b => b.nodeIds.includes(anchorId));
        if (branch) setEgoNodeId(branch.nodeIds[branch.nodeIds.length - 1]);
      }
      setGraphs(prev =>
        prev.map(x => (x.id === activeGraphId ? serverState : x))
      );
    } catch (e) {
      console.error('send failed', e);
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        graphs={graphs}
        activeGraphId={activeGraphId}
        onSelectGraph={handleSelectGraph}
        onNewGraph={handleNewGraph}
        onDeleteGraph={handleDeleteGraph}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div className="main-area-wrapper">
        <PanelGroup direction="horizontal" className="workspace-split">
          {/* LEFT – graph */}
          <Panel minSize={20} defaultSize={70}>
            <div className="content-area">
              <ControlTreeGraph
                ref={graphApiRef}
                graphState={activeGraph}
                onButtonStateChange={setButtonStates}
                onGraphUpdate={(updated) => {
                  // Replace the graph in state with the fresh one from backend
                  setGraphs(prev =>
                    prev.map(g => g.id === updated.id ? updated : g)
                  );
                }}
                onEgoChange={(nodeId) => setEgoNodeId(nodeId)}
              />
            </div>
          </Panel>

          {/* draggable bar */}
          <PanelResizeHandle className="resizer" />

          {/* RIGHT – chat */}
          <Panel minSize={20} defaultSize={30}>
            <ChatPanel onSend={handleSend} />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default App;
