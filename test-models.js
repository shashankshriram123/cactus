// Quick test of model selection
import { selectOptimalModel, BEDROCK_MODELS } from './src/services/bedrock.js';

console.log('🧪 Testing Model Selection Logic\n');

const testCases = [
  { query: "Write a JavaScript function to reverse a string", expected: "claude-3-5-sonnet" },
  { query: "What is the weather like?", expected: "claude-3-haiku" },
  { query: "Analyze our quarterly business performance", expected: "titan-text-express" },
  { query: "Tell me about artificial intelligence", expected: "claude-3-sonnet" },
  { query: "Quick summary of this document", expected: "claude-3-haiku" },
  { query: "Debug this complex algorithm with multiple edge cases", expected: "claude-3-5-sonnet" }
];

testCases.forEach(({ query, expected }, i) => {
  const selected = selectOptimalModel(query);
  const isCorrect = selected === expected;
  const status = isCorrect ? '✅' : '❌';
  
  console.log(`${status} Test ${i + 1}:`);
  console.log(`   Query: "${query}"`);
  console.log(`   Expected: ${BEDROCK_MODELS[expected]?.name}`);
  console.log(`   Selected: ${BEDROCK_MODELS[selected]?.name}`);
  console.log('');
});

console.log('🚀 All models available:');
Object.entries(BEDROCK_MODELS).forEach(([key, model]) => {
  console.log(`   ${key}: ${model.name} (${model.id})`);
});
