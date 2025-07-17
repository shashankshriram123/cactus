// GitTree.tsx
import React from 'react';

interface PositionedNode {
  id: string;
  name: string;
  x: number;
  y: number;
  children: PositionedNode[];
}

interface GitTreeProps {
  nodes: PositionedNode[];
}

const GitTree: React.FC<GitTreeProps> = ({ nodes }) => {
  return (
    <div className="relative w-full h-[800px] bg-black">
      <svg className="absolute top-0 left-0 w-full h-full">
        {nodes.map((node) =>
          node.children.map((child) => (
            <line
              key={`${node.id}-${child.id}`}
              x1={node.x + 20}
              y1={node.y + 20}
              x2={child.x + 20}
              y2={child.y + 20}
              stroke="#888"
              strokeWidth={2}
            />
          ))
        )}
      </svg>
      {nodes.map((node) => (
        <div
          key={node.id}
          className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white text-sm"
          style={{ left: node.x, top: node.y }}
        >
          +
        </div>
      ))}
    </div>
  );
};

export default GitTree;
