import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import ControlTreeGraph from './components/ControlTreeGraph';
import type { GraphApi } from './components/ControlTreeGraph';
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

function App() {
  const [graphs, setGraphs] = useState<SerializableGraphState[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const graphApiRef = useRef<GraphApi>(null);

  // Load graphs from localStorage on initial render
  useEffect(() => {
    const savedGraphs = localStorage.getItem('control-tree-graphs');
    if (savedGraphs) {
      const parsedGraphs = JSON.parse(savedGraphs);
      setGraphs(parsedGraphs);
      if (parsedGraphs.length > 0) {
        setActiveGraphId(parsedGraphs[0].id);
      }
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
    setGraphs(prev => prev.filter(g => g.id !== id));
    if (activeGraphId === id) {
      setActiveGraphId(graphs.length > 1 ? graphs.find(g => g.id !== id)!.id : null);
    }
  };

  const activeGraph = graphs.find(g => g.id === activeGraphId) || null;

  return (
    <div className="app-container">
      <Sidebar
        graphs={graphs}
        activeGraphId={activeGraphId}
        onSelectGraph={setActiveGraphId}
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
        <ControlTreeGraph ref={graphApiRef} graphState={activeGraph} />
      </main>
    </div>
  );
}

export default App;