// src/utils/commitsToGraph.ts
import type { Commit } from '../models/thread';
import type { TreeNode, TreeEdge } from '../components/TreeGraph/types';

export function commitsToGraph(commits: Commit[]) {
  const nodes: TreeNode[] = commits.map((c) => ({
    id: c.id,
    label: c.msg,
    branch: c.branch,
    isBranchRoot: !c.msg,
  }));

  const edges: TreeEdge[] = [];
  commits.forEach((c) =>
    c.parentIds.forEach((p) =>
      edges.push({
        id: `${p}→${c.id}`,
        source: p,
        target: c.id,
        branch: c.branch,
      }),
    ),
  );

  return { nodes, edges };
}
