import { useState } from "react";
import { cactusApi } from "../api/cactusApi";
import type { SerializableGraphState } from "../types";

export function useGraphManager() {
  const [graphs, setGraphs] = useState<SerializableGraphState[]>([]);
  const [activeGraphId, setActiveGraphId] = useState<string | null>(null);
  const [egoNodeId, setEgoNodeId] = useState<number | null>(null);

  const activeGraph = graphs.find((g) => g.id === activeGraphId) ?? null;
  console.log('useGraphManager: activeGraph updated:', activeGraph?.id, 'nodes:', Object.keys(activeGraph?.nodes || {}).length);

  function newGraph() {
    const id = crypto.randomUUID();
    const empty: SerializableGraphState = {
      id,
      name: `Untitled ${graphs.length + 1}`,
      camera: { x: 150, y: 300, scale: 1 },
      nodes: {},
      branches: {},
      branchOrder: [],
      nextNodeId: 1,
      nextBranchId: 1,
      nextColorIndex: 0,
    };
    setGraphs((prev) => [...prev, empty]);
    setActiveGraphId(id);
    return empty;
  }

  function selectGraph(id: string) {
    setActiveGraphId(id);
  }

  async function sendMessage(content: string, author: string) {
    console.log('useGraphManager: sendMessage called with:', content, author);
    let g = activeGraph;

    if (!g && activeGraphId) {
      g = graphs.find((gr) => gr.id === activeGraphId) ?? null;
    }

    if (!g) {
      if (graphs.length === 0) {
        g = newGraph(); // First ever message → create root graph
      } else {
        throw new Error("No active graph selected");
      }
    }

    const hasRoot = Object.values(g.branches ?? {}).some(
      (b: any) => b.parentNodeId === null
    );

    let serverState: SerializableGraphState;

    if (!hasRoot) {
      // First node = root
      serverState = await cactusApi.createRoot(g.id, content, author);
      const newNodeId = serverState.nextNodeId - 1;
      setEgoNodeId(newNodeId);
      setGraphs((prev) => prev.map((x) => (x.id === g!.id ? serverState : x)));
      setActiveGraphId(g!.id);
      return serverState;
    }

    if (!egoNodeId) {
      throw new Error("No ego node set");
    }

    // --- Optimistic update ---
    const tempId = Date.now();
    const optimisticGraph: SerializableGraphState = {
      ...g,
      nodes: {
        ...g.nodes,
        [tempId]: {
          id: tempId,
          x: g.nodes[String(egoNodeId)].x,
          y: g.nodes[String(egoNodeId)].y - 60, // place above ego visually
          isHead: true,
        },
      },
      branches: {
        ...g.branches,
        // find branch containing ego
        ...Object.fromEntries(
          Object.entries(g.branches).map(([bid, branch]) => {
            if ((branch as any).nodeIds.includes(egoNodeId)) {
              return [
                bid,
                {
                  ...branch,
                  nodeIds: [...branch.nodeIds, tempId],
                },
              ];
            }
            return [bid, branch];
          })
        ),
      },
    };

    setGraphs((prev) => prev.map((x) => (x.id === g!.id ? optimisticGraph : x)));
    setEgoNodeId(tempId);

    // --- Real server update ---
    serverState = await cactusApi.extendNode(egoNodeId, content, author);

    const newNodeId = serverState.nextNodeId - 1;
    setEgoNodeId(newNodeId);

    // Replace optimistic with canonical server state
    setGraphs((prev) => prev.map((x) => (x.id === g!.id ? serverState : x)));
    setActiveGraphId(g!.id);

    return serverState;
  }

  return {
    graphs,
    activeGraph,
    egoNodeId,
    setEgoNodeId,
    newGraph,
    selectGraph,
    sendMessage,
    setGraphs,
    setActiveGraphId,
  };
}
