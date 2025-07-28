// Common types used across the application

export interface User {
  id: string
  phone_number: string
  created_at: string
  monthly_income?: number
  preferences?: UserPreferences
}

export interface UserPreferences {
  currency: string
  notifications: boolean
  language: string
}

export interface Message {
  id: string
  user_id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  source: 'web' | 'whatsapp'
  created_at: string
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  title?: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  category: string
  description?: string
  transaction_date: string
  receipt_url?: string
  created_at: string
}

export interface FinancialGoal {
  id: string
  user_id: string
  target_amount: number
  current_amount: number
  title: string
  description?: string
  target_date?: string
  created_at: string
}

export interface AgentResult {
  id: string
  user_id: string
  agent_name: string
  results: Record<string, any>
  timestamp: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface HealthCheckResponse {
  status: 'ok' | 'error'
  timestamp: string
  service: string
  version: string
}

// OCI Provider types (placeholder for future implementation)
export interface OCIProviderConfig {
  compartmentId: string
  region?: string
  authProvider?: any // Will be properly typed when OCI SDK is integrated
}

export interface ToolCall {
  tool: string
  arguments: Record<string, any>
}

export interface Tool {
  description: string
  parameters: Record<string, any>
}