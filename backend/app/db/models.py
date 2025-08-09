from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

class Graph(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    branches: List["Branch"] = Relationship(back_populates="graph")

class Branch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    label: str

    graph_id: str = Field(foreign_key="graph.id", index=True)
    graph: "Graph" = Relationship(back_populates="branches")

    parent_node_id: Optional[int] = Field(default=None, foreign_key="node.id")
    head_node_id: Optional[int] = Field(default=None, foreign_key="node.id")

    parent_node: Optional["Node"] = Relationship(
        sa_relationship_kwargs=dict(
            foreign_keys="[Branch.parent_node_id]",
            primaryjoin="Branch.parent_node_id==Node.id",
            overlaps="nodes,branch,head_node,sub_branches",
        ),
        back_populates="sub_branches",
    )

    head_node: Optional["Node"] = Relationship(
        sa_relationship_kwargs=dict(
            foreign_keys="[Branch.head_node_id]",
            primaryjoin="Branch.head_node_id==Node.id",
            overlaps="nodes,branch,parent_node,sub_branches",
        )
    )

    nodes: List["Node"] = Relationship(
        back_populates="branch",
        sa_relationship_kwargs=dict(
            foreign_keys="[Node.branch_id]",
            primaryjoin="Node.branch_id==Branch.id",
            overlaps="parent_node,head_node,sub_branches,branch",
        ),
    )

class Node(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sequence: int
    prompt: Optional[str] = None
    content: str
    model_name: Optional[str] = None

    branch_id: int = Field(foreign_key="branch.id", index=True)
    branch: "Branch" = Relationship(
        back_populates="nodes",
        sa_relationship_kwargs=dict(
            foreign_keys="[Node.branch_id]",
            primaryjoin="Node.branch_id==Branch.id",
            overlaps="parent_node,head_node,sub_branches,nodes",
        ),
    )

    sub_branches: List[Branch] = Relationship(
        back_populates="parent_node",
        sa_relationship_kwargs=dict(
            foreign_keys="[Branch.parent_node_id]",
            primaryjoin="Branch.parent_node_id==Node.id",
            overlaps="nodes,branch,head_node",
        ),
    )

# Resolve forward refs
Graph.model_rebuild()
Branch.model_rebuild()
Node.model_rebuild()
