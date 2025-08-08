from pydantic import BaseModel
from typing import List, Dict, Optional

# Corresponds to your frontend's SerializableNode
class SerializableNodeResponse(BaseModel):
    id: int
    x: float
    y: float
    isHead: bool

# Corresponds to your frontend's SerializableBranch
class SerializableBranchResponse(BaseModel):
    id: int
    label: str
    color: str
    nodeIds: List[int]
    parentNodeId: Optional[int] = None

# The main response model for the entire graph state
class GraphStateResponse(BaseModel):
    id: str
    name: str
    camera: Dict[str, float]
    nodes: Dict[str, SerializableNodeResponse]
    branches: Dict[str, SerializableBranchResponse]
    branchOrder: List[int]
    nextNodeId: int
    nextBranchId: int
    nextColorIndex: int