// src/App.tsx
import React from 'react';
import './App.css';

import Sidebar from './components/Sidebar';
import { ThreadTree } from './components/ThreadTree';

/** Whole UI = one dark dotted board */
export default function App() {
  return (
    <div className="board h-screen w-screen overflow-hidden">
      {/* sidebar inherits board bg */}
      <Sidebar />

      {/* graph pane - transparent so dots show through */}
      <div className="flex-1 overflow-auto board-pane">
        <ThreadTree />
      </div>
    </div>
  );
}
