// components/Sidebar.tsx
import type { Thread } from '../models/types';

interface Props {
  threads?: Thread[];          // ← make optional
  selectedId?: string | null;
  setSelectedId?: (id: string) => void;
  onAdd?: () => void;
}

export default function Sidebar({
  threads = [],               // ← default to empty array
  selectedId = null,
  setSelectedId = () => {},
  onAdd = () => {},
}: Props) {
  return (
    <aside className="w-64 bg-zinc-800 border-r border-zinc-700 p-4">
      <button
        className="text-white mb-4 w-full text-left font-semibold"
        onClick={onAdd}
      >
        + new thread
      </button>

      <h2 className="text-sm text-zinc-400 mb-2">Threads</h2>

      <ul className="space-y-1">
        {threads.map((thread) => (
          <li key={thread.id}>
            <button
              className={`w-full text-left px-2 py-1 rounded ${
                selectedId === thread.id
                  ? 'bg-zinc-700 text-white'
                  : 'hover:bg-zinc-700 text-zinc-300'
              }`}
              onClick={() => setSelectedId(thread.id)}
            >
              {thread.title || 'Untitled Thread'}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
