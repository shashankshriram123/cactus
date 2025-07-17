// src/constants/lanes.ts
export const TRUNK_COLOR = '#f7b42c';                 // gold
export const BRANCH_COLORS = ['#21d0c3', '#3274d9'];   // teal, blue, …extend as needed

/** Convenience helper */
export const colorForBranch = (branch: number) =>
  branch === 0 ? TRUNK_COLOR : BRANCH_COLORS[(branch - 1) % BRANCH_COLORS.length];
