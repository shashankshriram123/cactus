from sqlmodel import Session
from fastapi import HTTPException
from datetime import datetime

from app.db.session import engine
from app.db.models import Node, Branch, Graph


class AgentService:
    def extend_branch(self, node_id: int, content: str = None, author: str = "user") -> str:
        """
        Adds a new node to the end of the branch that the given node_id belongs to.
        Returns the graph_id of the modified graph.
        """
        with Session(engine) as session:
            start_node = session.get(Node, node_id)
            if not start_node:
                raise HTTPException(status_code=404, detail="Node not found")

            branch = start_node.branch

            highest_sequence = -1
            if branch.nodes:
                highest_sequence = max(n.sequence for n in branch.nodes)

            new_node = Node(
                sequence=highest_sequence + 1,
                content=content or f"Extended node from node {start_node.id}",
                author=author,
                created_at=datetime.utcnow(),
                branch=branch,
            )

            session.add(new_node)
            session.commit()

            return branch.graph_id

    def create_sub_branch(self, parent_node_id: int, label: str, initial_content: str, author: str = "user") -> str:
        """
        Creates a new branch that forks from a parent node.
        Returns the graph_id of the modified graph.
        """
        with Session(engine) as session:
            parent_node = session.get(Node, parent_node_id)
            if not parent_node:
                raise HTTPException(status_code=404, detail="Parent node not found")

            new_branch = Branch(
                label=label,
                graph=parent_node.branch.graph,
                parent_node=parent_node,
            )

            first_node = Node(
                sequence=1,
                content=initial_content,
                author=author,
                created_at=datetime.utcnow(),
                branch=new_branch,
            )

            session.add(new_branch)
            session.add(first_node)
            session.commit()

            return parent_node.branch.graph_id

    def create_root_node(self, graph_id: str, content: str, author: str = "user") -> str:
        """
        Creates a root branch + first node for a graph.
        Returns the graph_id of the modified graph.
        """
        with Session(engine) as session:
            graph = session.get(Graph, graph_id)
            if not graph:
                graph = Graph(id=graph_id, name=f"Project {graph_id}")
                session.add(graph)
                session.commit()
                session.refresh(graph)

            root_branch = Branch(label="Main Chat", graph=graph)
            session.add(root_branch)
            session.commit()
            session.refresh(root_branch)

            first_node = Node(
                sequence=1,
                content=content,
                author=author,
                created_at=datetime.utcnow(),
                branch=root_branch,
            )
            session.add(first_node)
            session.commit()

            return graph.id


agent_service = AgentService()
