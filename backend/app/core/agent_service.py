class AgentService:
    def extend_branch(self, node_id: int, count: int):
        # TODO: Implement logic to extend a branch
        print(f"Extending branch from node {node_id} by {count} steps.")
        # This should return the graph_id after modification
        return "some-graph-id"

    def create_sub_branch(self, parent_node_id: int, label: str, initial_prompt: str):
        # TODO: Implement logic to create a new sub-branch
        print(f"Creating sub-branch from node {parent_node_id} with label '{label}'.")
        # This should return the graph_id after modification
        return "some-graph-id"

agent_service = AgentService()