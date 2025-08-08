import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  decimal,
  integer,
  timestamp, 
  jsonb, 
  index,
  pgEnum,
  date,
  unique
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "../utils";

// Enum for summary periods
export const summaryPeriodEnum = pgEnum('summary_period', [
  'DAILY',
  'WEEKLY', 
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
]);

export const userFinancialSummary = pgTable(
  'user_financial_summary',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    
    // User reference
    userId: varchar('user_id', { length: 191 }).notNull(),
    
    // Period information
    period: summaryPeriodEnum('period').notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    
    // Financial totals (in CLP)
    totalIncome: decimal('total_income', { precision: 15, scale: 2 }).notNull().default('0'),
    totalExpenses: decimal('total_expenses', { precision: 15, scale: 2 }).notNull().default('0'),
    netIncome: decimal('net_income', { precision: 15, scale: 2 }).notNull().default('0'), // totalIncome - totalExpenses
    
    // Transaction counts
    incomeTransactionCount: integer('income_transaction_count').notNull().default(0),
    expenseTransactionCount: integer('expense_transaction_count').notNull().default(0),
    totalTransactionCount: integer('total_transaction_count').notNull().default(0),
    
    // Category breakdown (JSONB for flexibility)
    expenseCategoryBreakdown: jsonb('expense_category_breakdown'), // { category: amount }
    incomeCategoryBreakdown: jsonb('income_category_breakdown'), // { category: amount }
    
    // Top merchants and patterns
    topMerchants: jsonb('top_merchants'), // Array of { merchant, amount, count }
    topExpenseCategories: jsonb('top_expense_categories'), // Array of { category, amount, percentage }
    
    // Chilean-specific metrics
    clpTotalIncome: decimal('clp_total_income', { precision: 15, scale: 2 }).notNull().default('0'),
    clpTotalExpenses: decimal('clp_total_expenses', { precision: 15, scale: 2 }).notNull().default('0'),
    clpNetIncome: decimal('clp_net_income', { precision: 15, scale: 2 }).notNull().default('0'),
    
    // Savings rate and financial health indicators
    savingsRate: decimal('savings_rate', { precision: 5, scale: 2 }), // Percentage (0.00 to 100.00)
    expenseGrowthRate: decimal('expense_growth_rate', { precision: 5, scale: 2 }), // Compared to previous period
    incomeGrowthRate: decimal('income_growth_rate', { precision: 5, scale: 2 }), // Compared to previous period
    
    // Document processing metrics
    documentsProcessed: integer('documents_processed').notNull().default(0),
    averageProcessingConfidence: decimal('average_processing_confidence', { precision: 3, scale: 2 }),
    manuallyReviewedTransactions: integer('manually_reviewed_transactions').notNull().default(0),
    
    // Additional insights
    insights: jsonb('insights'), // AI-generated insights and recommendations
    
    // Timestamps
    calculatedAt: timestamp('calculated_at').notNull().default(sql`now()`),
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  },
  (table) => ({
    // Unique constraint to prevent duplicate summaries for same user/period
    uniqueUserPeriod: unique('user_financial_summary_user_period_unique').on(
      table.userId, 
      table.period, 
      table.periodStart, 
      table.periodEnd
    ),
    
    // Indexes for efficient querying
    userIdIndex: index('user_financial_summary_user_id_index').on(table.userId),
    periodIndex: index('user_financial_summary_period_index').on(table.period),
    periodStartIndex: index('user_financial_summary_period_start_index').on(table.periodStart),
    
    // Composite indexes for common queries
    userPeriodIndex: index('user_financial_summary_user_period_index').on(table.userId, table.period),
    userDateIndex: index('user_financial_summary_user_date_index').on(table.userId, table.periodStart),
    periodDateIndex: index('user_financial_summary_period_date_index').on(table.period, table.periodStart),
    
    // GIN indexes for JSONB fields
    expenseCategoryIndex: index('user_financial_summary_expense_category_index').using('gin', table.expenseCategoryBreakdown),
    incomeCategoryIndex: index('user_financial_summary_income_category_index').using('gin', table.incomeCategoryBreakdown),
    topMerchantsIndex: index('user_financial_summary_top_merchants_index').using('gin', table.topMerchants),
    insightsIndex: index('user_financial_summary_insights_index').using('gin', table.insights),
  })
);

// Zod schemas for validation
export const insertUserFinancialSummarySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  periodStart: z.date(),
  periodEnd: z.date(),
  totalIncome: z.string().regex(/^\d+(\.\d{1,2})?$/, "Total income must be a valid decimal"),
  totalExpenses: z.string().regex(/^\d+(\.\d{1,2})?$/, "Total expenses must be a valid decimal"),
  netIncome: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Net income must be a valid decimal"),
  incomeTransactionCount: z.number().int().min(0).default(0),
  expenseTransactionCount: z.number().int().min(0).default(0),
  totalTransactionCount: z.number().int().min(0).default(0),
  expenseCategoryBreakdown: z.record(z.string(), z.number()).optional(),
  incomeCategoryBreakdown: z.record(z.string(), z.number()).optional(),
  topMerchants: z.array(z.object({
    merchant: z.string(),
    amount: z.number(),
    count: z.number(),
  })).optional(),
  topExpenseCategories: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    percentage: z.number(),
  })).optional(),
  clpTotalIncome: z.string().regex(/^\d+(\.\d{1,2})?$/, "CLP total income must be a valid decimal"),
  clpTotalExpenses: z.string().regex(/^\d+(\.\d{1,2})?$/, "CLP total expenses must be a valid decimal"),
  clpNetIncome: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "CLP net income must be a valid decimal"),
  savingsRate: z.number().min(0).max(100).optional(),
  expenseGrowthRate: z.number().optional(),
  incomeGrowthRate: z.number().optional(),
  documentsProcessed: z.number().int().min(0).default(0),
  averageProcessingConfidence: z.number().min(0).max(1).optional(),
  manuallyReviewedTransactions: z.number().int().min(0).default(0),
  insights: z.record(z.any()).optional(),
});

export const updateUserFinancialSummarySchema = insertUserFinancialSummarySchema
  .partial()
  .omit({ userId: true, period: true, periodStart: true, periodEnd: true }); // These should not be updatable

// Select schema for API responses
export const selectUserFinancialSummarySchema = createSelectSchema(userFinancialSummary);

// Types for TypeScript
export type NewUserFinancialSummaryParams = z.infer<typeof insertUserFinancialSummarySchema>;
export type UpdateUserFinancialSummaryParams = z.infer<typeof updateUserFinancialSummarySchema>;
export type UserFinancialSummary = typeof userFinancialSummary.$inferSelect;

// Schema for category breakdown
export const categoryBreakdownSchema = z.record(
  z.string(), // category name
  z.number()  // amount
);

// Schema for top merchants
export const topMerchantSchema = z.object({
  merchant: z.string(),
  amount: z.number(),
  count: z.number(),
  percentage: z.number().optional(),
});

// Schema for top expense categories
export const topExpenseCategorySchema = z.object({
  category: z.string(),
  subcategory: z.string().optional(),
  amount: z.number(),
  count: z.number(),
  percentage: z.number(),
  averageTransactionAmount: z.number(),
});

// Schema for financial insights
export const financialInsightSchema = z.object({
  type: z.enum(['savings_opportunity', 'spending_pattern', 'budget_alert', 'income_trend', 'expense_anomaly']),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  category: z.string().optional(),
  amount: z.number().optional(),
  recommendation: z.string().optional(),
  generatedAt: z.string(), // ISO timestamp
});

// Helper types for structured data
export type CategoryBreakdown = z.infer<typeof categoryBreakdownSchema>;
export type TopMerchant = z.infer<typeof topMerchantSchema>;
export type TopExpenseCategory = z.infer<typeof topExpenseCategorySchema>;
export type FinancialInsight = z.infer<typeof financialInsightSchema>;

// Utility functions for period calculation
export const getPeriodDates = (period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY', date: Date = new Date()) => {
  const result = { start: new Date(date), end: new Date(date) };
  
  switch (period) {
    case 'DAILY':
      result.start.setHours(0, 0, 0, 0);
      result.end.setHours(23, 59, 59, 999);
      break;
      
    case 'WEEKLY':
      const dayOfWeek = date.getDay();
      result.start.setDate(date.getDate() - dayOfWeek);
      result.start.setHours(0, 0, 0, 0);
      result.end.setDate(date.getDate() + (6 - dayOfWeek));
      result.end.setHours(23, 59, 59, 999);
      break;
      
    case 'MONTHLY':
      result.start = new Date(date.getFullYear(), date.getMonth(), 1);
      result.end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
      
    case 'QUARTERLY':
      const quarter = Math.floor(date.getMonth() / 3);
      result.start = new Date(date.getFullYear(), quarter * 3, 1);
      result.end = new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      break;
      
    case 'YEARLY':
      result.start = new Date(date.getFullYear(), 0, 1);
      result.end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
  }
  
  return result;
};