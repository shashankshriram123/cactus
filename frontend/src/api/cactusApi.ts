// src/api/cactusApi.ts
import type { SerializableGraphState } from '../types';

const API_BASE =
  import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const cactusApi = {
  /** Fetch or create a graph by id */
  getGraph: (graphId: string): Promise<SerializableGraphState> =>
    request(`/graphs/${graphId}`),

  /** Delete an entire graph */
  deleteGraph: (graphId: string): Promise<void> =>
    request(`/graphs/${graphId}`, { method: 'DELETE' }),

  /** Create the root node in a graph */
  createRoot: (
    graphId: string,
    content: string,
    author: string
  ): Promise<SerializableGraphState> =>
    request(`/graphs/${graphId}/root`, {
      method: 'POST',
      body: JSON.stringify({ content, author }),
    }),

  /** Extend a node’s branch by adding a new node */
  extendNode: (
    nodeId: number,
    content: string,
    author: string
  ): Promise<SerializableGraphState> =>
    request(`/nodes/${nodeId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ content, author }),
    }),

  /** Create a sub-branch from a node */
  createSubBranch: (
    nodeId: number,
    label: string,
    initialPrompt: string
  ): Promise<SerializableGraphState> =>
    request(`/nodes/${nodeId}/branch`, {
      method: 'POST',
      body: JSON.stringify({ label, initial_prompt: initialPrompt }),
    }),

  /** Delete a node (and children/extensions) */
  deleteNode: (
    nodeId: number
  ): Promise<SerializableGraphState> =>
    request(`/nodes/${nodeId}/delete`, { method: 'POST' }),

  /** Delete children of a node */
  deleteChildren: (
    nodeId: number
  ): Promise<SerializableGraphState> =>
    request(`/nodes/${nodeId}/delete-children`, { method: 'POST' }),

  /** Delete extension (ancestors above node) */
  deleteExtension: (
    nodeId: number
  ): Promise<SerializableGraphState> =>
    request(`/nodes/${nodeId}/delete-extension`, { method: 'POST' }),
};
