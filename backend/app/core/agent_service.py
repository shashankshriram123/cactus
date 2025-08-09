from sqlmodel import Session, select
from fastapi import HTTPException
from app.db.session import engine
from app.db.models import Node, Branch

class AgentService:
    def extend_branch(self, node_id: int) -> str:
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
                content=f"Extended node from node {start_node.id}",
                branch=branch
            )

            session.add(new_node)
            session.commit()
            
            return branch.graph_id

    # Add this new method
    def create_sub_branch(self, parent_node_id: int, label: str, initial_content: str) -> str:
        """
        Creates a new branch that forks from a parent node.
        Returns the graph_id of the modified graph.
        """
        with Session(engine) as session:
            # 1. Find the parent node.
            parent_node = session.get(Node, parent_node_id)
            if not parent_node:
                raise HTTPException(status_code=404, detail="Parent node not found")

            # 2. Create the new sub-branch and link it to the parent node.
            new_branch = Branch(
                label=label,
                graph=parent_node.branch.graph, # It belongs to the same graph
                parent_node=parent_node
            )

            # 3. Create the first node for this new sub-branch.
            first_node = Node(
                sequence=0,
                content=initial_content,
                branch=new_branch
            )
            
            # 4. Add the new objects and commit.
            session.add(new_branch)
            session.add(first_node)
            session.commit()

            return parent_node.branch.graph_id


agent_service = AgentService()