# AWS Bedrock Setup for Cactus

## Prerequisites
1. AWS Account with Bedrock access
2. AWS credentials configured
3. Bedrock models enabled in your AWS region

## Setup Instructions

### 1. Enable Bedrock Models
Go to AWS Bedrock console and enable these models:
- Claude 3.5 Sonnet
- Claude 3 Haiku  
- Claude 3 Sonnet
- Titan Text Express

**Note**: Avoid models that require inference profiles (like Llama 3.2 90B) unless you have them configured.

### 2. Configure AWS Credentials

Create a `.env` file in the project root:

```env
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_access_key_here
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### 3. Alternative: AWS IAM Roles
For production, use IAM roles instead of hardcoded credentials.

## Model Selection Logic

The app automatically selects the optimal model based on query characteristics:

- **Claude 3.5 Sonnet**: Complex reasoning, analysis, coding tasks
- **Claude 3 Haiku**: Simple queries, quick responses  
- **Claude 3 Sonnet**: General conversation, balanced performance
- **Titan Text Express**: Enterprise/business use cases, fast responses

## Features

- ✅ Automatic model selection based on query analysis
- ✅ Manual model override option
- ✅ Real-time model switching indicator
- ✅ Message history with model attribution
- ✅ Loading states and error handling
- ✅ **200-character response limit** for concise answers

## Usage

1. Type your message in the chat input
2. Toggle the ⚡ button to enable/disable auto-selection
3. View which model was used for each response
4. Manually select a specific model if needed

## Cost Optimization

The auto-selection prioritizes:
- Faster/cheaper models for simple queries
- More powerful models only when needed
- Model strengths matching query type
- **Short responses** (200 char limit) to minimize token usage and costs
