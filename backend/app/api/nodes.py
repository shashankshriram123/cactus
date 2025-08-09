from fastapi import APIRouter, HTTPException
from app.db.node_schemas import SubBranchRequest
from app.db.graph_schemas import GraphStateResponse
from app.core.agent_service import agent_service
from app.api.graphs import get_graph_state

router = APIRouter()

@router.post("/nodes/{node_id}/extend", response_model=GraphStateResponse)
async def extend_branch_from_node(node_id: int):
    """
    Agentic action to extend a branch from a specific node.
    """
    graph_id = agent_service.extend_branch(node_id=node_id)
    return await get_graph_state(graph_id=graph_id)


# Update this endpoint
@router.post("/nodes/{node_id}/branch", response_model=GraphStateResponse)
async def create_sub_branch_from_node(node_id: int, request: SubBranchRequest):
    """
    Agentic action to create a new sub-branch from a specific node.
    """
    # Call the new service function with the correct content
    graph_id = agent_service.create_sub_branch(
        parent_node_id=node_id,
        label=request.label,
        initial_content=request.initial_prompt # Use the prompt as the first content
    )
    
    # Return the full, updated graph state
    return await get_graph_state(graph_id=graph_id)