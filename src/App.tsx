import React from 'react';
import ControlTreeGraph from './components/ControlTreeGraph';
import './index.css';


function App() {
  return (
    // Render the component directly, without wrapping it in other divs
    // that might have padding, margins, or max-widths.
    <ControlTreeGraph />
  );
}

export default App;
