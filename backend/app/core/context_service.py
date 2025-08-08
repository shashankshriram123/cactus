class ContextService:
    def generate_context_for_node(self, node_id: int) -> list:
        # TODO: Implement the logic to trace history up the graph
        print(f"Generating context for node {node_id}.")
        # This will return a list of chat messages for the LLM API
        return [{"role": "user", "content": "This is a placeholder context."}]

context_service = ContextService()