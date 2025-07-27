# CLAUDE.md - Financial Assistant Frontend Layer

## Frontend Overview

This is the React-based web application for the Financial Assistant hackathon project. It provides a mobile-first chat interface with generative UI capabilities, real-time updates via Supabase, and seamless integration with the backend API.

**Tech Stack:**
- Build Tool: Vite with SWC
- Framework: React 18 with TypeScript
- State Management: Zustand
- Data Fetching: TanStack Query
- Styling: Tailwind CSS + Shadcn/ui
- AI Integration: Vercel AI SDK (React + Generative UI)
- Real-time: Supabase Realtime

## Directory Structure

```
apps/web/
├── src/
│   ├── main.tsx                 # App entry point
│   ├── App.tsx                  # Root component with routing
│   │
│   ├── components/
│   │   ├── ui/                  # Shadcn/ui components
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── generative/          # Generative UI components
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── BudgetChart.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   ├── GoalProgress.tsx
│   │   │   └── SpendingAnalysis.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── PhoneVerification.tsx
│   │   │   └── AuthGuard.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Navigation.tsx
│   │       └── MobileNav.tsx
│   │
│   ├── pages/
│   │   ├── ChatPage.tsx         # Main chat interface
│   │   ├── DashboardPage.tsx    # Financial overview
│   │   ├── LoginPage.tsx        # Auth flow
│   │   └── SettingsPage.tsx     # User preferences
│   │
│   ├── hooks/
│   │   ├── useChat.ts           # AI SDK chat hook wrapper
│   │   ├── useAuth.ts           # Supabase auth
│   │   ├── useRealtime.ts       # Supabase realtime
│   │   └── useFinancialData.ts  # TanStack Query hooks
│   │
│   ├── stores/
│   │   ├── authStore.ts         # Zustand auth state
│   │   ├── chatStore.ts         # Chat state management
│   │   └── uiStore.ts           # UI preferences
│   │
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   ├── api.ts               # API client setup
│   │   └── utils.ts             # Helper functions
│   │
│   ├── types/
│   │   ├── index.ts             # Shared types
│   │   ├── chat.ts              # Chat-specific types
│   │   └── financial.ts         # Financial data types
│   │
│   └── styles/
│       └── globals.css          # Tailwind imports
│
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Core Implementation

### 1. Main App Setup

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

### 2. Chat Interface with Generative UI

```tsx
// src/pages/ChatPage.tsx
import { useChat } from '@/hooks/useChat'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'

export function ChatPage() {
  const { messages, sendMessage, isLoading } = useChat()

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b p-4">
        <h1 className="text-2xl font-semibold">Financial Assistant</h1>
      </header>
      
      <MessageList 
        messages={messages} 
        isLoading={isLoading}
      />
      
      <MessageInput 
        onSendMessage={sendMessage}
        disabled={isLoading}
      />
    </div>
  )
}
```

### 3. Custom useChat Hook with AI SDK

```tsx
// src/hooks/useChat.ts
import { useChat as useAIChat } from '@ai-sdk/react'
import { useAuthStore } from '@/stores/authStore'
import { useSupabaseRealtime } from './useRealtime'

export function useChat() {
  const user = useAuthStore(state => state.user)
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useAIChat({
    api: '/api/chat',
    headers: {
      'Authorization': `Bearer ${user?.access_token}`,
    },
    onFinish: (message) => {
      // Handle message completion
      console.log('Message completed:', message)
    },
  })

  // Subscribe to realtime updates for WhatsApp sync
  useSupabaseRealtime({
    channel: `chat:${user?.id}`,
    table: 'messages',
    filter: `user_id=eq.${user?.id}`,
    onInsert: (payload) => {
      if (payload.new.source === 'whatsapp') {
        // Handle WhatsApp message sync
        // The AI SDK will automatically update the UI
      }
    },
  })

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    sendMessage: handleSubmit,
  }
}
```

### 4. Message Rendering with Generative UI

```tsx
// src/components/chat/MessageList.tsx
import { UIMessage } from '@ai-sdk/react'
import { MessageBubble } from './MessageBubble'
import { 
  BalanceCard,
  BudgetChart,
  TransactionList,
  GoalProgress,
  SpendingAnalysis 
} from '@/components/generative'

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2">
          <MessageBubble 
            role={message.role} 
            timestamp={message.createdAt}
          >
            {message.parts.map((part, index) => {
              // Render text parts
              if (part.type === 'text') {
                return <p key={index} className="whitespace-pre-wrap">{part.text}</p>
              }

              // Render balance card
              if (part.type === 'tool-checkBalance') {
                return (
                  <ToolRenderer
                    key={index}
                    part={part}
                    component={BalanceCard}
                    loadingText="Checking your balance..."
                  />
                )
              }

              // Render budget analysis
              if (part.type === 'tool-analyzeBudget') {
                return (
                  <ToolRenderer
                    key={index}
                    part={part}
                    component={BudgetChart}
                    loadingText="Analyzing your budget..."
                  />
                )
              }

              // Render transaction list
              if (part.type === 'tool-getTransactions') {
                return (
                  <ToolRenderer
                    key={index}
                    part={part}
                    component={TransactionList}
                    loadingText="Loading transactions..."
                  />
                )
              }

              // Render goal progress
              if (part.type === 'tool-checkGoals') {
                return (
                  <ToolRenderer
                    key={index}
                    part={part}
                    component={GoalProgress}
                    loadingText="Loading your goals..."
                  />
                )
              }

              // Render spending analysis
              if (part.type === 'tool-analyzeSpending') {
                return (
                  <ToolRenderer
                    key={index}
                    part={part}
                    component={SpendingAnalysis}
                    loadingText="Analyzing spending patterns..."
                  />
                )
              }

              return null
            })}
          </MessageBubble>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex items-center space-x-2 text-muted-foreground">
          <div className="animate-pulse">●</div>
          <div className="animate-pulse animation-delay-200">●</div>
          <div className="animate-pulse animation-delay-400">●</div>
        </div>
      )}
    </div>
  )
}

// Helper component for tool rendering
function ToolRenderer({ part, component: Component, loadingText }) {
  switch (part.state) {
    case 'input-available':
      return (
        <div className="flex items-center space-x-2 text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          <span>{loadingText}</span>
        </div>
      )
    case 'output-available':
      return <Component {...part.output} />
    case 'output-error':
      return (
        <div className="text-destructive bg-destructive/10 p-3 rounded-md">
          Error: {part.errorText}
        </div>
      )
    default:
      return null
  }
}
```

### 5. Generative UI Components

```tsx
// src/components/generative/BalanceCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface BalanceCardProps {
  balance: number
  currency: string
  change: number
  changePercent: number
  timeframe: string
  breakdown?: {
    category: string
    amount: number
    percentage: number
  }[]
}

export function BalanceCard({ 
  balance, 
  currency, 
  change, 
  changePercent,
  timeframe,
  breakdown 
}: BalanceCardProps) {
  const isPositive = change >= 0

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Current Balance</span>
          <span className="text-sm text-muted-foreground">{timeframe}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-bold">
            {currency} {balance.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            <span>{Math.abs(change).toLocaleString()} ({changePercent}%)</span>
          </div>
        </div>

        {breakdown && breakdown.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Breakdown by Category</h4>
            {breakdown.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.category}</span>
                <div className="text-sm">
                  <span className="font-medium">{currency} {item.amount.toLocaleString()}</span>
                  <span className="text-muted-foreground ml-2">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

```tsx
// src/components/generative/BudgetChart.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface BudgetChartProps {
  categories: Array<{
    name: string
    spent: number
    budget: number
    percentage: number
  }>
  totalSpent: number
  totalBudget: number
  recommendations?: string[]
}

export function BudgetChart({ 
  categories, 
  totalSpent, 
  totalBudget,
  recommendations 
}: BudgetChartProps) {
  const overallPercentage = (totalSpent / totalBudget) * 100

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Budget Analysis</CardTitle>
        <div className="text-sm text-muted-foreground">
          ${totalSpent.toLocaleString()} of ${totalBudget.toLocaleString()} spent
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={overallPercentage} className="h-3" />
        
        <div className="space-y-3">
          {categories.map((category, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{category.name}</span>
                <span className={category.percentage > 100 ? 'text-red-600 font-medium' : ''}>
                  ${category.spent} / ${category.budget}
                </span>
              </div>
              <Progress 
                value={category.percentage} 
                className={`h-2 ${category.percentage > 100 ? 'bg-red-100' : ''}`}
              />
            </div>
          ))}
        </div>

        {recommendations && recommendations.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Recommendations</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 6. Authentication with Supabase

```tsx
// src/hooks/useAuth.ts
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const navigate = useNavigate()
  const { user, setUser, clearUser } = useAuthStore()

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user)
      } else {
        clearUser()
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms'
      }
    })
    return { error }
  }

  const verifyOtp = async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    signInWithPhone,
    verifyOtp,
    signOut,
    isAuthenticated: !!user
  }
}
```

### 7. Real-time Updates Hook

```tsx
// src/hooks/useRealtime.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  channel: string
  table?: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useSupabaseRealtime({
  channel,
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete
}: UseRealtimeOptions) {
  useEffect(() => {
    let realtimeChannel: RealtimeChannel

    if (table) {
      realtimeChannel = supabase
        .channel(channel)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            switch (payload.eventType) {
              case 'INSERT':
                onInsert?.(payload)
                break
              case 'UPDATE':
                onUpdate?.(payload)
                break
              case 'DELETE':
                onDelete?.(payload)
                break
            }
          }
        )
        .subscribe()
    }

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [channel, table, filter])
}
```

### 8. TanStack Query Integration

```tsx
// src/hooks/useFinancialData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useTransactions(timeframe?: string) {
  return useQuery({
    queryKey: ['transactions', timeframe],
    queryFn: async () => {
      const response = await api.get('/transactions', {
        params: { timeframe }
      })
      return response.data
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await api.get('/goals')
      return response.data
    }
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (goalData: CreateGoalInput) => {
      const response = await api.post('/goals', goalData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    }
  })
}
```

## Environment Configuration

```env
# .env.local
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## Styling Configuration

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    /* ... other CSS variables */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables */
  }
}

@layer utilities {
  .animation-delay-200 {
    animation-delay: 200ms;
  }
  
  .animation-delay-400 {
    animation-delay: 400ms;
  }
}
```

## Tailwind Configuration

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... other colors
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-in-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

## Key Implementation Notes

1. **Generative UI Pattern**: Each tool response maps to a specific React component
2. **Type Safety**: All tool outputs should have corresponding TypeScript interfaces
3. **Loading States**: Every generative component handles loading/error states
4. **Mobile First**: All components are designed for mobile screens first
5. **Real-time Sync**: WhatsApp messages appear instantly via Supabase
6. **Optimistic Updates**: UI updates immediately, syncs with server later

## Development Commands

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Type checking
bun run type-check

# Linting
bun run lint
```

Remember: Focus on creating impressive generative UI components that showcase the AI's capabilities. The chat interface should feel magical with rich, interactive responses!