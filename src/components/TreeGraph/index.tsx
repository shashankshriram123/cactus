// src/components/TreeGraph/index.tsx
import React, { useMemo } from 'react';
import ReactFlow, {
  ConnectionLineType,
  Controls,
} from 'reactflow';
import type { Edge as RFEdge, Node as RFNode, Connection } from 'reactflow';

import { CommitNode } from './CommitNode';
import { useLaneLayout } from '../../hooks/useLaneLayout';
import { colorForBranch } from '../../constants/lanes';

import 'reactflow/dist/style.css';
import './styles.css';

const nodeTypes = { commit: CommitNode };

interface Props {
  nodes: any[];
  edges: any[];
  onConnect?: (sourceId: string, sameBranch: boolean) => void;
}

export default function TreeGraph({ nodes, edges, onConnect }: Props) {
  const { nodes: laid, edges: same } = useLaneLayout(nodes, edges);
  const rfNodeTypes = useMemo(() => nodeTypes, []);

  const rfNodes: RFNode[] = laid.map((n) => ({
    id: n.id,
    type: 'commit',
    position: n.position,
    data: n,
  }));

  const rfEdges: RFEdge[] = same.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    style: { stroke: colorForBranch(e.branch), strokeWidth: 6 },
  }));

  return (
    <div className="tree-graph-wrapper">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={rfNodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        onConnect={(params: Connection) => {
          if (onConnect && params.source) {
            const sameLane = params.target != null; // dropped on node = same branch
            onConnect(params.source, sameLane);
          }
        }}
        fitView
        panOnScroll
        nodesDraggable={false}
        nodesConnectable
      >
        <Controls showFitView />
      </ReactFlow>
    </div>
  );
}
