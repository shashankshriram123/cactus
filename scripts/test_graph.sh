#!/bin/bash
set -e

API="http://127.0.0.1:8000/api"
GRAPH_ID="test-graph"

echo "=== 0) Cleanup: start fresh ==="
curl -s -X DELETE ${API}/graphs/${GRAPH_ID} || true

echo "=== 1) Create/fetch graph ==="
curl -s ${API}/graphs/${GRAPH_ID} | jq .

echo "=== 2) Create root node ==="
ROOT_NODE=$(curl -s -X POST ${API}/graphs/${GRAPH_ID}/root \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello Cactus, first node!","author":"user"}' | jq .)
echo "$ROOT_NODE"

ROOT_NODE_ID=$(echo "$ROOT_NODE" | jq '.nodes | to_entries[0].value.id')
echo "Root node id = $ROOT_NODE_ID"

echo "=== 3) Extend root branch ==="
EXTENDED=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/extend \
  -H "Content-Type: application/json" \
  -d '{"content":"Second message","author":"user"}' | jq .)
echo "$EXTENDED"

# Grab the new node id
EXT_NODE_ID=$(echo "$EXTENDED" | jq '.nodes | to_entries[-1].value.id')
echo "Extended node id = $EXT_NODE_ID"

echo "=== 4) Branch off root node ==="
BRANCHED=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/branch \
  -H "Content-Type: application/json" \
  -d '{"label":"Exploration","initial_prompt":"Branching here"}' | jq .)
echo "$BRANCHED"

BRANCH_NODE_ID=$(echo "$BRANCHED" | jq '.nodes | to_entries[-1].value.id')
echo "Branch node id = $BRANCH_NODE_ID"

echo "=== 5) Delete Children of root node (keeps root, removes descendants) ==="
curl -s -X DELETE ${API}/nodes/${ROOT_NODE_ID}/delete-children | jq .

echo "=== 6) Extend again so we can test delete-node ==="
EXTENDED2=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/extend \
  -H "Content-Type: application/json" \
  -d '{"content":"New extension after pruning","author":"user"}' | jq .)
echo "$EXTENDED2"

NEW_NODE_ID=$(echo "$EXTENDED2" | jq '.nodes | to_entries[-1].value.id')
echo "New node id = $NEW_NODE_ID"

echo "=== 7) Delete the new node and its descendants ==="
curl -s -X DELETE ${API}/nodes/${NEW_NODE_ID}/delete-node | jq .

echo "=== 8) Extend again so we can test delete-extension ==="
EXTENDED3=$(curl -s -X POST ${API}/nodes/${ROOT_NODE_ID}/extend \
  -H "Content-Type: application/json" \
  -d '{"content":"Extension for delete-extension test","author":"user"}' | jq .)
echo "$EXTENDED3"

MID_NODE_ID=$(echo "$EXTENDED3" | jq '.nodes | to_entries[-1].value.id')
echo "Mid node id = $MID_NODE_ID"

echo "=== 9) Delete extension above mid node (keeps mid node, drops ancestors) ==="
curl -s -X DELETE ${API}/nodes/${MID_NODE_ID}/delete-extension | jq .

echo "=== 10) Final graph state ==="
curl -s ${API}/graphs/${GRAPH_ID} | jq .
