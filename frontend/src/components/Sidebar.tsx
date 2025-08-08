import React from 'react';
import type { SerializableGraphState } from "../types";

interface SidebarProps {
  graphs: SerializableGraphState[];
  activeGraphId: string | null;
  onSelectGraph: (id: string) => void;
  onNewGraph: () => void;
  onDeleteGraph: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  graphs,
  activeGraphId,
  onSelectGraph,
  onNewGraph,
  onDeleteGraph,
  isOpen,
  setIsOpen,
}) => {
  if (!isOpen) {
    return (
      <div className="sidebar closed">
        <div className="sidebar-collapsed-content">
          <button className="sidebar-icon-btn" onClick={() => setIsOpen(true)} title="Expand Sidebar">
            {/* Expand Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
          </button>
          <button className="sidebar-icon-btn" onClick={onNewGraph} title="New Project">
            {/* New Project Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
           <button className="sidebar-icon-btn" title="Search">
            {/* Search Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar open">
      <div className="sidebar-header">
        <div className="sidebar-branding">
          <span>cactus</span>
        </div>
        <button className="sidebar-icon-btn collapse-btn" onClick={() => setIsOpen(false)} title="Collapse Sidebar">
           {/* Collapse Icon */}
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H3v6"/><path d="M15 21h6v-6"/><path d="M3 3l7 7"/><path d="M21 21l-7-7"/></svg>
        </button>
      </div>
      <div className="sidebar-actions">
        <button className="action-btn" onClick={onNewGraph}>
          + New Project
        </button>
        <button className="action-btn">
          Search Project
        </button>
      </div>
      <div className="sidebar-content">
        <span className="projects-label">Projects</span>
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
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete "${graph.name}"?`)) {
                  onDeleteGraph(graph.id);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
