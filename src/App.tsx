import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import ControlTreeGraph, { type GraphApi } from './components/ControlTreeGraph';
import { GraphControls } from './components/GraphControls';
import type { SerializableGraphState } from './types';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import ChatPanel from './components/ChatPanel';

import './App.css';

const createNewGraph = (): SerializableGraphState => {
  const id = crypto.randomUUID();
  return {
    id,
    name: `New Project ${new Date().toLocaleTimeString()}`,
    camera: { x: 150, y: window.innerHeight - 250, scale: 1 },
    nodes: {
      '1': { id: 1, x: 0, y: -40, isHead: false },
      '2': { id: 2, x: 0, y: -100, isHead: false },
      '3': { id: 3, x: 0, y: -160, isHead: true },
    },
    branches: {
      '1': { id: 1, label: 'Main Chat', color: '#f59e0b', nodeIds: [1, 2, 3], parentNodeId: null },
    },
    branchOrder: [1],
    nextNodeId: 4,
    nextBranchId: 2,
    nextColorIndex: 1,
  };
};

const initialButtonStates = {
  create: true, expand: true, fold: true, collapse: true, unfold: true, 
  deleteChildren: true, deleteExtension: true, deleteNode: true
};

function App() {
  const [graphs, setGraphs] = useState<SerializableGraphState[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [buttonStates, setButtonStates] = useState<Record<string, boolean>>(initialButtonStates);
  
  const graphApiRef = useRef<GraphApi>(null);

  useEffect(() => {
    try {
      const savedGraphs = localStorage.getItem('control-tree-graphs');
      if (savedGraphs) {
        const parsedGraphs = JSON.parse(savedGraphs);
        if (Array.isArray(parsedGraphs) && parsedGraphs.length > 0) {
          setGraphs(parsedGraphs);
          setActiveGraphId(parsedGraphs[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load graphs from localStorage:", error);
    }
  }, []);

  const handleNewGraph = () => {
    const newGraph = createNewGraph();
    setGraphs(prev => [...prev, newGraph]);
    setActiveGraphId(newGraph.id);
  };
  
  const handleSelectGraph = (id: string) => {
    setButtonStates(initialButtonStates);
    setActiveGraphId(id);
  }

  const handleDeleteGraph = (id: string) => {
    setGraphs(prev => {
      const newGraphs = prev.filter(g => g.id !== id);
      if (activeGraphId === id) {
        setActiveGraphId(newGraphs.length > 0 ? newGraphs[0].id : null);
      }
      return newGraphs;
    });
  };

  const activeGraph = graphs.find(g => g.id === activeGraphId) || null;

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
        {/* ───── Split layout ───── */}
       <PanelGroup direction="horizontal" className="workspace-split">
          {/* LEFT – graph */}
          <Panel minSize={20} defaultSize={70}>
            <div className="content-area">
              <ControlTreeGraph
                ref={graphApiRef}
                graphState={activeGraph}
                onButtonStateChange={setButtonStates}
              />
            </div>
          </Panel>

          {/* draggable bar */}
          <PanelResizeHandle className="resizer" />

          {/* RIGHT – chat */}
          <Panel minSize={20} defaultSize={30}>
            <ChatPanel />
          </Panel>
        </PanelGroup>

        <GraphControls
          graphApiRef={graphApiRef}
          buttonStates={buttonStates}
          activeGraph={!!activeGraph}
        />
      </div>
    </div>
  );
}

export default App;