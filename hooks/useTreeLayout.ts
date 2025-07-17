// hooks/useTreeLayout.ts
import { Node, Edge } from 'reactflow';
import { ThreadNode } from '../models/thread';

const VERTICAL_SPACING = 150;
const HORIZONTAL_SPACING = 200;

export function layoutNodesUpRight(nodes: ThreadNode[], edges: Edge[]): Node[] {
  const nodeMap = new Map<string, ThreadNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const positioned: Node[] = [];
  const visited = new Set<string>();

  function positionNode(nodeId: string, x: number, y: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    positioned.push({
      id: nodeId,
      type: 'default',
      data: { label: nodeMap.get(nodeId)?.label || nodeId },
      position: { x, y },
    });

    const children = edges.filter(e => e.source === nodeId).map(e => e.target);
    children.forEach((childId, i) => {
      const childX = x + HORIZONTAL_SPACING;
      const childY = y - (i + 1) * VERTICAL_SPACING;
      positionNode(childId, childX, childY);
    });
  }

  // Start from root node (assuming first is root)
  const root = nodes[0];
  positionNode(root.id, 100, 400);

  return positioned;
}
