import { useRef, useEffect } from 'react';
import './GraphCanvas.css';
import { SerializableGraphState } from '../../types';

interface GraphCanvasProps {
  graphState: SerializableGraphState | null;
  onUpdateGraph?: (state: SerializableGraphState) => void;
  egoNodeId: number | null;
  setEgoNodeId: (id: number | null) => void;
}

export default function GraphCanvas({ graphState, onUpdateGraph, egoNodeId, setEgoNodeId }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!graphState) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No graph state yet', 400, 300);
      return;
    }

    // Draw nodes
    const NODE_SPACING = 100;
    const START_X = 400;
    const START_Y = 100;

    Object.values(graphState.nodes).forEach((node, index) => {
      const x = START_X;
      const y = START_Y + (index * NODE_SPACING);
      
      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = node.id === egoNodeId ? '#f59e0b' : (node.isHead ? '#4ade80' : '#6b7280');
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw node text
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Node ${node.id}`, x, y + 4);
    });

    // Draw connections between nodes
    Object.values(graphState.branches).forEach(branch => {
      if (branch.nodeIds.length > 1) {
        ctx.strokeStyle = branch.color || '#6b7280';
        ctx.lineWidth = 3;
        
        for (let i = 0; i < branch.nodeIds.length - 1; i++) {
          const node1 = branch.nodeIds[i];
          const node2 = branch.nodeIds[i + 1];
          const node1Data = graphState.nodes[node1];
          const node2Data = graphState.nodes[node2];
          
          if (node1Data && node2Data) {
            const y1 = START_Y + (branch.nodeIds.indexOf(node1) * NODE_SPACING);
            const y2 = START_Y + (branch.nodeIds.indexOf(node2) * NODE_SPACING);
            
            ctx.beginPath();
            ctx.moveTo(START_X, y1 + 20);
            ctx.lineTo(START_X, y2 - 20);
            ctx.stroke();
          }
        }
      }
    });

  }, [graphState, egoNodeId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ 
          width: '100%', 
          height: '100%', 
          border: '1px solid #333',
          background: '#1a1a1a'
        }}
      />
    </div>
  );
}