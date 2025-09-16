from fastapi import APIRouter, HTTPException
from app.db.node_schemas import SubBranchRequest
from app.db.graph_schemas import GraphStateResponse
from app.core.agent_service import agent_service
from app.api.graphs import get_graph_state

from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from app.db.session import get_session
from app.db.models import Node

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

@router.delete("/nodes/{node_id}/delete-node")
async def delete_node(node_id: int, session: Session = Depends(get_session)):
    """
    Delete this node and everything that descends from it.
    """
    # 1. Find the node
    node = session.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # 2. Recursively delete sub-branches + children
    _delete_node_recursive(node, session)
    session.commit()
    return {"detail": f"Node {node_id} and its descendants deleted."}


@router.delete("/nodes/{node_id}/delete-extension")
async def delete_extension(node_id: int, session: Session = Depends(get_session)):
    """
    Delete all ancestors of this node in the same branch (but keep this node).
    """
    node = session.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    branch_nodes = sorted(node.branch.nodes, key=lambda n: n.sequence)
    for n in branch_nodes:
        if n.sequence < node.sequence:
            _delete_node_recursive(n, session)

    session.commit()
    return {"detail": f"Extension above node {node_id} deleted (node kept)."}


@router.delete("/nodes/{node_id}/delete-children")
async def delete_children(node_id: int, session: Session = Depends(get_session)):
    """
    Delete all descendants of this node (but keep this node itself).
    """
    node = session.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    for child_branch in node.sub_branches:
        for n in child_branch.nodes:
            _delete_node_recursive(n, session)

    session.commit()
    return {"detail": f"Children of node {node_id} deleted (node kept)."}

def _delete_node_recursive(node: Node, session: Session):
    # Delete child branches first
    for branch in node.sub_branches:
        for n in branch.nodes:
            _delete_node_recursive(n, session)
        session.delete(branch)

    session.delete(node)