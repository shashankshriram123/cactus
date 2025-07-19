import React from 'react';
import type { SerializableGraphState } from "../types";


interface SidebarProps {
  graphs: SerializableGraphState[];
  activeGraphId: string | null;
  onSelectGraph: (id: string) => void;
  onNewGraph: () => void;
  onDeleteGraph: (id: string) => void;
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  graphs,
  activeGraphId,
  onSelectGraph,
  onNewGraph,
  onDeleteGraph,
  isOpen,
}) => {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <button className="new-graph-btn" onClick={onNewGraph}>
          + New Tree
        </button>
      </div>
      <div className="sidebar-content">
        {graphs.map((graph) => (
          <div
            key={graph.id}
            className={`sidebar-item ${graph.id === activeGraphId ? 'active' : ''}`}
            onClick={() => onSelectGraph(graph.id)}
          >
            <span className="sidebar-item-name">{graph.name}</span>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent item selection
                if (window.confirm(`Are you sure you want to delete "${graph.name}"?`)) {
                  onDeleteGraph(graph.id);
                }
              }}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};