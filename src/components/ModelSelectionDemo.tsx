// Demo component to test model selection logic
import { selectOptimalModel, BEDROCK_MODELS } from '../services/bedrock';

export const ModelSelectionDemo = () => {
  const testQueries = [
    "Write a JavaScript function to sort an array",
    "What is photosynthesis?", 
    "Analyze the quarterly sales data and provide insights",
    "Debug this Python code that's throwing an error",
    "Create a business plan for a startup",
    "Quick summary of machine learning",
    "Simple question about weather",
    "Complex algorithm optimization problem"
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>🤖 Model Selection Demo</h3>
      <p>This shows which model would be automatically selected for different types of queries:</p>
      
      {testQueries.map((query, i) => {
        const selectedModel = selectOptimalModel(query);
        const modelInfo = BEDROCK_MODELS[selectedModel];
        
        return (
          <div key={i} style={{ 
            margin: '10px 0', 
            padding: '10px', 
            background: '#f5f5f5', 
            borderLeft: '4px solid #3b82f6' 
          }}>
            <div><strong>Query:</strong> "{query}"</div>
            <div><strong>Selected Model:</strong> {modelInfo.name}</div>
            <div><strong>Reason:</strong> {modelInfo.description}</div>
          </div>
        );
      })}
    </div>
  );
};

// Usage: Add this to your App.tsx temporarily to test
// <ModelSelectionDemo />
