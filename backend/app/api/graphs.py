from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session
from app.db.session import engine, get_session
from app.db.models import Graph, Branch, Node
from app.db.graph_schemas import (
    GraphStateResponse,
    SerializableNodeResponse,
    SerializableBranchResponse,
)
from app.db.node_schemas import RootNodeCreate
from datetime import datetime

router = APIRouter()


def convert_graph_to_response(graph: Graph) -> GraphStateResponse:
    """Helper function to convert database models to the API response schema."""
    nodes_response = {}
    y_pos = -40
    for branch in graph.branches:
        for node in branch.nodes:
            nodes_response[str(node.id)] = SerializableNodeResponse(
                id=node.id,
                x=0,
                y=y_pos,
                isHead=(node.sequence == len(branch.nodes) - 1),
            )
            y_pos -= 60

    branches_response = {
        str(b.id): SerializableBranchResponse(
            id=b.id,
            label=b.label,
            color="#f59e0b",  # Hardcoded color
            nodeIds=[n.id for n in b.nodes],
            parentNodeId=b.parent_node_id,
        )
        for b in graph.branches
    }

    return GraphStateResponse(
        id=graph.id,
        name=graph.name,
        camera={"x": 150, "y": 500, "scale": 1},
        nodes=nodes_response,
        branches=branches_response,
        branchOrder=[b.id for b in graph.branches],
        nextNodeId=max([n.id for n in nodes_response.values()]) + 1
        if nodes_response
        else 1,
        nextBranchId=max([b.id for b in branches_response.values()]) + 1
        if branches_response
        else 1,
        nextColorIndex=1,
    )


@router.get("/graphs/{graph_id}", response_model=GraphStateResponse)
async def get_graph_state(graph_id: str):
    """
    Fetches the state of a graph. If the graph doesn't exist, create an EMPTY one.
    (No branches or nodes are seeded here.)
    """
    with Session(engine) as session:
        graph = session.get(Graph, graph_id)

        if not graph:
            print(f"Graph '{graph_id}' not found. Creating empty graph.")
            graph = Graph(id=graph_id, name=f"Project {graph_id}")
            session.add(graph)
            session.commit()
            session.refresh(graph)

        return convert_graph_to_response(graph)


@router.post("/graphs/{graph_id}/root", response_model=GraphStateResponse)
async def create_root_node(graph_id: str, request: RootNodeCreate, session: Session = Depends(get_session)):
    """
    Create the root branch + first node in a graph.
    If a root branch already exists, return the current graph state (idempotent).
    """
    graph = session.get(Graph, graph_id)
    if not graph:
        graph = Graph(id=graph_id, name=f"Project {graph_id}")
        session.add(graph)
        session.commit()
        session.refresh(graph)

    # Check if a root branch already exists (parent_node_id is None)
    existing_root = next((b for b in graph.branches if b.parent_node_id is None), None)
    if existing_root:
        # Just return the current graph instead of raising error
        session.refresh(graph)
        return convert_graph_to_response(graph)

    # Otherwise create a new root branch + root node
    root_branch = Branch(label="Main Chat", graph=graph)
    session.add(root_branch)
    session.commit()
    session.refresh(root_branch)

    first_node = Node(
        sequence=1,
        content=request.content,
        author=request.author,
        created_at=datetime.utcnow(),
        branch=root_branch,
    )
    session.add(first_node)
    session.commit()

    session.refresh(graph)
    return convert_graph_to_response(graph)



@router.delete("/graphs/{graph_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_graph(graph_id: str, session: Session = Depends(get_session)):
    """
    Deletes a graph and all its branches/nodes.
    Useful for testing and cleanup.
    """
    graph = session.get(Graph, graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")

    session.delete(graph)
    session.commit()
    return