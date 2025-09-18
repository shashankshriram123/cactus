from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any

from app.db.session import create_db_and_tables
# from app.api import graphs, nodes

# -------------------------------
# Pydantic schema for graph state
# -------------------------------
class SerializableGraphState(BaseModel):
    id: str
    name: str
    camera: Dict[str, Any]
    nodes: Dict[str, Any]
    branches: Dict[str, Any]
    branchOrder: list[int]
    nextNodeId: int
    nextBranchId: int
    nextColorIndex: int

# In-memory store (swap with DB later)
graphs_store: Dict[str, SerializableGraphState] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Creating database and tables...")
    create_db_and_tables()
    yield
    print("Shutting down...")

app = FastAPI(
    title="Agentic Conversation Graph API",
    description="API for managing and interacting with a tree-based conversation model.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Graph routes
# -------------------------------
@app.get("/api/graphs/{graph_id}", response_model=SerializableGraphState)
async def get_graph(graph_id: str):
    g = graphs_store.get(graph_id)
    if not g:
        raise HTTPException(status_code=404, detail="Graph not found")
    return g

@app.delete("/api/graphs/{graph_id}")
async def delete_graph(graph_id: str):
    graphs_store.pop(graph_id, None)
    return {"ok": True}

# Request models that match frontend payload { content, author }
class RootRequest(BaseModel):
    content: str
    author: str

@app.post("/api/graphs/{graph_id}/root", response_model=SerializableGraphState)
async def create_root(graph_id: str, req: RootRequest):
    text, role = req.content, req.author
    """Create a root branch + head node for a new graph"""
    state = SerializableGraphState(
        id=graph_id,
        name="New Graph",
        camera={"x": 150, "y": 300, "scale": 1},
        nodes={"1": {"id": 1, "x": 0, "y": -40, "isHead": True}},
        branches={
            "1": {
                "id": 1,
                "label": text,
                "color": "#f59e0b",
                "nodeIds": [1],
                "parentNodeId": None,
            }
        },
        branchOrder=[1],
        nextNodeId=2,
        nextBranchId=2,
        nextColorIndex=1,
    )
    graphs_store[graph_id] = state
    return state

class ExtendRequest(BaseModel):
    content: str
    author: str

@app.post("/api/nodes/{node_id}/extend", response_model=SerializableGraphState)
async def extend_node(node_id: int, req: ExtendRequest):
    text, role = req.content, req.author
    for g in graphs_store.values():
        if str(node_id) in g.nodes:
            branch_id = next(
                (bid for bid, b in g.branches.items() if node_id in b["nodeIds"]), None
            )
            if not branch_id:
                raise HTTPException(status_code=404, detail="Branch not found")

            new_id = g.nextNodeId
            parent_node = g.nodes[str(node_id)]
            new_y = parent_node["y"] - 60
            g.nodes[str(new_id)] = {
                "id": new_id,
                "x": parent_node["x"],
                "y": new_y,
                "isHead": True,
            }
            g.nodes[str(node_id)]["isHead"] = False

            g.branches[branch_id]["nodeIds"].append(new_id)

            g.nextNodeId += 1
            graphs_store[g.id] = g
            return g

    raise HTTPException(status_code=404, detail="Node not found")

# Default root
@app.get("/")
async def root():
    return {"message": "Welcome to the Agentic Graph API!"}
