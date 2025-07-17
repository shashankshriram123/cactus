// components/ThreadTree.tsx

import React, { useEffect, useState } from 'react';
import { TreeGraph } from './TreeGraph';
import type { TreeNode, TreeEdge } from './TreeGraph/types';

export const ThreadTree: React.FC = () => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [edges, setEdges] = useState<TreeEdge[]>([]);

  useEffect(() => {
    // TODO: fetch or compute your thread/commit data
    const commits = [
      { id: 'a', label: 'Init' },
      { id: 'b', label: 'Feature' },
      { id: 'c', label: 'Fix' },
    ];
    const rels = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    setNodes(commits);
    setEdges(rels);
  }, []);

  return <TreeGraph nodes={nodes} edges={edges} />;
};
