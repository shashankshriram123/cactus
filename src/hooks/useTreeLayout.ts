// src/hooks/useTreeLayout.ts
import type { TreeNode, TreeEdge } from '../components/TreeGraph/types';

interface Opts {
  direction: 'vertical' | 'horizontal';
  gapX: number;
  gapY: number;
}

/**
 * Returns the same nodes/edges array but with `position` added to each node.
 * Safe for an empty nodes array (initial render).
 */
export function useTreeLayout(
  nodes: TreeNode[],
  edges: TreeEdge[],
  opts: Opts,
): { nodes: TreeNode[]; edges: TreeEdge[] } {
  /* ---------- guard for empty render ---------- */
  if (!nodes.length) {
    // Nothing to lay out yet – return as-is
    return { nodes, edges };
  }

  /* ---------- build adjacency ---------- */
  const childrenMap: Record<string, string[]> = {};
  edges.forEach((e) => {
    (childrenMap[e.source] ||= []).push(e.target);
  });

  /* ---------- depth-first walk ---------- */
  const depth: Record<string, number> = {};
  function dfs(id: string, d = 0) {
    depth[id] = d;
    (childrenMap[id] || []).forEach((child) => dfs(child, d + 1));
  }

  // Choose the first node as root (or keep existing positions if provided)
  dfs(nodes[0].id);

  /* ---------- assign x, y by depth & sibling order ---------- */
  const levelCounter: Record<number, number> = {};
  const positioned = nodes.map((n) => {
    const d = depth[n.id] ?? 0;
    const i = (levelCounter[d] = (levelCounter[d] || 0) + 1);

    return {
      ...n,
      position: {
        x: opts.direction === 'vertical' ? i * opts.gapX : d * opts.gapX,
        y: opts.direction === 'vertical' ? d * opts.gapY : i * opts.gapY,
      },
    };
  });

  return { nodes: positioned, edges };
}
