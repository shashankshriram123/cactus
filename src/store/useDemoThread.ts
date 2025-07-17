// src/store/useDemoThread.ts
import { useState } from 'react';
import { demoCommits } from '../data/demoThread';
import type { Commit } from '../models/thread';
import { branchOf } from '../models/thread';

export function useDemoThread() {
  const [commits, setCommits] = useState<Commit[]>(demoCommits);

  /* add commit on SAME branch */
  function addCommit(parentId: string) {
    const branch = branchOf(parentId, commits);
    const id = crypto.randomUUID().slice(0, 6);
    setCommits((prev) => [
      ...prev,
      { id, msg: '', parentIds: [parentId], branch },
    ]);
  }

  /* spawn a NEW branch from parentId */
  function addBranch(parentId: string) {
    const nextBranch = Math.max(...commits.map((c) => c.branch)) + 1;
    const id = crypto.randomUUID().slice(0, 6);
    setCommits((prev) => [
      ...prev,
      { id, msg: '', parentIds: [parentId], branch: nextBranch },
    ]);
  }

  return { commits, addCommit, addBranch };
}
