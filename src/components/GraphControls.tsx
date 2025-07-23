import React from 'react';
import type { GraphApi } from './ControlTreeGraph';
import './GraphControls.css';

interface GraphControlsProps {
  graphApiRef: React.RefObject<GraphApi>;
  buttonStates: Record<string, boolean>;
  activeGraph: boolean;
}

export const GraphControls: React.FC<GraphControlsProps> = ({ graphApiRef, buttonStates, activeGraph }) => {
  if (!activeGraph) {
    return null; // Don't render controls if no graph is active
  }

  const callCanvasFunc = (funcName: keyof GraphApi) => {
    if (graphApiRef.current && typeof graphApiRef.current[funcName] === 'function') {
      // @ts-ignore
      graphApiRef.current[funcName]();
    }
  };

  return (
    <div className="controls-overlay">
      <button onClick={() => callCanvasFunc('createSubBranch')} disabled={buttonStates.create} className="btn">Create Sub-Branch</button>
      <button onClick={() => callCanvasFunc('expandBranch')} disabled={buttonStates.expand} className="btn">Expand Head</button>
      <button onClick={() => callCanvasFunc('collapseSelected')} disabled={buttonStates.collapse} className="btn">Collapse Extension</button>
      <button onClick={() => callCanvasFunc('foldSelected')} disabled={buttonStates.fold} className="btn">Fold Children</button>
      <button onClick={() => callCanvasFunc('unfoldSelected')} disabled={buttonStates.unfold} className="btn">Unfold</button>
      <button onClick={() => callCanvasFunc('deleteSelectedNode')} disabled={buttonStates.deleteNode} className="btn-danger">Delete Node</button>
      <button onClick={() => callCanvasFunc('deleteSelectedExtension')} disabled={buttonStates.deleteExtension} className="btn-danger">Delete Extension</button>
      <button onClick={() => callCanvasFunc('deleteSelectedChildren')} disabled={buttonStates.deleteChildren} className="btn-danger">Delete Children</button>
    </div>
  );
};
