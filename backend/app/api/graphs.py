from fastapi import APIRouter, HTTPException
from sqlmodel import Session
from app.db.session import engine
from app.db.models import Graph, Branch, Node
from app.db.graph_schemas import GraphStateResponse, SerializableNodeResponse, SerializableBranchResponse

router = APIRouter()

def convert_graph_to_response(graph: Graph) -> GraphStateResponse:
    """Helper function to convert database models to the API response schema."""
    # Note: The x, y, and camera coordinates are hardcoded for now.
    # A real implementation would have a layout algorithm.
    
    nodes_response = {}
    y_pos = -40
    for branch in graph.branches:
        for node in branch.nodes:
            nodes_response[str(node.id)] = SerializableNodeResponse(
                id=node.id,
                x=0,
                y=y_pos,
                isHead=(node.sequence == len(branch.nodes) - 1) # Simplistic isHead logic
            )
            y_pos -= 60


    branches_response = {
        str(b.id): SerializableBranchResponse(
            id=b.id,
            label=b.label,
            color="#f59e0b", # Hardcoded color
            nodeIds=[n.id for n in b.nodes],
            parentNodeId=b.parent_node_id
        ) for b in graph.branches
    }

    return GraphStateResponse(
        id=graph.id,
        name=graph.name,
        camera={"x": 150, "y": 500, "scale": 1}, # Hardcoded camera
        nodes=nodes_response,
        branches=branches_response,
        branchOrder=[b.id for b in graph.branches],
        nextNodeId=max([n.id for n in nodes_response.values()]) + 1 if nodes_response else 1,
        nextBranchId=max([b.id for b in branches_response.values()]) + 1 if branches_response else 1,
        nextColorIndex=1
    )


@router.get("/graphs/{graph_id}", response_model=GraphStateResponse)
async def get_graph_state(graph_id: str):
    """
    Fetches the state of a graph. If the graph doesn't exist,
    it creates a new one.
    """
    with Session(engine) as session:
        # 1. Try to find the graph in the database
        graph = session.get(Graph, graph_id)

        # 2. If the graph doesn't exist, create it
        if not graph:
            print(f"Graph '{graph_id}' not found. Creating a new one.")
            
            # Create the main graph object
            graph = Graph(id=graph_id, name=f"Project {graph_id}")
            
            # Create a root branch for this graph
            root_branch = Branch(label="Main Chat", graph=graph)
            
            # Create an initial node for the root branch
            initial_node = Node(
                sequence=0, 
                content="This is the first node.", 
                branch=root_branch
            )
            
            # Add all new objects to the session and commit to the database
            session.add(graph)
            session.commit()
            
            # Refresh the graph object to get all relationships populated
            session.refresh(graph)

        # 3. Convert the database models to the frontend response format and return
        return convert_graph_to_response(graph)