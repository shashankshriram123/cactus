import os
import sys
from fastapi.testclient import TestClient

# Ensure the backend package (app/) is importable regardless of cwd
CURRENT_DIR = os.path.dirname(__file__)
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.main import app


def pick_root_head_node(graph: dict) -> int | None:
    branches = list(graph.get("branches", {}).values())
    root = next((b for b in branches if b.get("parentNodeId") is None), None)
    if not root:
        return None
    nodes = graph.get("nodes", {})
    # Prefer a node flagged as head; fallback to last in branch
    for nid in root.get("nodeIds", [])[::-1]:
        n = nodes.get(str(nid)) or nodes.get(nid)
        if n and n.get("isHead"):
            return nid
    if root.get("nodeIds"):
        return root["nodeIds"][-1]
    return None


def pretty(ok: bool) -> str:
    return "PASS" if ok else "FAIL"


def run():
    client = TestClient(app)
    gid = "smoke-test-graph"
    all_ok = True

    # 1) Fetch-or-create graph
    r = client.get(f"/api/graphs/{gid}")
    ok = r.status_code == 200 and r.json().get("id") == gid
    print(f"1) GET /graphs -> {pretty(ok)}")
    all_ok &= ok

    # 2) Create root node (idempotent)
    r = client.post(
        f"/api/graphs/{gid}/root",
        json={"content": "Hello root", "author": "user"},
    )
    j = r.json()
    root_head = pick_root_head_node(j)
    ok = r.status_code == 200 and root_head is not None
    print(f"2) POST /graphs/{{id}}/root -> {pretty(ok)} (root_head={root_head})")
    all_ok &= ok

    # 3) Extend root branch
    r = client.post(
        f"/api/nodes/{root_head}/extend",
        json={"content": "Second", "author": "user"},
    )
    j = r.json()
    new_head = pick_root_head_node(j)
    ok = r.status_code == 200 and new_head is not None and new_head != root_head
    print(f"3) POST /nodes/{{root}}/extend -> {pretty(ok)} (new_head={new_head})")
    all_ok &= ok

    # 4) Create sub-branch off original root node
    r = client.post(
        f"/api/nodes/{root_head}/branch",
        json={"label": "Exploration", "initial_prompt": "Fork here"},
    )
    j = r.json()
    branches = list(j.get("branches", {}).values())
    sub = [b for b in branches if b.get("parentNodeId") == root_head]
    ok = r.status_code == 200 and len(sub) == 1 and len(sub[0].get("nodeIds", [])) == 1
    print(f"4) POST /nodes/{{root}}/branch -> {pretty(ok)} (new_branch_id={sub[0]['id'] if sub else None})")
    all_ok &= ok

    # 5) Delete children of root (removes sub-branches)
    r = client.post(f"/api/nodes/{root_head}/delete-children")
    j = r.json()
    branches = list(j.get("branches", {}).values())
    sub_after = [b for b in branches if b.get("parentNodeId") == root_head]
    ok = r.status_code == 200 and len(sub_after) == 0
    print(f"5) POST /nodes/{{root}}/delete-children -> {pretty(ok)}")
    all_ok &= ok

    # 6) Extend again to create a mid node
    r = client.post(
        f"/api/nodes/{root_head}/extend",
        json={"content": "Third", "author": "user"},
    )
    j = r.json()
    mid = pick_root_head_node(j)  # head after extend
    ok = r.status_code == 200 and mid is not None and mid != root_head
    print(f"6) Extend again -> {pretty(ok)} (mid={mid})")
    all_ok &= ok

    # 7) Delete extension above mid (keeps mid only)
    r = client.post(f"/api/nodes/{mid}/delete-extension")
    j = r.json()
    branches = list(j.get("branches", {}).values())
    root_branch = next((b for b in branches if b.get("parentNodeId") is None), None)
    ok = r.status_code == 200 and root_branch and root_branch.get("nodeIds") == [mid]
    print(f"7) POST /nodes/{{mid}}/delete-extension -> {pretty(ok)}")
    all_ok &= ok

    # 8) Delete entire graph
    r = client.delete(f"/api/graphs/{gid}")
    ok = r.status_code == 204
    print(f"8) DELETE /graphs/{{id}} -> {pretty(ok)}")
    all_ok &= ok

    print("\nOverall:", pretty(all_ok))
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(run())
