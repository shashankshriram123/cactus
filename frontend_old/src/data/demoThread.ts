// src/data/demoThread.ts
import type { Commit } from '../models/thread';

/* Gold trunk, teal branch, blue branch */
export const demoCommits: Commit[] = [
  { id: 'a', msg: 'Init',  parentIds: [],    branch: 0 },
  { id: 'b', msg: 'Feat',  parentIds: ['a'], branch: 0 },
  { id: 'c', msg: 'Fix',   parentIds: ['b'], branch: 0 },

  { id: 'd', msg: '',      parentIds: ['a'], branch: 1 },
  { id: 'e', msg: '',      parentIds: ['d'], branch: 1 },

  { id: 'f', msg: '',      parentIds: ['b'], branch: 2 },
  { id: 'g', msg: '',      parentIds: ['f'], branch: 2 },
  { id: 'h', msg: '',      parentIds: ['g'], branch: 0 },
];
