// components/TreeGraph/types.ts

/** A single node in your tree */
export interface TreeNode {
  id: string;
  label: string;
  position?: { x: number; y: number };
}

/** A directed edge between two nodes */
export interface TreeEdge {
  id: string;
  source: string;
  target: string;
}
