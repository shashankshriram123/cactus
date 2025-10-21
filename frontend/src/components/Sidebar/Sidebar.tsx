import "./Sidebar.css";
import type { SerializableGraphState } from "../../types";

interface SidebarProps {
  graphs: SerializableGraphState[];
  activeGraphId: string | null;
  onNewGraph: () => void;
  onSelectGraph: (id: string) => void;
}

export default function Sidebar({ graphs, activeGraphId, onNewGraph, onSelectGraph }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-graph-btn" onClick={onNewGraph}>+ New Graph</button>
      </div>

      <div className="sidebar-search">
        <input type="text" placeholder="Search…" />
      </div>

      <div className="sidebar-list">
        {graphs.map((g) => (
          <div
            key={g.id}
            className={`sidebar-item ${g.id === activeGraphId ? "active" : ""}`}
            onClick={() => onSelectGraph(g.id)}
          >
            {g.name}
          </div>
        ))}
      </div>
    </div>
  );
}
