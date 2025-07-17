// src/models/thread.ts
/** One commit (node) in the timeline. */
export interface Commit {
  id: string;            // “hash”
  msg: string;           // commit message (empty ⇒ hollow circle)
  parentIds: string[];   // empty for root, >1 for merge
  branch: number;        // 0 = trunk, 1..N = branch lanes
}

/** Helper: find a commit’s branch index */
export function branchOf(id: string, commits: Commit[]) {
  return commits.find((c) => c.id === id)?.branch ?? 0;
}
