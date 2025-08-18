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
- add to memory all the relevant updates from this last tasks
- This session is being continued from a previous conversation that ran out of context. The conversation is summarized below:
  Analysis:
  Analyzing the conversation chronologically:

  1. **Initial Request**: User wanted to fix errors classifying "expenses" vs "incomes" and implement full PDF to base64 conversion for OpenAI Vision API. They also 
  wanted to separate processing flows for expense vs income documents.

  2. **First Major Fix**: I addressed Redis eviction policy issues and enhanced error logging for OCI Document AI failures.

  3. **PDF Conversion Implementation**: I installed pdf2pic, added GraphicsMagick and Ghostscript dependencies to Docker, and created a comprehensive PDF to base64 
  conversion system with fallback mechanisms.

  4. **Document Type Classification**: I created a new service to classify documents as EXPENSE or INCOME before main processing, using OpenAI Vision API.

  5. **Split Processing Flows**: I implemented separate processing paths for expense vs income documents with specialized categorization logic.

  6. **Category Enhancement**: User requested more specific categories like "electronics", "food" etc. instead of generic "compras". I updated the classification to 
  return subcategories as main categories.

  7. **Configuration Fixes**: I removed outputLocation from OCI requests, fixed document type mapping (added "boleta" -> "RECEIPT"), and enhanced error logging.

  8. **Recent Issue**: User reported that PDF processing works but JPEG images fail with OpenAI Vision API schema validation errors. The error shows "No object 
  generated: response did not match schema" for the VisionAnalysisSchema.

  Key technical patterns include:
  - Multi-layered fallback systems (pdf2pic -> pdf-poppler -> enhanced LLM)
  - Comprehensive error logging with OCI SDK specific details
  - Schema validation improvements with default values and better constraints
  - Parallel processing (OCI Document AI + OpenAI Vision + OpenAI LLM)
  - Document type routing (EXPENSE vs INCOME flows)

  The most recent work was identifying that OpenAI Vision API has the same schema validation issue that was previously fixed in the document type classifier.

  Summary:
  1. Primary Request and Intent:
     - Fix errors in classifying "expenses" vs "incomes" by creating separate processing flows
     - Implement full PDF to base64 conversion for OpenAI Vision API integration
     - Add OpenAI Vision API support for JPEG/JPG/PNG images sent as base64
     - Create more specific transaction categories (electronics, food, etc.) instead of generic ones like "compras"
     - Ensure Oracle Object Storage integration works properly with document processing pipeline
     - Fix Redis eviction policy issues for BullMQ job queue reliability

  2. Key Technical Concepts:
     - Oracle Cloud Infrastructure (OCI) Document AI for OCR and text extraction
     - OpenAI Vision API for image analysis with base64 encoding
     - BullMQ job queue with Redis for asynchronous processing
     - PDF conversion using pdf2pic, GraphicsMagick, and Ghostscript
     - Multi-agent document processing pipeline with parallel analysis
     - Zod schema validation for structured AI responses
     - Docker containerization with Alpine Linux
     - Chilean financial document context and patterns

  3. Files and Code Sections:

     - **docker-compose.yaml**
       - Fixed Redis eviction policy from `allkeys-lru` to `noeviction`
       - Critical for preventing BullMQ job loss under memory pressure
       - ```yaml
         command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy noeviction
         ```

     - **apps/api/Dockerfile**
       - Added PDF conversion dependencies for both build and production stages
       - ```dockerfile
         RUN apk add --no-cache graphicsmagick ghostscript poppler-utils
         ```

     - **document-type-classifier.service.ts** (newly created)
       - Implements first-stage classification to determine EXPENSE vs INCOME
       - Uses OpenAI Vision API with Chilean-optimized prompts
       - ```typescript
         const DocumentTypeSchema = z.object({
           documentType: z.enum(['EXPENSE', 'INCOME']),
           confidence: z.number().min(0).max(1),
           reasoning: z.string().min(10),
           suggestedCategory: z.string().default("general"),
           merchant: z.string().default("unknown")
         });
         ```

     - **document-converter.service.ts**
       - Implemented comprehensive PDF to base64 conversion with dual fallback system
       - ```typescript
         private async convertPdfToBase64Images(pdfBuffer: Buffer, fileName: string): Promise<Array<{base64: string, mimeType: string, fileName?: string}>> {
           // pdf2pic primary conversion
           // pdf-poppler fallback conversion
           // Returns base64 encoded PNG images
         }
         ```

     - **document-processing-orchestrator.service.ts**
       - Added document type classification as Stage 0 before OCR
       - Implemented split processing flows for EXPENSE vs INCOME
       - ```typescript
         if (detectedTransactionType === 'EXPENSE') {
           classificationResult = await this.processExpenseDocument(/* ... */);
         } else {
           classificationResult = await this.processIncomeDocument(/* ... */);
         }
         ```

     - **financial-transaction-classifier.service.ts**
       - Updated to return subcategories as main categories for specificity
       - ```typescript
         return {
           category: bestMatch.subcategory || bestMatch.category,
           subcategory: bestMatch.subcategory,
           // ...
         };
         ```

     - **openai-vision.service.ts**
       - Updated categories to include specific types like "electronica"
       - Schema validation issue identified but not yet fixed
       - ```typescript
         const VisionAnalysisSchema = z.object({
           extractedText: z.string().describe("Complete text extracted from the image"),
           amounts: z.array(z.number()).describe("All numeric amounts found in the document"),
           // ... other fields
         });
         ```

  4. Errors and fixes:
     - **Redis Eviction Policy Error**: Fixed `allkeys-lru` to `noeviction` in docker-compose files to prevent BullMQ job loss
     - **PDF Conversion Failures**: Added GraphicsMagick and Ghostscript dependencies, created fallback system with pdf-poppler
     - **OCI Document AI `[object Object]` Errors**: Enhanced error logging with `extractOCIErrorDetails()` method to show actual error information
     - **Document Type Misclassification**: Added "boleta" to type mapping, created separate EXPENSE/INCOME processing flows
     - **Generic Categories Issue**: Modified classifier to return specific subcategories as main categories
     - **Schema Validation Failures**: Fixed document type classifier schema with better defaults and constraints
     - **JPEG Processing Failure**: Identified OpenAI Vision schema validation error (current issue)

  5. Problem Solving:
     - Implemented multi-layered PDF conversion fallback system
     - Created parallel processing architecture (OCI + OpenAI Vision + OpenAI LLM)
     - Built comprehensive error logging system for OCI SDK
     - Designed Chilean-specific document recognition patterns
     - Established separate processing pipelines for different transaction types

  6. All user messages:
     - Initial request to separate expense/income flows and implement PDF to base64 conversion
     - Request to fix Redis eviction policy in Docker Compose for all environments
     - Feedback that PDF processing works but JPEG images fail with OpenAI Vision API
     - Clarification that there's no results bucket, only upload bucket with streaming events
     - Request to make categories more specific like "electronics", "food" vs generic "compras"

  7. Pending Tasks:
     - Fix OpenAI Vision API schema validation error for JPEG image processing
     - Complete schema validation improvements similar to document type classifier fixes

  8. Current Work:
     The most recent work involved identifying and beginning to fix an OpenAI Vision API schema validation error. The user reported that PDF processing works correctly,
   but JPEG images fail with the error:
     ```
     OpenAI Vision ❌ Image analysis failed {
       error: "No object generated: response did not match schema.",
       processingTime: 7349,
     }
     ```
     
     I had just identified that this is the same type of schema validation issue that was previously fixed in the document type classifier service, but it's now 
  occurring in the OpenAI Vision service's `VisionAnalysisSchema`.

  9. Optional Next Step:
     Fix the OpenAI Vision API schema validation error by applying the same improvements made to the document type classifier: add default values, better constraints, 
  and more flexible schema validation to the `VisionAnalysisSchema` in `openai-vision.service.ts`.

     Direct quote from conversation: "I can see the issue now. The system is working great overall, but there's a specific problem with the OpenAI Vision API when 
  processing JPEG images. The error shows: 'OpenAI Vision ❌ Image analysis failed { error: "No object generated: response did not match schema." }'".
  Please continue the conversation from where we left it off without asking the user any further questions. Continue with the last task that you were asked to work on.
- ALWAYS USE BUN IN THIS PROJECT!!!