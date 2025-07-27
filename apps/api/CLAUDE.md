# CLAUDE.md - Financial Assistant Backend Layer

## Backend Overview

This is the Hono-based backend API for the Financial Assistant hackathon project. It provides REST endpoints, WebSocket support for real-time chat, WhatsApp webhook integration, and orchestrates AI-powered financial coaching through modular agents and RAG.

**Tech Stack:**
- Runtime: Bun
- Framework: Hono
- AI: Vercel AI SDK with custom Oracle Cloud provider
- Queue: BullMQ with Redis
- Database: Supabase (PostgreSQL + pgvector)

## Directory Structure

```
apps/api/
├── src/
│   ├── index.ts                 # Main Hono server entry
│   ├── routes/
│   │   ├── index.ts            # Route aggregator
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── chat.ts             # Chat & streaming endpoints
│   │   ├── transactions.ts     # Financial data CRUD
│   │   ├── webhooks.ts         # Twilio webhook handler
│   │   └── health.ts           # Health check
│   │
│   ├── services/
│   │   ├── chat-service.ts     # Main chat orchestration
│   │   ├── llm-processor.ts    # AI SDK integration
│   │   ├── agent-orchestrator.ts # Agent coordination
│   │   ├── rag-pipeline.ts     # Vector search & embeddings
│   │   └── queue-service.ts    # Job queue management
│   │
│   ├── agents/
│   │   ├── index.ts            # Agent registry
│   │   ├── balance-agent.ts    # Account balance checker
│   │   ├── budget-agent.ts     # Budget analyzer
│   │   ├── goal-agent.ts       # Financial goal planner
│   │   └── debt-agent.ts       # Debt analyzer
│   │
│   ├── middleware/
│   │   ├── auth.ts             # JWT/Session validation
│   │   ├── error-handler.ts    # Global error handling
│   │   ├── rate-limit.ts       # Rate limiting
│   │   └── logging.ts          # Request logging
│   │
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client singleton
│   │   ├── redis.ts            # Redis client
│   │   ├── oci-clients.ts      # OCI service clients
│   │   └── twilio.ts           # Twilio client
│   │
│   ├── workers/               # Background job definitions
│   │   ├── index.ts           # Worker entry point
│   │   ├── process-whatsapp.ts
│   │   ├── extract-receipt.ts
│   │   ├── scrape-video.ts
│   │   └── analyze-transactions.ts
│   │
│   └── types/
│       ├── index.ts           # Shared types
│       └── schemas.ts         # Zod schemas
│
├── tests/
│   ├── routes/
│   ├── services/
│   └── agents/
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example
```

## Core Service Implementations

### 1. Main Server Entry (index.ts)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { compress } from 'hono/compress'
import { secureHeaders } from 'hono/secure-headers'

import { routes } from './routes'
import { errorHandler } from './middleware/error-handler'
import { initializeServices } from './services'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('*', cors())
app.use('*', secureHeaders())
app.use('*', compress())

// Initialize services
const services = await initializeServices()
app.use('*', async (c, next) => {
  c.set('services', services)
  await next()
})

// Mount routes
app.route('/', routes)

// Global error handler
app.onError(errorHandler)

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
```

### 2. Chat Service Architecture

```typescript
// src/services/chat-service.ts
import { streamText } from 'ai'
import { createOCI } from '@financial-assistant/shared/providers/oci'
import type { AgentOrchestrator } from './agent-orchestrator'
import type { RAGPipeline } from './rag-pipeline'

export class ChatService {
  private model

  constructor(
    private agentOrchestrator: AgentOrchestrator,
    private ragPipeline: RAGPipeline,
    private supabase: SupabaseClient
  ) {
    this.model = createOCI({
      compartmentId: process.env.OCI_COMPARTMENT_ID!,
      region: process.env.OCI_REGION
    }).chat('cohere.command')
  }

  async processMessage(
    userId: string,
    message: string,
    conversationId: string
  ): Promise<ReadableStream> {
    // 1. Store user message
    await this.storeMessage({
      user_id: userId,
      conversation_id: conversationId,
      role: 'user',
      content: message
    })

    // 2. Get conversation context
    const context = await this.getConversationContext(conversationId)
    
    // 3. Get available agents for this user
    const agents = await this.agentOrchestrator.getAgentsForUser(userId)
    
    // 4. Get RAG context
    const ragContext = await this.ragPipeline.getRelevantContext(message)
    
    // 5. Stream response with AI SDK
    const result = await streamText({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(ragContext)
        },
        ...context.messages,
        { role: 'user', content: message }
      ],
      tools: agents,
      toolChoice: 'auto',
      onFinish: async ({ text }) => {
        // Store assistant response
        await this.storeMessage({
          user_id: userId,
          conversation_id: conversationId,
          role: 'assistant',
          content: text
        })
      }
    })

    return result.toAIStream()
  }
}
```

### 3. Agent Implementation Pattern

```typescript
// src/agents/balance-agent.ts
import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createBalanceAgent(supabase: SupabaseClient) {
  return tool({
    description: 'Check user account balance and analyze recent spending',
    parameters: z.object({
      timeframe: z.enum(['current', 'this_month', 'last_month']).optional(),
      includeCategories: z.boolean().optional()
    }),
    execute: async ({ timeframe = 'current', includeCategories = true }, { userId }) => {
      // Query transactions
      const query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)

      if (timeframe !== 'current') {
        const dateRange = getDateRange(timeframe)
        query.gte('transaction_date', dateRange.start)
             .lte('transaction_date', dateRange.end)
      }

      const { data: transactions, error } = await query
      if (error) throw error

      // Calculate balance and analytics
      const balance = transactions.reduce((sum, t) => sum + t.amount, 0)
      
      const result: any = {
        balance,
        transactionCount: transactions.length,
        timeframe
      }

      if (includeCategories) {
        result.byCategory = groupTransactionsByCategory(transactions)
        result.topSpendingCategories = getTopCategories(result.byCategory)
      }

      // Cache result
      await supabase.from('agent_results').insert({
        user_id: userId,
        agent_name: 'balance',
        results: result,
        timestamp: new Date().toISOString()
      })

      return result
    }
  })
}
```

### 4. Agent Orchestrator

```typescript
// src/services/agent-orchestrator.ts
import { createBalanceAgent } from '../agents/balance-agent'
import { createBudgetAgent } from '../agents/budget-agent'
import { createGoalAgent } from '../agents/goal-agent'
import { createDebtAgent } from '../agents/debt-agent'

export class AgentOrchestrator {
  private agents: Map<string, ReturnType<typeof tool>>

  constructor(private supabase: SupabaseClient) {
    this.agents = new Map([
      ['checkBalance', createBalanceAgent(supabase)],
      ['analyzeBudget', createBudgetAgent(supabase)],
      ['planGoal', createGoalAgent(supabase)],
      ['analyzeDebt', createDebtAgent(supabase)]
    ])
  }

  async getAgentsForUser(userId: string): Promise<Record<string, any>> {
    // Could implement user-specific agent access control
    const userProfile = await this.getUserProfile(userId)
    
    // Return all agents as object for AI SDK
    return Object.fromEntries(this.agents)
  }

  async executeAgent(agentName: string, params: any, context: any) {
    const agent = this.agents.get(agentName)
    if (!agent) throw new Error(`Agent ${agentName} not found`)
    
    return agent.execute(params, context)
  }
}
```

### 5. RAG Pipeline

```typescript
// src/services/rag-pipeline.ts
import { embed } from 'ai'
import { createOCI } from '@financial-assistant/shared/providers/oci'

export class RAGPipeline {
  private embedModel

  constructor(private supabase: SupabaseClient) {
    this.embedModel = createOCI({
      compartmentId: process.env.OCI_COMPARTMENT_ID!
    }).embedding('cohere.embed-english-v3.0')
  }

  async getRelevantContext(query: string, limit = 5) {
    // Generate embedding for query
    const { embedding } = await embed({
      model: this.embedModel,
      value: query
    })

    // Search similar content
    const { data: matches } = await this.supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit
    })

    return matches || []
  }

  async addKnowledge(content: string, metadata: any) {
    // Generate embedding
    const { embedding } = await embed({
      model: this.embedModel,
      value: content
    })

    // Store in knowledge base
    await this.supabase.from('knowledge_base').insert({
      content,
      embedding,
      ...metadata
    })
  }
}
```

### 6. Route Implementations

```typescript
// src/routes/chat.ts
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional()
})

export const chatRoutes = new Hono()

chatRoutes.post('/stream', 
  zValidator('json', chatSchema),
  async (c) => {
    const { message, conversationId } = c.req.valid('json')
    const userId = c.get('userId') // From auth middleware
    const { chatService } = c.get('services')
    
    // Generate conversation ID if not provided
    const convId = conversationId || crypto.randomUUID()
    
    return streamSSE(c, async (stream) => {
      try {
        const aiStream = await chatService.processMessage(
          userId,
          message,
          convId
        )
        
        const reader = aiStream.getReader()
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          await stream.writeSSE({
            data: new TextDecoder().decode(value),
            event: 'message'
          })
        }
        
        await stream.writeSSE({
          data: JSON.stringify({ conversationId: convId }),
          event: 'done'
        })
      } catch (error) {
        await stream.writeSSE({
          data: JSON.stringify({ error: error.message }),
          event: 'error'
        })
      }
    })
  }
)
```

### 7. WhatsApp Webhook Handler

```typescript
// src/routes/webhooks.ts
import { Hono } from 'hono'
import { Queue } from 'bullmq'

export const webhookRoutes = new Hono()

webhookRoutes.post('/twilio', async (c) => {
  const { From, Body, NumMedia, MediaUrl0 } = await c.req.parseBody()
  const { queueService } = c.get('services')
  
  // Verify webhook signature
  const signature = c.req.header('X-Twilio-Signature')
  if (!verifyTwilioSignature(signature, c.req.url, await c.req.parseBody())) {
    return c.text('Unauthorized', 401)
  }
  
  // Queue for processing
  await queueService.addJob('whatsapp-messages', {
    from: From,
    body: Body,
    mediaUrl: NumMedia > 0 ? MediaUrl0 : null,
    timestamp: new Date().toISOString()
  })
  
  // Acknowledge receipt
  return c.text('OK', 200)
})
```

## Background Workers

```typescript
// src/workers/index.ts
import { Worker } from 'bullmq'
import { processWhatsAppMessage } from './process-whatsapp'
import { extractReceipt } from './extract-receipt'
import { createRedisConnection } from '../lib/redis'

const connection = createRedisConnection()

// WhatsApp message processor
new Worker('whatsapp-messages', processWhatsAppMessage, {
  connection,
  concurrency: 5
})

// Receipt extractor
new Worker('receipt-extraction', extractReceipt, {
  connection,
  concurrency: 3
})

console.log('Workers started...')
```

## Environment Configuration

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Oracle Cloud
OCI_TENANCY_ID=xxx
OCI_USER_ID=xxx
OCI_FINGERPRINT=xxx
OCI_PRIVATE_KEY_PATH=/path/to/key.pem
OCI_REGION=us-chicago-1
OCI_COMPARTMENT_ID=xxx

# Redis
REDIS_URL=redis://localhost:6379

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# Auth
JWT_SECRET=xxx
```

## Deployment via GitHub Actions

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/**'

env:
  REGISTRY: docker.io
  IMAGE_NAME: ${{ secrets.DOCKERHUB_USERNAME }}/financial-assistant-api

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test apps/api

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/api/Dockerfile
          push: true
          tags: ${{ env.IMAGE_NAME }}:latest
          
      - name: Deploy to Oracle Cloud
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.OCI_HOST }}
          username: ubuntu
          key: ${{ secrets.OCI_SSH_KEY }}
          script: |
            cd /home/ubuntu/financial-assistant
            docker-compose pull api workers
            docker-compose up -d api workers
```

## Testing Strategy

```typescript
// tests/routes/chat.test.ts
import { describe, it, expect } from 'bun:test'
import app from '../../src'

describe('Chat Routes', () => {
  it('should stream chat responses', async () => {
    const res = await app.request('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        message: 'What is my balance?'
      })
    })
    
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
```

## Key Implementation Notes

1. **Service Initialization**: All services are initialized once and passed through context
2. **Agent Registry**: Agents are registered in the orchestrator and exposed as AI SDK tools
3. **Streaming**: Use Hono's SSE helper for real-time streaming
4. **Error Handling**: Global error handler catches and formats all errors
5. **Type Safety**: Use Zod for runtime validation of all inputs
6. **Background Jobs**: Heavy processing happens in workers, not in API requests

Remember: This backend is optimized for hackathon speed. Focus on getting core features working, then optimize later!