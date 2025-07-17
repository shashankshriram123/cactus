// src/hooks/useLaneLayout.ts
import type { TreeNode, TreeEdge } from '../components/TreeGraph/types';

/**
 * Positions each node:
 *   y = commit index
 *   x = branch index * laneWidth
 */
export function useLaneLayout(
  nodes: TreeNode[],
  edges: TreeEdge[],
  gapY = 120,
  laneWidth = 80,
) {
  /* empty render on first mount */
  if (!nodes.length) return { nodes, edges };

  const positioned = nodes.map((n, idx) => ({
    ...n,
    position: {
      x: (n.branch ?? 0) * laneWidth,     // ← branch, never lane
      y: idx * gapY,
    },
  }));

  return { nodes: positioned, edges };
}
