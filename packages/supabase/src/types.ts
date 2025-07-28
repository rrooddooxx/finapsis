// Generated database types will go here
// For now, we'll use a basic structure that matches our schema

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          phone_number: string
          created_at: string
          monthly_income?: number
          preferences?: Record<string, any>
        }
        Insert: {
          id?: string
          phone_number: string
          monthly_income?: number
          preferences?: Record<string, any>
        }
        Update: {
          phone_number?: string
          monthly_income?: number
          preferences?: Record<string, any>
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          title?: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
        }
        Update: {
          title?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          source: 'web' | 'whatsapp'
          created_at: string
          metadata?: Record<string, any>
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          source: 'web' | 'whatsapp'
          metadata?: Record<string, any>
        }
        Update: {
          content?: string
          metadata?: Record<string, any>
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          category: string
          description?: string
          transaction_date: string
          receipt_url?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          category: string
          description?: string
          transaction_date: string
          receipt_url?: string
        }
        Update: {
          amount?: number
          category?: string
          description?: string
          transaction_date?: string
          receipt_url?: string
        }
      }
      financial_goals: {
        Row: {
          id: string
          user_id: string
          target_amount: number
          current_amount: number
          title: string
          description?: string
          target_date?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_amount: number
          current_amount?: number
          title: string
          description?: string
          target_date?: string
        }
        Update: {
          target_amount?: number
          current_amount?: number
          title?: string
          description?: string
          target_date?: string
        }
      }
      knowledge_base: {
        Row: {
          id: string
          content: string
          embedding: number[]
          source: string
          created_at: string
          metadata?: Record<string, any>
        }
        Insert: {
          id?: string
          content: string
          embedding: number[]
          source: string
          metadata?: Record<string, any>
        }
        Update: {
          content?: string
          embedding?: number[]
          source?: string
          metadata?: Record<string, any>
        }
      }
      agent_results: {
        Row: {
          id: string
          user_id: string
          agent_name: string
          results: Record<string, any>
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_name: string
          results: Record<string, any>
        }
        Update: {
          agent_name?: string
          results?: Record<string, any>
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_knowledge: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          content: string
          similarity: number
          source: string
          metadata: Record<string, any>
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}