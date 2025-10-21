#!/bin/bash
set -e

API="http://127.0.0.1:8000/api"
if command -v jq >/dev/null 2>&1; then
  JQ_CMD="jq ."
else
  echo "(jq not found; printing raw JSON)"
  JQ_CMD="cat"
fi
GRAPH_ID="test-graph"

echo "=== 0) Cleanup: start fresh ==="
curl -s -X DELETE ${API}/graphs/${GRAPH_ID} || true

echo "=== 1) Create/fetch graph ==="
curl -s ${API}/graphs/${GRAPH_ID} | ${JQ_CMD}

echo "=== 2) Create root node ==="
ROOT_NODE=$(curl -s -X POST ${API}/graphs/${GRAPH_ID}/root \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello Cactus, first node!","author":"user"}' | ${JQ_CMD})
echo "$ROOT_NODE"

if command -v jq >/dev/null 2>&1; then
  ROOT_NODE_ID=$(echo "$ROOT_NODE" | jq -r '.nodes | to_entries[0].value.id')
else
  ROOT_NODE_ID=$(echo "$ROOT_NODE" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1)
fi
echo "Root node id = $ROOT_NODE_ID"

echo "=== 3) Extend root branch ==="
EXTENDED=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/extend \
  -H "Content-Type: application/json" \
  -d '{"content":"Second message","author":"user"}' | ${JQ_CMD})
echo "$EXTENDED"

# Grab the new node id (best effort if jq present)
if command -v jq >/dev/null 2>&1; then
  EXT_NODE_ID=$(echo "$EXTENDED" | jq -r '.nodes | to_entries[-1].value.id')
else
  EXT_NODE_ID="(unknown without jq)"
fi
echo "Extended node id = $EXT_NODE_ID"

echo "=== 4) Branch off root node ==="
BRANCHED=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/branch \
  -H "Content-Type: application/json" \
  -d '{"label":"Exploration","initial_prompt":"Branching here"}' | ${JQ_CMD})
echo "$BRANCHED"

if command -v jq >/dev/null 2>&1; then
  BRANCH_NODE_ID=$(echo "$BRANCHED" | jq -r '.nodes | to_entries[-1].value.id')
else
  BRANCH_NODE_ID="(unknown without jq)"
fi
echo "Branch node id = $BRANCH_NODE_ID"

echo "=== 5) Delete Children of root node (keeps root, removes descendants) ==="
curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/delete-children | ${JQ_CMD}

echo "=== 6) Extend again so we can test delete-node ==="
EXTENDED2=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/extend \
  -H "Content-Type: application/json" \
  -d '{"content":"New extension after pruning","author":"user"}' | ${JQ_CMD})
echo "$EXTENDED2"

if command -v jq >/dev/null 2>&1; then
  NEW_NODE_ID=$(echo "$EXTENDED2" | jq -r '.nodes | to_entries[-1].value.id')
else
  NEW_NODE_ID="(unknown without jq)"
fi
echo "New node id = $NEW_NODE_ID"

echo "=== 7) Delete the new node and its descendants ==="
if [ "$NEW_NODE_ID" != "(unknown without jq)" ]; then
  curl -s -X POST ${API}/nodes/${NEW_NODE_ID}/delete | ${JQ_CMD}
fi

echo "=== 8) Extend again so we can test delete-extension ==="
EXTENDED3=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/extend \
  -H "Content-Type: application/json" \
  -d '{"content":"Extension for delete-extension test","author":"user"}' | ${JQ_CMD})
echo "$EXTENDED3"

if command -v jq >/dev/null 2>&1; then
  MID_NODE_ID=$(echo "$EXTENDED3" | jq -r '.nodes | to_entries[-1].value.id')
else
  MID_NODE_ID="(unknown without jq)"
fi
echo "Mid node id = $MID_NODE_ID"

echo "=== 9) Delete extension above mid node (keeps mid node, drops ancestors) ==="
if [ "$MID_NODE_ID" != "(unknown without jq)" ]; then
  curl -s -X POST ${API}/nodes/${MID_NODE_ID}/delete-extension | ${JQ_CMD}
fi

echo "=== 10) Final graph state ==="
curl -s ${API}/graphs/${GRAPH_ID} | ${JQ_CMD}
