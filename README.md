# 🏦 Financial Assistant

A personal financial coach/assistant that allows users to input financial data via WhatsApp and provides AI-powered financial coaching through a web interface.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) >= 1.0.0
- [Docker](https://docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) >= 18.0.0

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd financial-assistant
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start development services:**
   ```bash
   # Start all services
   bun run dev

   # Or start individually
   bun run dev:api    # Backend API on :3000
   bun run dev:web    # Frontend on :5173
   ```

4. **Using Docker (recommended for production-like testing):**
   ```bash
   docker-compose up -d
   ```

## 🏗️ Project Structure

```
financial-assistant/
├── apps/
│   ├── api/                 # Hono backend (TypeScript + Bun)
│   └── web/                 # React frontend (Vite + TypeScript)
├── packages/
│   ├── shared/              # Shared types and utilities
│   └── supabase/            # Database client and types
├── .github/workflows/       # GitHub Actions for CI/CD
├── docker-compose.yml       # Development containers
└── docker-compose.prod.yml  # Production containers
```

## 🔧 Available Scripts

### Root Level
- `bun run dev` - Start both API and web in development mode
- `bun run build` - Build all packages for production
- `bun run test` - Run all tests
- `bun run lint` - Lint all packages

### API (apps/api)
- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Start production server

### Web (apps/web)
- `bun run dev` - Start Vite development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build

## 🚢 Deployment

### GitHub Actions
The project includes automated deployment to Oracle Cloud via GitHub Actions:

1. **Set up repository secrets:**
   - `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`
   - `OCI_HOST`, `OCI_SSH_KEY`
   - All environment variables from `.env.example`

2. **Deploy:**
   ```bash
   git push origin main
   ```

### Manual Deployment
```bash
# Build and push images
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml push

# Deploy on server
docker-compose -f docker-compose.prod.yml up -d
```

## 🏛️ Architecture

### Backend (Hono + Bun)
- **Framework:** Hono (lightweight, fast)
- **Runtime:** Bun (JavaScript/TypeScript runtime)
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI:** Oracle Cloud Generative AI (custom provider)
- **Queue:** BullMQ + Redis
- **Auth:** Supabase Auth

### Frontend (React + Vite)
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite with SWC
- **Styling:** Tailwind CSS + Shadcn/ui
- **State:** Zustand + TanStack Query
- **AI Integration:** Vercel AI SDK + Generative UI

### Key Features (Planned)
- 📱 WhatsApp integration via Twilio
- 🤖 AI-powered financial coaching
- 📊 Real-time financial insights
- 🎯 Goal tracking and budgeting
- 📄 Receipt OCR processing
- 🔄 Real-time sync between platforms

## 🛠️ Development Workflow

### Day 1: Infrastructure ✅
- [x] Basic project structure
- [x] Hono API with health endpoints
- [x] React web app with API connectivity
- [x] Docker configuration
- [x] GitHub Actions deployment

### Day 2-3: Core Features (Next)
- [ ] OCI Provider for Vercel AI SDK
- [ ] Supabase database setup
- [ ] Basic authentication
- [ ] Chat interface with streaming

### Day 4-5: Advanced Features
- [ ] WhatsApp integration
- [ ] Financial agents (balance, budget, goals)
- [ ] Receipt processing with OCR

### Day 6-7: Polish & Deploy
- [ ] RAG pipeline for financial knowledge
- [ ] UI improvements and testing
- [ ] Production deployment and demo

## 🔍 API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /api/status` - API status and environment info

### Coming Soon
- `POST /api/chat/stream` - Streaming chat with AI
- `GET /api/transactions` - User transactions
- `POST /webhooks/twilio` - WhatsApp webhook handler

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Submit PR for review
4. Deploy automatically on merge to `main`

## 📝 License

This project is built for the hackathon and is currently private.

## 🆘 Support

For development questions, check:
- Backend implementation: `apps/api/CLAUDE.md`
- Frontend implementation: `apps/web/CLAUDE.md`
- Architecture overview: `CLAUDE.md`