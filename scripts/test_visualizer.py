import json
from graphviz import Digraph

def visualize_graph_from_json(json_data, output_filename):
    """
    Generates a visual representation of the graph state from a JSON payload.

    Args:
        json_data (str): A string containing the JSON data.
        output_filename (str): The name of the output image file (e.g., 'graph_state_1.png').
    """
    data = json.loads(json_data)
    dot = Digraph(comment=data['name'])
    dot.attr('node', shape='circle')

    # Add all nodes to the graph
    for node_id, node_data in data['nodes'].items():
        label = f"Node {node_id}"
        if node_data.get('isHead', False):
            dot.node(node_id, label, style='filled', fillcolor='lightblue')
        else:
            dot.node(node_id, label)

    # Add edges based on branches
    for branch_id, branch_data in data['branches'].items():
        node_ids = [str(nid) for nid in branch_data['nodeIds']]
        
        # Draw edges within the branch
        for i in range(len(node_ids) - 1):
            dot.edge(node_ids[i], node_ids[i+1])

        # Draw edge for sub-branches
        if branch_data['parentNodeId']:
            parent_node_id = str(branch_data['parentNodeId'])
            if node_ids:
                first_node_id = node_ids[0]
                dot.edge(parent_node_id, first_node_id, style='dashed', label=branch_data['label'])

    # Render the graph
    # Remove the '.png' from the end for the render function
    output_base = output_filename.rsplit('.', 1)[0]
    dot.render(output_base, view=False, format='png')
    print(f"Graph saved to {output_filename}")


# --- JSON Payloads ---

json_1 = """
{
  "id": "test-graph",
  "name": "Project test-graph",
  "nodes": {
    "1": { "id": 1, "isHead": false },
    "2": { "id": 2, "isHead": true }
  },
  "branches": {
    "1": { "id": 1, "label": "Main Chat", "nodeIds": [ 1, 2 ], "parentNodeId": null }
  }
}
"""

json_2 = """
{
    "id": "test-graph",
    "name": "Project test-graph",
    "nodes": {
        "1": {"id": 1, "isHead": false},
        "2": {"id": 2, "isHead": true},
        "3": {"id": 3, "isHead": true}
    },
    "branches": {
        "1": {"id": 1, "label": "Main Chat", "nodeIds": [1, 2], "parentNodeId": null},
        "2": {"id": 2, "label": "Exploration", "nodeIds": [3], "parentNodeId": 1}
    }
}
"""

json_3 = """
{
    "id": "test-graph",
    "name": "Project test-graph",
    "nodes": {
        "1": {"id": 1, "isHead": false},
        "2": {"id": 2, "isHead": false},
        "3": {"id": 3, "isHead": true},
        "5": {"id": 5, "isHead": true}
    },
    "branches": {
        "1": {"id": 1, "label": "Main Chat", "nodeIds": [1, 2, 5], "parentNodeId": null},
        "2": {"id": 2, "label": "Exploration", "nodeIds": [3], "parentNodeId": 1}
    }
}
"""

json_4 = """
{
    "id": "test-graph",
    "name": "Project test-graph",
    "nodes": {
        "1": {"id": 1, "isHead": false},
        "2": {"id": 2, "isHead": false},
        "3": {"id": 3, "isHead": true},
        "5": {"id": 5, "isHead": true},
        "6": {"id": 6, "isHead": true}
    },
    "branches": {
        "1": {"id": 1, "label": "Main Chat", "nodeIds": [1, 2, 5], "parentNodeId": null},
        "2": {"id": 2, "label": "Exploration", "nodeIds": [3], "parentNodeId": 1},
        "4": {"id": 4, "label": "New Branch", "nodeIds": [6], "parentNodeId": 1}
    }
}
"""

json_5 = """
{
    "id": "test-graph",
    "name": "Project test-graph",
    "nodes": {
        "1": {"id": 1, "isHead": false},
        "2": {"id": 2, "isHead": false},
        "3": {"id": 3, "isHead": true},
        "5": {"id": 5, "isHead": true},
        "6": {"id": 6, "isHead": true}
    },
    "branches": {
        "1": {"id": 1, "label": "Main Chat", "nodeIds": [1, 2, 5], "parentNodeId": null},
        "2": {"id": 2, "label": "Exploration", "nodeIds": [3], "parentNodeId": 1},
        "4": {"id": 4, "label": "New Branch", "nodeIds": [6], "parentNodeId": 1}
    }
}
"""


# --- Generate Visualizations ---

visualize_graph_from_json(json_1, 'step_1_create_graph.png')
visualize_graph_from_json(json_2, 'step_2_create_root_node.png')
visualize_graph_from_json(json_3, 'step_3_extend_branch.png')
visualize_graph_from_json(json_4, 'step_4_branch_off_root.png')
visualize_graph_from_json(json_5, 'step_5_final_state.png')