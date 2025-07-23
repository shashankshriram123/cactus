import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import ControlTreeGraph, { type GraphApi } from './components/ControlTreeGraph';
import { GraphControls } from './components/GraphControls';
import type { SerializableGraphState } from './types';
import './App.css';

const createNewGraph = (): SerializableGraphState => {
  const id = crypto.randomUUID();
  return {
    id,
    name: `New Tree ${new Date().toLocaleTimeString()}`,
    camera: { x: window.innerWidth / 2, y: window.innerHeight / 2 + 80, scale: 1 },
    nodes: {
      '1': { id: 1, x: 0, y: 60, isHead: false },
      '2': { id: 2, x: 0, y: 0, isHead: false },
      '3': { id: 3, x: 0, y: -60, isHead: true },
    },
    branches: {
      '1': { id: 1, color: '#f59e0b', nodeIds: [1, 2, 3], parentNodeId: null },
    },
    branchOrder: [1],
    nextNodeId: 4,
    nextBranchId: 2,
    nextColorIndex: 1,
  };
};

// Initial state for the control buttons (all disabled)
const initialButtonStates = {
  create: true, expand: true, fold: true, collapse: true, unfold: true, 
  deleteChildren: true, deleteExtension: true, deleteNode: true
};

function App() {
  const [graphs, setGraphs] = useState<SerializableGraphState[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [buttonStates, setButtonStates] = useState<Record<string, boolean>>(initialButtonStates);
  
  // Ref to access the ControlTreeGraph's imperative API
  const graphApiRef = useRef<GraphApi>(null);

  // Load graphs from localStorage on initial render
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
      localStorage.removeItem('control-tree-graphs');
    }
  }, []);

  // Save graphs to localStorage whenever they change
  useEffect(() => {
    if (graphs.length > 0) {
      localStorage.setItem('control-tree-graphs', JSON.stringify(graphs));
    } else {
      localStorage.removeItem('control-tree-graphs');
    }
  }, [graphs]);

  const handleNewGraph = () => {
    const newGraph = createNewGraph();
    setGraphs(prev => [...prev, newGraph]);
    setActiveGraphId(newGraph.id);
  };
  
  const handleSelectGraph = (id: string) => {
    // Reset button states when switching graphs
    setButtonStates(initialButtonStates);
    setActiveGraphId(id);
  }

  const handleSaveActiveGraph = () => {
    if (!activeGraphId || !graphApiRef.current) return;
    const updatedState = graphApiRef.current.serialize();
    if (updatedState) {
      setGraphs(prev =>
        prev.map(g => (g.id === activeGraphId ? updatedState : g))
      );
      alert('Graph saved!');
    }
  };

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
      />
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="main-header">
          <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(o => !o)}>
            {isSidebarOpen ? '‹' : '›'}
          </button>
          <span className="graph-title">{activeGraph?.name ?? 'No graph selected'}</span>
          {activeGraph && (
            <button className="save-graph-btn" onClick={handleSaveActiveGraph}>
              Save
            </button>
          )}
        </div>
        <div className="content-area">
            <ControlTreeGraph 
                ref={graphApiRef} 
                graphState={activeGraph}
                onButtonStateChange={setButtonStates}
            />
            <GraphControls 
                graphApiRef={graphApiRef}
                buttonStates={buttonStates}
                activeGraph={!!activeGraph}
            />
        </div>
      </main>
    </div>
  );
}

export default App;
