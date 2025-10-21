from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session

from app.db.session import get_session, engine
from app.db.models import Node, Graph
from app.core.agent_service import agent_service
from app.api.graphs import convert_graph_to_response, get_graph_state
from app.db.graph_schemas import GraphStateResponse
from app.db.node_schemas import SubBranchRequest, NodeCreate

router = APIRouter()

@router.post("/nodes/{node_id}/extend", response_model=GraphStateResponse)
async def extend_node(node_id: int, payload: NodeCreate):
    """Extend the conversation from the given node by appending a new node to its branch."""
    try:
        graph_id = agent_service.extend_branch(
            node_id,
            content=payload.content,
            author=payload.author or "user",
        )
        with Session(engine) as session:
            graph = session.get(Graph, graph_id)
            if not graph:
                raise HTTPException(status_code=404, detail="Graph not found")
            return convert_graph_to_response(graph)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extend node {node_id}: {str(e)}")




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

@router.post("/nodes/{node_id}/delete", response_model=GraphStateResponse)
async def delete_node(node_id: int, session: Session = Depends(get_session)):
    """Delete this node and everything that descends from it, then return updated graph state."""
    node = session.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    graph_id = node.branch.graph_id
    _delete_node_recursive(node, session)
    session.commit()

    graph = session.get(Graph, graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found after deletion")
    return convert_graph_to_response(graph)


@router.post("/nodes/{node_id}/delete-extension", response_model=GraphStateResponse)
async def delete_extension(node_id: int, session: Session = Depends(get_session)):
    """Delete all ancestors of this node in the same branch (but keep this node), then return graph state."""
    node = session.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    graph_id = node.branch.graph_id
    branch_nodes = sorted(node.branch.nodes, key=lambda n: n.sequence)
    for n in branch_nodes:
        if n.sequence < node.sequence:
            _delete_node_recursive(n, session)

    session.commit()
    graph = session.get(Graph, graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found after deletion")
    return convert_graph_to_response(graph)


@router.post("/nodes/{node_id}/delete-children", response_model=GraphStateResponse)
async def delete_children(node_id: int, session: Session = Depends(get_session)):
    """Delete all descendants of this node (but keep this node itself) and return graph state."""
    node = session.get(Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    graph_id = node.branch.graph_id
    # Delete all child branches and their nodes
    for child_branch in list(node.sub_branches):
        for n in list(child_branch.nodes):
            _delete_node_recursive(n, session)
        session.delete(child_branch)

    session.commit()
    graph = session.get(Graph, graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found after deletion")
    return convert_graph_to_response(graph)

def _delete_node_recursive(node: Node, session: Session):
    # Delete child branches first
    for branch in node.sub_branches:
        for n in branch.nodes:
            _delete_node_recursive(n, session)
        session.delete(branch)

    session.delete(node)
