from fastapi import FastAPI
from app.api import graphs, nodes

app = FastAPI(
    title="Agentic Conversation Graph API",
    description="API for managing and interacting with a tree-based conversation model.",
    version="0.1.0"
)

# Include the API routers
app.include_router(graphs.router, prefix="/api", tags=["Graphs"])
app.include_router(nodes.router, prefix="/api", tags=["Nodes"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Agentic Graph API!"}