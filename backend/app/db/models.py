from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime


class Graph(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str

    branches: List["Branch"] = Relationship(back_populates="graph")


class Branch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    label: str

    graph_id: str = Field(foreign_key="graph.id", index=True)
    graph: "Graph" = Relationship(back_populates="branches")

    # The node this branch forked from (nullable for root branch)
    parent_node_id: Optional[int] = Field(default=None, foreign_key="node.id")

    # Relationship to parent node
    parent_node: Optional["Node"] = Relationship(
        back_populates="sub_branches",
        sa_relationship_kwargs={"foreign_keys": "[Branch.parent_node_id]"},
    )

    # One-to-many Branch -> Nodes (use Node.branch_id explicitly)
    nodes: List["Node"] = Relationship(
        back_populates="branch",
        sa_relationship_kwargs={"foreign_keys": "[Node.branch_id]"},
    )


class Node(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sequence: int

    content: str
    prompt: Optional[str] = None
    model_name: Optional[str] = None
    author: Optional[str] = Field(default="user")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    branch_id: int = Field(foreign_key="branch.id", index=True)

    # Node belongs to exactly one Branch
    branch: "Branch" = Relationship(
        back_populates="nodes",
        sa_relationship_kwargs={"foreign_keys": "[Node.branch_id]"},
    )

    # Node can have sub-branches forked from it
    sub_branches: List["Branch"] = Relationship(
        back_populates="parent_node",
        sa_relationship_kwargs={"foreign_keys": "[Branch.parent_node_id]"},
    )


# Resolve forward references
Graph.model_rebuild()
Branch.model_rebuild()
Node.model_rebuild()
