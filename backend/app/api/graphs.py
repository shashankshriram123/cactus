from fastapi import APIRouter, HTTPException
from app.db.graph_schemas import GraphStateResponse
# In a real app, you would have a service to fetch this data
# from app.core.graph_service import graph_service 

router = APIRouter()

@router.get("/graphs/{graph_id}", response_model=GraphStateResponse)
async def get_graph_state(graph_id: str):
    """
    Fetches the complete, serializable state of a graph for frontend rendering.
    """
    # TODO: Replace this with a real call to a service that fetches
    # and calculates the graph state from the database.
    if graph_id != "1":
        raise HTTPException(status_code=404, detail="Graph not found")

    # This is placeholder data matching your frontend's initial state
    return GraphStateResponse(
        id="1",
        name="Demo Project",
        camera={"x": 150, "y": 500, "scale": 1},
        nodes={
            '1': {'id': 1, 'x': 0, 'y': -40, 'isHead': False},
            '2': {'id': 2, 'x': 0, 'y': -100, 'isHead': False},
            '3': {'id': 3, 'x': 0, 'y': -160, 'isHead': True},
        },
        branches={
            '1': {'id': 1, 'label': 'Main Chat', 'color': '#f59e0b', 'nodeIds': [1, 2, 3], 'parentNodeId': None},
        },
        branchOrder=[1],
        nextNodeId=4,
        nextBranchId=2,
        nextColorIndex=1
    )