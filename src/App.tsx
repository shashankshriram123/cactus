import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ThreadTree from './components/ThreadTree';

export default function App() {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="board h-screen w-screen overflow-hidden">
      {/* Toggle button fixed at top-left */}
      <button
        className="absolute z-10 top-3 left-3 bg-zinc-800 text-zinc-200 px-2 py-1 rounded"
        onClick={() => setShowSidebar((s) => !s)}
      >
        {showSidebar ? '☰' : '☰'}
      </button>

      {/* Sidebar slides horizontally */}
      <div
        className={`transition-transform duration-300 ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Graph pane grows to fill remaining space */}
      <div className="board-pane flex-1 overflow-auto">
        <ThreadTree />
      </div>
    </div>
  );
}
