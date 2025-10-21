export interface SerializableGraphState {
  id: string;
  name: string;
  camera: {
    x: number;
    y: number;
    scale: number;
  };
  nodes: Record<string, any>;
  branches: Record<string, any>;
  branchOrder: number[];
  nextNodeId: number;
  nextBranchId: number;
  nextColorIndex: number;
}
