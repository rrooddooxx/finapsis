# CLAUDE.md - Financial Assistant Backend Layer

## Backend Overview

This is the Hono-based backend API for the Financial Assistant hackathon project. It provides REST endpoints, WebSocket support for real-time chat, WhatsApp webhook integration, and orchestrates AI-powered financial coaching through modular agents and RAG.

**Tech Stack:**
- Runtime: Bun
- Framework: Hono
- AI: Vercel AI SDK with custom Oracle Cloud provider
- Queue: BullMQ with Redis
- Database: Supabase (PostgreSQL + pgvector)

## Work Context

- Project started as a hackathon project to create an AI-powered financial assistant
- Initial focus on building a modular backend with real-time chat capabilities
- Implemented multi-agent architecture to handle different financial analysis tasks
- Integrated WhatsApp webhook for messaging support
- Built RAG pipeline for contextual responses
- Developed streaming chat endpoint with AI tool integration
- Created background workers for asynchronous processing of messages and receipts
- Implemented comprehensive testing and deployment strategies

## TypeScript Development Milestones

### Type Safety Resolution (Latest Sprint)

- ✅ Comprehensive TypeScript error resolution completed
- Addressed multiple type safety challenges across the financial document processing system
- Key improvements:
  - Eliminated unsafe type casting
  - Implemented proper type guards for API responses
  - Optimized variable scoping and declaration
  - Enhanced type safety for tool parameter definitions
  - Resolved dependency and type checking issues

### Type Safety Achievements

- Zero TypeScript compilation errors achieved
- Strict type checking enabled
- Safe unknown type handling implemented
- Proper AI SDK tool integration
- Centralized configuration system developed
- Comprehensive logging with devLogger
- Type-safe Bun.env usage confirmed

### Specific Type Resolution Highlights

- Replaced `as any` with robust unknown type handling
- Added type guards for safe response parsing in document analyzer
- Implemented proper type narrowing for OCI API responses
- Separated action functions from tool definitions
- Used `inputSchema` for consistent parameter typing
- Added `@types/node-fetch` to resolve OCI SDK type issues
- Configured `--skipLibCheck` to manage third-party library type conflicts

### TypeScript Compilation Best Practices

- Always run TypeScript compiler using `run` with `--skipLibCheck` and `--noEmit` flags when implementing multiple changes
  - This helps analyze potential errors early
  - Allows comprehensive type checking without generating output files
  - Ensures high-quality type safety and catches type-related issues before runtime
  - Encourages not using `any` type and promotes strict type checking practices

[Rest of the existing content remains unchanged...]