# CLAUDE.md - Financial Assistant Frontend Layer

## Frontend Overview

This is the React-based web application for the Financial Assistant hackathon project. It features a sophisticated onboarding flow, interactive chat interface with generative UI components, and comprehensive demonstration of AI-powered conversational experiences. The application showcases advanced UI patterns with mock AI responses and rich interactive components.

**Tech Stack:**
- Build Tool: Vite 4.4.5
- Framework: React 18.2.0 with TypeScript
- Styling: Tailwind CSS + Radix UI primitives
- Icons: Lucide React
- AI Integration: Vercel AI SDK (v3.0.0) ready
- UI Components: Complete Shadcn/ui library

**Current Implementation Status:**
- ✅ Advanced chat interface with generative UI components
- ✅ Comprehensive user onboarding flow (multi-step registration)
- ✅ Login/authentication UI with validation
- ✅ Mock AI responses with interactive components
- ✅ Generative UI: Charts, task lists, learning paths, metric cards
- ✅ AI SDK integration ready (pre-configured)
- ⏳ Real backend API integration
- ⏳ Financial-specific features (ready to adapt from current learning theme)

## Directory Structure

**Current Implementation (Vite + React):**
```
apps/web/
├── src/                         # Main source directory (Vite)
│   ├── main.tsx                # App entry point
│   ├── App.tsx                 # Main component with all functionality
│   ├── index.css               # Base styles
│   │
│   ├── components/ui/          # Shadcn/ui components (subset)
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── chart.tsx           # Custom chart components
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── learning-path.tsx   # Learning path component
│   │   ├── progress.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   └── task-list.tsx       # Task list component
│   │
│   └── lib/
│       ├── mock-ai-responses.tsx  # Mock AI with generative UI
│       └── utils.ts               # Utility functions
│
├── components/                  # Extended Shadcn/ui library (40+ components)
│   ├── theme-provider.tsx      
│   └── ui/                     # Complete component set
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── calendar.tsx
│       ├── chart.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── table.tsx
│       └── ... (full library)
│
├── hooks/                       # React hooks
│   ├── use-mobile.tsx          
│   └── use-toast.ts            
│
├── lib/
│   └── utils.ts                # Shared utilities
│
├── public/                     # Static assets
│   ├── placeholder-logo.png
│   ├── placeholder-user.jpg
│   └── ...
│
├── app/                        # Legacy Next.js files (unused)
├── styles/                     # Legacy styles
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── components.json             # Shadcn/ui configuration
├── tsconfig.json
└── package.json
```

**Adaptation Path to Financial Assistant:**
The current learning-focused components can be easily adapted to financial use cases:

- **Learning Path** → **Financial Goal Progress**
- **Task List** → **Financial Action Items** 
- **Metric Cards** → **Account Balances & KPIs**
- **Charts** → **Spending Analysis & Budget Tracking**
- **Progress Tracking** → **Savings Goals & Investment Growth**

## Core Implementation

### 1. Vite App Structure (Current)

```tsx
// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

```js
// vite.config.js
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

### 2. Main App Component with Generative UI

The current implementation includes sophisticated AI mock responses with interactive components:

```tsx
// src/App.tsx (Comprehensive component)
"use client"

import { useState } from "react"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import { Card, CardContent, CardHeader } from "./components/ui/card"
import { getMockAIResponse, type AIResponse } from "./lib/mock-ai-responses"

interface OnboardingData {
  name: string
  goal: string
  experience: string
}

interface Message {
  id: number
  text?: string
  component?: React.ReactNode  // ✅ Generative UI support
  sender: "user" | "bot"
  timestamp: Date
  type?: "text" | "component" | "mixed"
}

type AppState = "welcome" | "login" | "register" | "chat"

export default function App() {
  // State management for complex multi-screen flow
  const [appState, setAppState] = useState<AppState>("welcome")
  const [messages, setMessages] = useState<Message[]>([...])
  
  // AI Response Integration
  const handleSendMessage = async () => {
    // ... user message handling
    
    const aiResponse: AIResponse = getMockAIResponse(currentMessage, onboardingData.goal)
    
    const botMessage: Message = {
      id: messages.length + 2,
      text: aiResponse.text,
      component: aiResponse.component,  // ✅ Rich UI components
      sender: "bot",
      timestamp: new Date(),
      type: aiResponse.type,
    }
    
    setMessages((prev) => [...prev, botMessage])
  }
}
```

**Key Features:**
- ✅ **Generative UI**: AI responses include React components
- ✅ **Multi-state Flow**: Welcome → Login/Register → Chat
- ✅ **Interactive Components**: Charts, task lists, learning paths, metrics
- ✅ **Mock AI System**: Sophisticated response logic based on user input
- ✅ **Spanish UI**: Fully localized interface
- ✅ **AI SDK Ready**: Pre-configured for real AI integration

### 3. Mock AI Response System

The application includes a sophisticated mock AI system with generative UI components:

```tsx
// src/lib/mock-ai-responses.tsx
export interface AIResponse {
  id: string
  text?: string
  component?: React.ReactNode
  type: "text" | "component" | "mixed"
}

export const mockAIResponses: Record<string, AIResponse[]> = {
  aprender: [{
    id: "learning-1",
    type: "mixed",
    text: "¡Perfecto! He creado un plan de aprendizaje personalizado para ti.",
    component: (
      <LearningPath
        title="Ruta de Aprendizaje Personalizada"
        modules={[
          {
            title: "Fundamentos Básicos",
            description: "Conceptos esenciales para comenzar",
            duration: "2 semanas",
            difficulty: "beginner",
            status: "available",
          },
          // ... more modules
        ]}
      />
    ),
  }],
  
  mejorar: [{
    type: "mixed", 
    text: "Basándome en tu perfil, he analizado tus habilidades actuales.",
    component: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard title="Habilidades Técnicas" value="75%" change={12} />
        <MetricCard title="Proyectos Completados" value="8" change={25} />
        <Chart
          title="Progreso por Área"
          data={[
            { name: "Frontend", value: 80, color: "#3b82f6" },
            { name: "Backend", value: 65, color: "#10b981" },
            // ... more data
          ]}
        />
      </div>
    ),
  }],
  
  proyecto: [{
    type: "mixed",
    text: "¡Excelente! Te ayudo a organizar tu nuevo proyecto.",
    component: (
      <TaskList
        title="Plan de Proyecto - Primeros Pasos"
        tasks={[
          {
            title: "Definir objetivos del proyecto",
            description: "Establecer metas claras y medibles",
            status: "pending",
            priority: "high",
            dueDate: "En 2 días",
          },
          // ... more tasks
        ]}
      />
    ),
  }],
}

export function getMockAIResponse(userMessage: string, userGoal?: string): AIResponse {
  const message = userMessage.toLowerCase()
  
  if (message.includes("aprender") || userGoal?.includes("Aprender")) {
    return mockAIResponses.aprender[0]
  }
  // ... intelligent response routing
}
```

**Available Generative Components:**
- **LearningPath**: Step-by-step guided learning modules
- **TaskList**: Interactive task management with priorities
- **MetricCard**: KPI displays with trend indicators  
- **Chart**: Data visualization with multiple chart types
- **Progress Tracking**: Visual progress indicators

## Next Development Steps

### Real AI Integration (Ready!)

The AI SDK is already integrated (`ai: ^3.0.0`). To connect with the financial backend:

1. **Replace Mock Responses with Real AI:**
```tsx
// Replace getMockAIResponse with real useChat hook
import { useChat } from 'ai/react'

export function useFinancialChat() {
  return useChat({
    api: '/api/financial-chat',
    initialMessages: [{
      role: 'assistant',
      content: '¡Hola! Soy tu asistente financiero personal. ¿En qué puedo ayudarte hoy?'
    }]
  })
}
```

2. **Adapt Generative Components for Financial Data:**
```tsx
// Convert existing components:
// LearningPath → FinancialGoalPath  
// TaskList → FinancialActionItems
// MetricCard → BalanceCard / KPICard
// Chart → SpendingChart / BudgetChart

// Example financial adaptation:
const financialResponses = {
  balance: [{
    type: "mixed",
    text: "Aquí está tu resumen financiero actual:",
    component: (
      <div className="grid gap-4">
        <MetricCard title="Balance Total" value="$2,450" change={15} />
        <MetricCard title="Gastos del Mes" value="$1,200" change={-8} />
        <Chart
          title="Distribución de Gastos"
          data={[
            { name: "Alimentación", value: 400, color: "#3b82f6" },
            { name: "Transporte", value: 200, color: "#10b981" },
            { name: "Entretenimiento", value: 150, color: "#f59e0b" },
          ]}
        />
      </div>
    ),
  }]
}
```

## Environment Configuration

```env
# .env.local (Vite environment variables)
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# When adding Oracle Cloud AI integration
VITE_OCI_COMPARTMENT_ID=xxx
VITE_OCI_REGION=us-ashburn-1
```

## Development Commands (Vite)

```bash
# Start Vite development server
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## Key Benefits of Current Implementation

1. **✅ Generative UI Ready**: Sophisticated mock AI system with interactive components
2. **✅ AI SDK Integrated**: Vercel AI SDK v3.0.0 pre-configured
3. **✅ Complete UI Library**: 40+ Shadcn/ui components available
4. **✅ Advanced Chat Interface**: Multi-modal messages (text + components)
5. **✅ Mobile-First Design**: Responsive design optimized for mobile users
6. **✅ TypeScript**: Full type safety throughout the application
7. **✅ Vite Performance**: Fast hot reload and optimized builds
8. **✅ Component Reusability**: Easy to adapt learning components to financial use cases

## Migration to Financial Assistant

This implementation provides an **excellent foundation** for the financial assistant because:

- **Generative UI patterns are already implemented** and working
- **Component architecture easily maps to financial concepts**
- **AI SDK integration is ready** - just need to replace mock responses
- **Mobile-first design** matches target user behavior (WhatsApp integration)
- **Spanish localization** already in place for target market

**Immediate next steps:**
1. Replace mock AI responses with real financial agent responses
2. Adapt learning-themed components to financial themes (balance cards, spending charts, etc.)
3. Add Supabase for real authentication
4. Connect to the Hono backend API from the global architecture

The current sophisticated demo with generative UI provides a strong proof-of-concept for the financial assistant's conversational interface capabilities.