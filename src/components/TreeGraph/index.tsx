// src/components/TreeGraph/index.tsx
import React, { useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  ConnectionLineType,
} from 'reactflow';
import type {
  Edge as RFEdge,
  Node as RFNode,
  ReactFlowInstance,
} from 'reactflow';

import 'reactflow/dist/style.css';
import './styles.css';

import type { TreeNode, TreeEdge } from './types';
import { useTreeLayout } from '../../hooks/useTreeLayout';

interface Props {
  nodes: TreeNode[];
  edges: TreeEdge[];
  onConnect?: (edge: RFEdge) => void;
}

export const TreeGraph: React.FC<Props> = ({ nodes, edges, onConnect }) => {
  /* ---------- layout ---------- */
  const { nodes: laidOut, edges: laidEdges } = useTreeLayout(nodes, edges, {
    direction: 'vertical',
    gapX: 120,
    gapY: 100,
  });

  /* ---------- map to React Flow ---------- */
  const rfNodes: RFNode[] = laidOut.map((n) => ({
    id: n.id,
    data: { label: n.label },
    position: n.position!,
    style: {
      width: 28,
      height: 28,
      borderRadius: 14,
      background: '#64D2A6',
      color: '#fff',
      border: '2px solid #fff',
    },
  }));

  const rfEdges: RFEdge[] = laidEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#F2B138', strokeWidth: 4 },
  }));

  /* ---------- handlers ---------- */
  const onInit = useCallback((instance: ReactFlowInstance) => {
    instance.fitView({ padding: 0.1 });
  }, []);

  const handleConnect = useCallback(
    (params) => {
      if (onConnect) onConnect(params as RFEdge);
      else addEdge(params, rfEdges);
    },
    [onConnect, rfEdges],
  );

  /* ---------- render ---------- */
  return (
    <div className="tree-graph-wrapper">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onInit={onInit}
        onConnect={handleConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll
        panOnScroll
      >
        <Background gap={16} />
        <Controls showFitView />
      </ReactFlow>
    </div>
  );
};
