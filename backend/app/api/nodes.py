from fastapi import APIRouter
from app.db.node_schemas import SubBranchRequest, ExtendBranchRequest
from app.core.agent_service import agent_service
from app.api.graphs import get_graph_state # Reuse the get_graph_state for response

router = APIRouter()

@router.post("/nodes/{node_id}/extend")
async def extend_branch_from_node(node_id: int, request: ExtendBranchRequest):
    """
    Agentic action to extend a branch from a specific node.
    """
    graph_id = agent_service.extend_branch(node_id, request.count)
    # In a real app, you'd fetch the updated state of the returned graph_id
    return await get_graph_state("1") # Returning placeholder for now

@router.post("/nodes/{node_id}/branch")
async def create_sub_branch_from_node(node_id: int, request: SubBranchRequest):
    """
    Agentic action to create a new sub-branch from a specific node.
    """
    graph_id = agent_service.create_sub_branch(node_id, request.label, request.initial_prompt)
    # In a real app, you'd fetch the updated state of the returned graph_id
    return await get_graph_state("1") # Returning placeholder for now