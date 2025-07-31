# CLAUDE.md - Financial Assistant Hackathon Project

## Project Overview

A personal financial coach/assistant that allows users to input financial data via WhatsApp 
(receipts, voice notes, natural language) and provides AI-powered financial coaching through a web interface. Built for a one-week hackathon.

**Core Features:**
- WhatsApp integration for easy financial data input (text, images, voice)
- AI-powered chat interface with financial coaching
- Real-time sync between WhatsApp and web interfaces
- Automated receipt/transaction processing
- RAG-enhanced knowledge from financial influencers
- Modular AI agents for specific financial tasks

## Technology Stack

### Core Runtime & Framework
- **Backend**: Hono + Bun (TypeScript)
- **Frontend**: Vite + React + TypeScript (with SWC)
- **Monorepo**: Bun workspaces
- **Deployment**: Docker containers on Oracle Cloud VM

### Services & Infrastructure
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth with phone/OTP
- **File Storage**: Oracle Cloud Object Storage
- **AI/LLM**: Oracle Cloud Generative AI Service (via custom Vercel AI SDK provider)
- **WhatsApp**: Twilio API
- **Background Jobs**: BullMQ with Redis
- **Real-time**: Supabase Realtime

## Project Structure

```
financial-assistant/
├── apps/
│   ├── api/                    # Hono backend
│   │   ├── src/
│   │   │   ├── index.ts       # Main server entry
│   │   │   ├── routes/        # API endpoints
│   │   │   ├── services/      # Core business logic
│   │   │   │   ├── chat-service.ts
│   │   │   │   ├── agent-orchestrator.ts
│   │   │   │   ├── llm-processor.ts
│   │   │   │   └── rag-pipeline.ts
│   │   │   ├── agents/        # Individual agent implementations
│   │   │   └── workers/       # Background job definitions
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                   # React frontend
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── hooks/         # Custom hooks
│       │   ├── stores/        # Zustand stores
│       │   └── pages/         # Route pages
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── shared/               # Shared TypeScript types/utils
│   │   └── src/
│   │       └── providers/    # AI SDK providers
│   │           └── oci/      # Oracle Cloud AI provider
│   └── supabase/            # Database client & migrations
│
├── docker-compose.yml       # Local development
├── docker-compose.prod.yml  # Production deployment
└── package.json            # Root workspace config
```

## Custom OCI Provider for Vercel AI SDK

### Implementation Requirements

The custom provider must be created in `packages/shared/src/providers/oci/` and should:

1. **Implement the LanguageModelV1 interface** from `@ai-sdk/provider`
2. **Support both streaming and non-streaming responses**
3. **Handle OCI authentication** using the OCI SDK
4. **Support models**: `cohere.command` and `meta.llama-2-70b-chat`
5. **Map AI SDK tool calls** to prompt engineering (OCI doesn't have native function calling)
6. **Handle rate limiting and retries**

### Provider Structure

```typescript
// packages/shared/src/providers/oci/oci-provider.ts
import { createLanguageModel, LanguageModelV1 } from '@ai-sdk/provider'
import * as oci from 'oci-sdk'

export interface OCIProviderConfig {
  compartmentId: string
  region?: string
  authProvider?: oci.common.AuthenticationDetailsProvider
}

export function createOCI(config: OCIProviderConfig) {
  return new OCIProvider(config)
}

// packages/shared/src/providers/oci/models.ts
export function ociCommand(config: OCIProviderConfig) {
  return createOCIModel({
    ...config,
    modelId: 'cohere.command'
  })
}

export function ociLlama2(config: OCIProviderConfig) {
  return createOCIModel({
    ...config,
    modelId: 'meta.llama-2-70b-chat'
  })
}
```

### Tool Calling Strategy

Since OCI doesn't support native function calling, implement it via prompt engineering:

```typescript
// packages/shared/src/providers/oci/tool-handler.ts
export function formatToolsInPrompt(tools: Record<string, Tool>): string {
  return `
Available tools:
${Object.entries(tools).map(([name, tool]) => `
- ${name}: ${tool.description}
  Parameters: ${JSON.stringify(tool.parameters)}
`).join('\n')}

To use a tool, respond with:
<tool_call>
{"tool": "tool_name", "arguments": {...}}
</tool_call>
`
}

export function parseToolCalls(response: string): ToolCall[] {
  const regex = /<tool_call>(.*?)<\/tool_call>/gs
  const matches = [...response.matchAll(regex)]
  return matches.map(match => JSON.parse(match[1]))
}
```

## Architecture Components

### 1. API Gateway (Hono Server)
**Runs on**: Port 3000  
**Responsibilities**:
- Handle all HTTP requests from web app
- Receive Twilio webhooks for WhatsApp
- Serve API endpoints (`/api/*`)
- Queue background jobs to Redis
- Manage WebSocket connections for chat

### 2. Core Services (Inside Hono)
All core services run as TypeScript classes within the Hono process:

- **ChatService**: Orchestrates the entire chat flow using AI SDK
- **AgentOrchestrator**: Analyzes intent and coordinates agent execution
- **LLMProcessor**: Uses the custom OCI provider with Vercel AI SDK
- **RAGPipeline**: Handles embedding generation and vector search

### 3. LLM Processor with AI SDK

```typescript
// apps/api/src/services/llm-processor.ts
import { streamText } from 'ai'
import { createOCI } from '@financial-assistant/shared/providers/oci'

export class LLMProcessor {
  private model
  
  constructor() {
    this.model = createOCI({
      compartmentId: process.env.OCI_COMPARTMENT_ID!,
      region: process.env.OCI_REGION
    }).chat('cohere.command')
  }
  
  async generateResponse(
    messages: CoreMessage[],
    agents: Record<string, Agent>
  ): Promise<ReadableStream> {
    const result = await streamText({
      model: this.model,
      messages,
      tools: agents,
      toolChoice: 'auto'
    })
    
    return result.toAIStream()
  }
}
```

### 4. AI Agents (Inside Hono)
Agents are now compatible with Vercel AI SDK tools:

```typescript
// apps/api/src/agents/balance-agent.ts
import { tool } from 'ai'
import { z } from 'zod'

export const balanceAgent = tool({
  description: 'Check user account balance and recent transactions',
  parameters: z.object({
    timeframe: z.enum(['current', 'this_month', 'last_month']).optional()
  }),
  execute: async ({ timeframe }, { userId }) => {
    const transactions = await getTransactions(userId, timeframe)
    return {
      balance: calculateBalance(transactions),
      breakdown: categorizeTransactions(transactions)
    }
  }
})
```

### 5. Background Workers (Separate Container)
BullMQ workers run 24/7 in a separate process:

- **MessageProcessor**: Handles async WhatsApp processing
- **ReceiptExtractor**: OCR via Oracle Vision API
- **VideoScraper**: Downloads and transcribes financial content
- **TransactionAnalyzer**: Periodic spending analysis

### 6. Frontend (React + Vite)
- Served by Nginx on port 80
- Real-time updates via Supabase Realtime
- Streaming chat responses
- Mobile-first responsive design

## Key Data Flows

### Chat Flow with AI SDK
```
1. User message received
2. ChatService calls streamText with OCI model
3. AI SDK handles tool orchestration automatically
4. If tools are called, AI SDK executes them
5. Results are fed back to the model
6. Final response streams to user
7. Conversation saved to database
```

### WhatsApp Message Flow
```
1. User sends WhatsApp message/image
2. Twilio webhook → Hono API
3. Hono adds job to Redis queue (returns immediately)
4. Worker picks up job
5. Worker processes (OCR, transcription, etc.)
6. Worker saves to database
7. Worker sends response via Twilio
8. If web app is open, real-time update via WebSocket
```

## Database Schema (Key Tables)

```sql
-- Note: embeddings are vector(1024) for Cohere instead of vector(1536)
knowledge_base (id, content, embedding::vector(1024), source)

-- Other tables remain the same
conversations (id, user_id, created_at)
messages (id, conversation_id, role, content, source, metadata)
transactions (id, user_id, amount, category, date, receipt_url)
financial_goals (id, user_id, target_amount, current_amount)
user_profiles (id, phone_number, monthly_income, preferences)
agent_results (id, user_id, agent_name, results, timestamp)
```

## Development Workflow

### Local Development
```bash
# Install dependencies
bun install

# Start all services locally
docker-compose up -d  # Redis + Supabase local
bun run dev          # Starts both API and web

# Run only API
bun run dev:api

# Run only frontend
bun run dev:web

# Test OCI provider
bun test packages/shared/src/providers/oci
```

### Environment Variables
```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Oracle Cloud
OCI_TENANCY_ID=
OCI_USER_ID=
OCI_FINGERPRINT=
OCI_PRIVATE_KEY_PATH=
OCI_REGION=
OCI_COMPARTMENT_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Redis
REDIS_URL=redis://localhost:6379

# AI Model Selection
AI_MODEL=cohere.command  # or meta.llama-2-70b-chat
```

## Implementation Priority

### Day 1: OCI Provider Development
1. Create basic OCI provider structure
2. Implement streaming support
3. Add tool calling via prompt engineering
4. Write tests for the provider

### Day 2-3: Core Infrastructure
1. Set up auth and database
2. Create basic chat interface
3. Integrate OCI provider with chat service

### Day 4-5: Features
1. WhatsApp integration
2. Agent implementation
3. Receipt processing

### Day 6: RAG & Polish
1. Implement RAG pipeline with OCI embeddings
2. Add video scraping
3. UI improvements

### Day 7: Testing & Deployment
1. End-to-end testing
2. Deploy to Oracle Cloud
3. Demo preparation

## Oracle Cloud Services Integration

### OCI Generative AI (via custom AI SDK provider)
```typescript
// Using the provider
import { streamText } from 'ai'
import { ociCommand } from '@financial-assistant/shared/providers/oci'

const result = await streamText({
  model: ociCommand({
    compartmentId: process.env.OCI_COMPARTMENT_ID!
  }),
  messages: conversation,
  tools: {
    checkBalance: balanceAgent,
    analyzeBudget: budgetAgent,
    planGoal: goalPlannerAgent
  }
})
```

### OCI Vision for OCR
```typescript
const visionClient = new oci.aivision.AIServiceVisionClient({...})
const analyzeResult = await visionClient.analyzeDocument({
  features: [{
    featureType: 'DOCUMENT_TEXT_DETECTION'
  }],
  document: {
    source: 'OBJECT_STORAGE',
    namespaceName: namespace,
    bucketName: bucket,
    objectName: objectKey
  }
})
```

### OCI Speech for Transcription
```typescript
const speechClient = new oci.aispeech.AIServiceSpeechClient({...})
const transcriptionJob = await speechClient.createTranscriptionJob({
  inputLocation: {
    locationType: 'OBJECT_LIST',
    objectLocations: [{
      namespaceName: namespace,
      bucketName: bucket,
      objectNames: [audioFile]
    }]
  }
})
```

## Testing the OCI Provider

```typescript
// packages/shared/src/providers/oci/__tests__/oci-provider.test.ts
import { createOCI } from '../oci-provider'
import { streamText } from 'ai'

describe('OCI Provider', () => {
  it('should stream text responses', async () => {
    const model = createOCI({
      compartmentId: 'test-compartment'
    }).chat('cohere.command')
    
    const result = await streamText({
      model,
      messages: [{ role: 'user', content: 'Hello' }]
    })
    
    const chunks = []
    for await (const chunk of result.textStream) {
      chunks.push(chunk)
    }
    
    expect(chunks.length).toBeGreaterThan(0)
  })
  
  it('should handle tool calls', async () => {
    // Test tool calling implementation
  })
})
```

## Key Benefits of AI SDK Integration

1. **Provider Flexibility**: Easy switching between Cohere Command and Llama 2
2. **Standardized Tool Calling**: Agents work identically across providers
3. **Built-in Streaming**: Consistent streaming API
4. **Error Handling**: AI SDK handles retries and errors
5. **Future Proof**: Easy to add OpenAI/Anthropic later

Remember: The custom OCI provider is the key to leveraging Oracle Cloud credits while maintaining the excellent DX of Vercel AI SDK. Focus on getting this working early in the hackathon!