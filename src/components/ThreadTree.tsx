// src/components/ThreadTree.tsx
import { commitsToGraph } from '../utils/commitsToGraph';
import TreeGraph from './TreeGraph';
import { useDemoThread } from '../store/useDemoThread';

export default function ThreadTree() {
  const { commits, addCommit, addBranch } = useDemoThread();
  const { nodes, edges } = commitsToGraph(commits);

  return (
    <TreeGraph
      nodes={nodes}
      edges={edges}
      onConnect={(sourceId, sameBranch) =>
        sameBranch ? addCommit(sourceId) : addBranch(sourceId)
      }
    />
  );
}
