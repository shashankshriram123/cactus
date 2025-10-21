export interface SerializableNode {
  id: number;
  x: number;
  y: number;
  isHead: boolean;
}

export interface SerializableBranch {
  id: number;
  label: string; // Add label property
  color: string;
  nodeIds: number[];
  parentNodeId: number | null;
}

export interface SerializableGraphState {
  id: string;
  name: string;
  camera: { x: number; y: number; scale: number };
  nodes: Record<string, SerializableNode>;
  branches: Record<string, SerializableBranch>;
  branchOrder: number[];
  nextNodeId: number;
  nextBranchId: number;
  nextColorIndex: number;
}

// For runtime use
export interface GraphNode {
  id: number;
  x: number;
  y: number;
  isHead: boolean;
  isHidden: boolean;
  branch: GraphBranch;
}

export interface GraphBranch {
  id: number;
  label: string; // Add label property
  color: string;
  nodes: GraphNode[];
  parentNode: GraphNode | null;
  isHidden: boolean;
}
