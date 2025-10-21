// Layout worker runs off-thread to compute graph node positions

const COLUMN_SPACING = 200;  // Horizontal spacing between branches
const ROW_SPACING = 80;      // Vertical spacing between nodes in a branch
const BASE_X = 400;          // Center X position for root
const BASE_Y = 600;          // Bottom Y position (graph grows upward)

type Branch = {
  id: number;
  nodeIds: number[];
  parentNodeId?: number | null;
};

type LayoutMessage = {
  branches: Record<string, Branch>;
};

type Position = { x: number; y: number };

// result store
let posByNodeId: Record<number, Position> = {};
// track occupied vertical spans per column
let spans: { min: number; max: number; x: number }[] = [];

function placeBranch(
  branch: Branch,
  depth: number,
  extraX: number,
  anchorY: number
) {
  // For root branches, center them
  let x = BASE_X + extraX;
  
  // For sub-branches, position them to the side
  if (depth > 0) {
    x = BASE_X + (depth * COLUMN_SPACING) + extraX;
  }

  // --- collision detection and horizontal adjustment ---
  const overlaps = spans.filter(
    (s) => Math.abs(s.x - x) < COLUMN_SPACING / 2 && 
          !(anchorY < s.min - ROW_SPACING || anchorY > s.max + ROW_SPACING)
  );
  
  if (overlaps.length > 0) {
    // Find the rightmost occupied position and move further right
    const rightmost = Math.max(...overlaps.map((s) => s.x));
    x = rightmost + COLUMN_SPACING;
  }

  const nodeIds = branch.nodeIds ?? [];
  const baseY = anchorY;

  // Place nodes in this branch, growing upward from the base
  nodeIds.forEach((nid, i) => {
    posByNodeId[nid] = { x, y: baseY - i * ROW_SPACING };
  });

  // Track the vertical span of this branch for collision detection
  if (nodeIds.length > 0) {
    const topY = baseY - (nodeIds.length - 1) * ROW_SPACING;
    spans.push({ min: topY, max: baseY, x });
  }

  // Find and place child branches (sub-branches) to the side
  // Child branches are those whose parentNodeId matches any node in this branch
  const childBranches = Object.values(branches).filter(
    (childBranch) => childBranch.parentNodeId && nodeIds.includes(childBranch.parentNodeId)
  );
  
  console.log(`Branch ${branch.id} has ${childBranches.length} child branches:`, childBranches);
  
  if (childBranches.length > 0) {
    childBranches.forEach((childBranch, idx) => {
      // Position sub-branches to the side, alternating left/right
      const sideOffset = (idx % 2 === 0 ? 1 : -1) * COLUMN_SPACING * (Math.floor(idx / 2) + 1);
      const childExtraX = sideOffset;
      
      // Use the top of the current branch as anchor for sub-branches
      const subBranchAnchorY = nodeIds.length > 0 ? baseY - (nodeIds.length - 1) * ROW_SPACING : baseY;
      
      placeBranch(childBranch, depth + 1, extraX + childExtraX, subBranchAnchorY);
    });
  }
}

// branches cache
let branches: Record<string, Branch> = {};

onmessage = function (e: MessageEvent<LayoutMessage>) {
  d
  branches = e.data.branches ?? {};
  posByNodeId = {};
  spans = [];

  console.log("Layout worker received branches:", branches);
  console.log("Branch structure:");
  Object.values(branches).forEach((branch) => {
    console.log(`  Branch ${branch.id}: parentNodeId=${branch.parentNodeId}, nodeIds=[${branch.nodeIds.join(',')}]`);
  });

  // Start with root branches (those without parentNodeId)
  Object.values(branches).forEach((branch) => {
    if (!branch.parentNodeId) {
      console.log("Placing root branch:", branch);
      placeBranch(branch, 0, 0, BASE_Y);
    }
  });

  console.log("Layout worker computed positions:", posByNodeId);

  // return computed positions
  postMessage({ posByNodeId });
};