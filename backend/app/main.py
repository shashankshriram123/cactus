from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api import graphs, nodes
from app.db.session import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    print("Creating database and tables...")
    create_db_and_tables()
    yield
    # Code to run on shutdown (if needed)
    print("Shutting down...")

app = FastAPI(
    title="Agentic Conversation Graph API",
    description="API for managing and interacting with a tree-based conversation model.",
    version="0.1.0",
    lifespan=lifespan # Add the lifespan manager here
)

# Include the API routers
app.include_router(graphs.router, prefix="/api", tags=["Graphs"])
app.include_router(nodes.router, prefix="/api", tags=["Nodes"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Agentic Graph API!"}