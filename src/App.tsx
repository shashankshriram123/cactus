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
import ChatPanel from './components/ChatPanelSimple';

import './App.css';

const createNewGraph = (): SerializableGraphState => {
  const id = crypto.randomUUID();
  return {
    id,
    name: `New Project ${new Date().toLocaleTimeString()}`,
    camera: { x: 150, y: window.innerHeight - 250, scale: 1 },
    nodes: {
      '1': { id: 1, x: 0, y: -40, isHead: true },
    },
    branches: {
      '1': { id: 1, label: 'Main Chat', color: '#f59e0b', nodeIds: [1], parentNodeId: null },
    },
    branchOrder: [1],
    nextNodeId: 2,
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
          // Check if saved graphs are using old format (3 nodes), if so, clear them
          const firstGraph = parsedGraphs[0];
          const nodeCount = Object.keys(firstGraph.nodes || {}).length;
          if (nodeCount === 3) {
            console.log('Clearing old 3-node graphs, creating new single-node graph');
            localStorage.removeItem('control-tree-graphs');
          } else {
            setGraphs(parsedGraphs);
            setActiveGraphId(parsedGraphs[0].id);
            return; // Exit early if we loaded valid saved graphs
          }
        }
      }
    } catch (error) {
      console.error("Failed to load graphs from localStorage:", error);
    }
    
    // If no saved graphs or error loading, create a default graph
    const defaultGraph = createNewGraph();
    setGraphs([defaultGraph]);
    setActiveGraphId(defaultGraph.id);
  }, []);

  // Save graphs to localStorage whenever they change
  useEffect(() => {
    if (graphs.length > 0) {
      localStorage.setItem('control-tree-graphs', JSON.stringify(graphs));
    }
  }, [graphs]);

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