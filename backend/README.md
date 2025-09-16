# Agentic Conversation Graph API

This project is a backend API for managing and interacting with a tree-based conversation model. It allows you to create complex, branching conversations, making it ideal for applications like advanced chatbots, collaborative story writing, or exploring different conversational paths with AI agents.

## Tech Stack

  * **FastAPI:** A modern, high-performance web framework for building APIs with Python.
  * **SQLModel:** A library for interacting with SQL databases using Python, combining the best of SQLAlchemy and Pydantic.
  * **PostgreSQL:** A powerful, open-source object-relational database system.
  * **Uvicorn:** A lightning-fast ASGI server, used to run the FastAPI application.

-----

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── graphs.py
│   │   └── nodes.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── agent_service.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── graph_schemas.py
│   │   ├── models.py
│   │   ├── node_schemas.py
│   │   └── session.py
│   ├── __init__.py
│   ├── config.py
│   └── main.py
├── .gitignore
├── requirements.txt
└── .env (You will need to create this file)
```

### File Breakdown

  * **`app/main.py`**: The entry point for the application. It initializes the FastAPI app, includes the API routers, and manages the application's lifespan (startup and shutdown events).
  * **`app/config.py`**: Manages the application's configuration, such as the database URL, using Pydantic's `BaseSettings`.
  * **`app/db/models.py`**: Defines the database schema using SQLModel. This is where the `Graph`, `Branch`, and `Node` tables are defined.
  * **`app/db/session.py`**: Manages the database session and engine, providing a way to connect to the database.
  * **`app/api/graphs.py`**: Contains the API endpoints related to graphs, such as fetching the state of a graph.
  * **`app/api/nodes.py`**: Contains the API endpoints related to nodes, such as extending a branch or creating a sub-branch.
  * **`app/core/agent_service.py`**: Holds the core business logic of the application, including the `AgentService` class that modifies the conversation graph.
  * **`requirements.txt`**: Lists the Python dependencies for the project.
  * **`.env`**: A file (that you need to create) to store environment variables, such as the `DATABASE_URL`.

-----

## Database Schema

The database is designed to represent a tree-like conversation structure.

### `Graph`

The top-level model that represents an entire conversation graph.

| Field      | Type   | Description                                |
| :--------- | :----- | :----------------------------------------- |
| `id`       | `str`  | The unique identifier for the graph.       |
| `name`     | `str`  | The name of the graph.                     |
| `branches` | `List` | A list of all branches within this graph. |

### `Branch`

Represents a single path or a sequence of messages in the conversation.

| Field            | Type       | Description                                              |
| :--------------- | :--------- | :------------------------------------------------------- |
| `id`             | `int`      | The unique identifier for the branch.                    |
| `label`          | `str`      | A descriptive label for the branch.                      |
| `graph_id`       | `str`      | A foreign key linking the branch to a `Graph`.           |
| `parent_node_id` | `int`      | A foreign key linking the branch to its parent `Node`.   |
| `nodes`          | `List`     | A list of all nodes within this branch.                  |

### `Node`

Represents a single message or turn in the conversation.

| Field        | Type      | Description                                                |
| :----------- | :-------- | :--------------------------------------------------------- |
| `id`         | `int`     | The unique identifier for the node.                        |
| `sequence`   | `int`     | The order of the node within its branch.                   |
| `content`    | `str`     | The text content of the node.                              |
| `branch_id`  | `int`     | A foreign key linking the node to a `Branch`.              |
| `sub_branches`| `List`| A list of all branches that fork from this node.          |

-----

## API Endpoints

The API provides endpoints for interacting with the conversation graph.

### `GET /api/graphs/{graph_id}`

Fetches the state of a graph. If the graph doesn't exist, it creates a new one.

  * **URL Params:** `graph_id=[string]` (required)
  * **Success Response:**
      * **Code:** 200
      * **Content:** A `GraphStateResponse` object representing the state of the graph.

### `POST /api/nodes/{node_id}/extend`

Extends a branch from a specific node by adding a new node to the end of the branch.

  * **URL Params:** `node_id=[integer]` (required)
  * **Success Response:**
      * **Code:** 200
      * **Content:** A `GraphStateResponse` object representing the updated state of the graph.

### `POST /api/nodes/{node_id}/branch`

Creates a new sub-branch that forks from a specific node.

  * **URL Params:** `node_id=[integer]` (required)
  * **Request Body:**
      * `label`: `string`
      * `initial_prompt`: `string`
  * **Success Response:**
      * **Code:** 200
      * **Content:** A `GraphStateResponse` object representing the updated state of the graph.

-----

## Core Logic

The core logic of the application is encapsulated in the `AgentService` class.

### `AgentService.extend_branch(node_id: int)`

  * **Purpose:** Adds a new node to the end of the branch that the given `node_id` belongs to.
  * **Steps:**
    1.  Finds the `start_node` in the database.
    2.  Gets the `branch` that the `start_node` belongs to.
    3.  Determines the `highest_sequence` number in the branch.
    4.  Creates a `new_node` with the next sequence number.
    5.  Adds the `new_node` to the session and commits it to the database.

### `AgentService.create_sub_branch(parent_node_id: int, label: str, initial_content: str)`

  * **Purpose:** Creates a new branch that forks from a parent node.
  * **Steps:**
    1.  Finds the `parent_node` in the database.
    2.  Creates a `new_branch` and links it to the `parent_node`.
    3.  Creates the `first_node` for the `new_branch`.
    4.  Adds the `new_branch` and `first_node` to the session and commits them to the database.

-----

## Setup and Installation

1.  **Clone the repository.**
2.  **Create a PostgreSQL database.**
3.  **Create a `.env` file** in the `backend` directory and add your `DATABASE_URL`:
    ```
    DATABASE_URL="postgresql://user:password@localhost/dbname"
    ```
4.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
5.  **Run the server:**
    ```bash
    uvicorn app.main:app --reload
    ```

-----

## Testing

Once the server is running, you can use the interactive API documentation to test the endpoints.

1.  **Open your browser** and go to [http://127.0.0.1:8000/docs](https://www.google.com/search?q=http://127.0.0.1:8000/docs).
2.  **Use the interface** to test each of the endpoints as described in the "API Endpoints" section.

-----

## Future Enhancements

  * **Add more agentic capabilities:** Implement features like summarizing branches, generating responses, or allowing multiple agents to interact with the graph.
  * **Implement a layout algorithm:** Automatically arrange the nodes in the graph for better visualization on the frontend.
  * **Add user authentication:** Secure the API and allow users to have their own private conversation graphs.
  * **Add WebSocket support:** Enable real-time updates between the frontend and backend.