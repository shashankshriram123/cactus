from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.session import create_db_and_tables

# Routers
from app.api import graphs, nodes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure models are imported so SQLModel knows about them
    from app.db import models  # noqa: F401
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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers under /api
app.include_router(graphs.router, prefix="/api")
app.include_router(nodes.router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Welcome to the Agentic Graph API!"}
