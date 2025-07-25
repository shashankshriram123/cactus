import React from 'react';
import type { GraphApi } from './ControlTreeGraph';
import './GraphControls.css';

interface GraphControlsProps {
  graphApiRef: React.RefObject<GraphApi | null>;
  buttonStates: Record<string, boolean>;
  activeGraph: boolean;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  graphApiRef, buttonStates, activeGraph,
}) => {
  if (!activeGraph) return null;

  const call = (fn: keyof GraphApi) =>
    graphApiRef.current && (graphApiRef.current[fn] as () => void)();

  return (
    <div className="graph-controls-container">
      <button onClick={() => call('createSubBranch')} disabled={buttonStates.create}>Create Sub-Branch</button>
      <button onClick={() => call('expandBranch')}    disabled={buttonStates.expand}>Expand Head</button>
      <button onClick={() => call('collapseSelected')}disabled={buttonStates.collapse}>Collapse Extension</button>
      <button onClick={() => call('foldSelected')}    disabled={buttonStates.fold}>Fold Children</button>
      <button onClick={() => call('unfoldSelected')}  disabled={buttonStates.unfold}>Unfold</button>

      <button className="danger" onClick={() => call('deleteSelectedNode')}      disabled={buttonStates.deleteNode}>Delete Node</button>
      <button className="danger" onClick={() => call('deleteSelectedExtension')} disabled={buttonStates.deleteExtension}>Delete Extension</button>
      <button className="danger" onClick={() => call('deleteSelectedChildren')}  disabled={buttonStates.deleteChildren}>Delete Children</button>
    </div>
  );
};
