// src/components/TreeGraph/CommitNode.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { colorForBranch } from '../../constants/lanes';

export function CommitNode({ data }) {
  const color = colorForBranch(data.branch);
  const filled = !data.isBranchRoot;

  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        background: filled ? color : 'transparent',
        border: `3px solid ${color}`,
      }}
    >
      <Handle type="source" position={Position.Top} />
      <Handle type="target" position={Position.Bottom} />
    </div>
  );
}
