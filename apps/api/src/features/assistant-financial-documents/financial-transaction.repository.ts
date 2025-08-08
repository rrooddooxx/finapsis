import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import { supabase } from "../../providers/supabase";
import { 
  financialTransactions, 
  NewFinancialTransactionParams, 
  UpdateFinancialTransactionParams,
  FinancialTransaction 
} from "../../providers/supabase/schema/financial-transactions";
import { 
  documentProcessingLogs,
  NewDocumentProcessingLogParams,
  UpdateDocumentProcessingLogParams,
  DocumentProcessingLog
} from "../../providers/supabase/schema/document-processing-logs";
import { devLogger } from "../../utils/logger.utils";

export interface TransactionQueryFilters {
  userId: string;
  transactionType?: 'INCOME' | 'EXPENSE';
  category?: string;
  status?: 'PENDING_CLASSIFICATION' | 'CLASSIFIED' | 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED';
  dateFrom?: Date;
  dateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  merchant?: string;
  currency?: string;
}

export interface TransactionQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'date' | 'amount' | 'created_at';
  orderDirection?: 'asc' | 'desc';
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  categoryBreakdown: Record<string, { amount: number; count: number }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
}

export class FinancialTransactionRepository {
  
  /**
   * Create a new financial transaction
   */
  async create(transaction: NewFinancialTransactionParams): Promise<FinancialTransaction> {
    try {
      devLogger('FinancialTransactionRepository', `💾 Creating new financial transaction - User: ${transaction.userId}, Type: ${transaction.transactionType}, Amount: ${transaction.amount}, Category: ${transaction.category}`);

      const [result] = await supabase
        .insert(financialTransactions)
        .values({
          ...transaction,
          transactionDate: transaction.transactionDate
        })
        .returning();

      devLogger('FinancialTransactionRepository', `✅ Transaction created successfully - ID: ${result.id}`);

      return result;

    } catch (error) {
      devLogger('FinancialTransactionRepository', `❌ Error creating transaction: ${error}`);
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing financial transaction
   */
  async update(id: string, updates: UpdateFinancialTransactionParams): Promise<FinancialTransaction | null> {
    try {
      devLogger('FinancialTransactionRepository', '📝 Updating financial transaction', {
        transactionId: id,
        updates: Object.keys(updates)
      });

      const [result] = await supabase
        .update(financialTransactions)
        .set({
          ...updates,
          updatedAt: sql`now()`
        })
        .where(eq(financialTransactions.id, id))
        .returning();

      if (!result) {
        devLogger('FinancialTransactionRepository', '⚠️ Transaction not found for update', { transactionId: id });
        return null;
      }

      devLogger('FinancialTransactionRepository', '✅ Transaction updated successfully');
      return result;

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error updating transaction', error);
      throw new Error(`Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a transaction by ID
   */
  async getById(id: string): Promise<FinancialTransaction | null> {
    try {
      const [result] = await supabase
        .select()
        .from(financialTransactions)
        .where(eq(financialTransactions.id, id))
        .limit(1);

      return result || null;

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error getting transaction by ID', error);
      throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(
    filters: TransactionQueryFilters,
    options: TransactionQueryOptions = {}
  ): Promise<{ transactions: FinancialTransaction[]; total: number }> {
    try {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'created_at',
        orderDirection = 'desc'
      } = options;

      // Build where conditions
      const conditions = [eq(financialTransactions.userId, filters.userId)];

      if (filters.transactionType) {
        conditions.push(eq(financialTransactions.transactionType, filters.transactionType));
      }

      if (filters.category) {
        conditions.push(eq(financialTransactions.category, filters.category));
      }

      if (filters.status) {
        conditions.push(eq(financialTransactions.status, filters.status));
      }

      if (filters.dateFrom) {
        conditions.push(gte(financialTransactions.transactionDate, filters.dateFrom));
      }

      if (filters.dateTo) {
        conditions.push(lte(financialTransactions.transactionDate, filters.dateTo));
      }

      if (filters.amountFrom) {
        conditions.push(gte(financialTransactions.amount, filters.amountFrom.toString()));
      }

      if (filters.amountTo) {
        conditions.push(lte(financialTransactions.amount, filters.amountTo.toString()));
      }

      if (filters.merchant) {
        conditions.push(eq(financialTransactions.merchant, filters.merchant));
      }

      if (filters.currency) {
        conditions.push(eq(financialTransactions.currency, filters.currency));
      }

      const whereClause = and(...conditions);

      // Get total count
      const [countResult] = await supabase
        .select({ count: sql<number>`count(*)` })
        .from(financialTransactions)
        .where(whereClause);

      const total = countResult?.count || 0;

      // Build order by clause
      const orderColumn = orderBy === 'date' ? financialTransactions.transactionDate :
                         orderBy === 'amount' ? financialTransactions.amount :
                         financialTransactions.createdAt;

      const orderFn = orderDirection === 'asc' ? asc : desc;

      // Get transactions
      const transactions = await supabase
        .select()
        .from(financialTransactions)
        .where(whereClause)
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset);

      devLogger('FinancialTransactionRepository', '📊 Retrieved transactions', {
        userId: filters.userId,
        total,
        returned: transactions.length
      });

      return { transactions, total };

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error getting transactions', error);
      throw new Error(`Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction summary for a user
   */
  async getTransactionSummary(
    userId: string, 
    dateFrom?: Date, 
    dateTo?: Date
  ): Promise<TransactionSummary> {
    try {
      const conditions = [eq(financialTransactions.userId, userId)];
      
      if (dateFrom) {
        conditions.push(gte(financialTransactions.transactionDate, dateFrom));
      }
      
      if (dateTo) {
        conditions.push(lte(financialTransactions.transactionDate, dateTo));
      }

      const whereClause = and(...conditions);

      // Get summary statistics
      const summaryResult = await supabase
        .select({
          transactionType: financialTransactions.transactionType,
          category: financialTransactions.category,
          amount: financialTransactions.amount,
          transactionDate: financialTransactions.transactionDate
        })
        .from(financialTransactions)
        .where(whereClause);

      // Calculate summary
      let totalIncome = 0;
      let totalExpenses = 0;
      let transactionCount = summaryResult.length;
      const categoryBreakdown: Record<string, { amount: number; count: number }> = {};
      const monthlyData: Record<string, { income: number; expenses: number }> = {};

      for (const transaction of summaryResult) {
        const amount = parseFloat(transaction.amount);
        const month = new Date(transaction.transactionDate).toISOString().substring(0, 7); // YYYY-MM

        if (transaction.transactionType === 'INCOME') {
          totalIncome += amount;
          if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
          monthlyData[month].income += amount;
        } else {
          totalExpenses += amount;
          if (!monthlyData[month]) monthlyData[month] = { income: 0, expenses: 0 };
          monthlyData[month].expenses += amount;
        }

        // Category breakdown
        if (!categoryBreakdown[transaction.category]) {
          categoryBreakdown[transaction.category] = { amount: 0, count: 0 };
        }
        categoryBreakdown[transaction.category].amount += amount;
        categoryBreakdown[transaction.category].count += 1;
      }

      const monthlyTrend = Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const summary: TransactionSummary = {
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        transactionCount,
        categoryBreakdown,
        monthlyTrend
      };

      devLogger('FinancialTransactionRepository', '📈 Generated transaction summary', {
        userId,
        totalIncome,
        totalExpenses,
        transactionCount
      });

      return summary;

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error generating transaction summary', error);
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a transaction
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await supabase
        .delete(financialTransactions)
        .where(eq(financialTransactions.id, id));

      const deleted = result.rowCount !== null && result.rowCount > 0;
      
      if (deleted) {
        devLogger('FinancialTransactionRepository', '🗑️ Transaction deleted successfully', { transactionId: id });
      } else {
        devLogger('FinancialTransactionRepository', '⚠️ No transaction found to delete', { transactionId: id });
      }

      return deleted;

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error deleting transaction', error);
      throw new Error(`Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transactions by category
   */
  async getByCategory(
    userId: string, 
    category: string, 
    limit = 20
  ): Promise<FinancialTransaction[]> {
    try {
      const transactions = await supabase
        .select()
        .from(financialTransactions)
        .where(and(
          eq(financialTransactions.userId, userId),
          eq(financialTransactions.category, category)
        ))
        .orderBy(desc(financialTransactions.transactionDate))
        .limit(limit);

      return transactions;

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error getting transactions by category', error);
      throw new Error(`Failed to get transactions by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent transactions for a user
   */
  async getRecent(userId: string, limit = 10): Promise<FinancialTransaction[]> {
    try {
      const transactions = await supabase
        .select()
        .from(financialTransactions)
        .where(eq(financialTransactions.userId, userId))
        .orderBy(desc(financialTransactions.createdAt))
        .limit(limit);

      return transactions;

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error getting recent transactions', error);
      throw new Error(`Failed to get recent transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update transaction status (for workflow management)
   */
  async updateStatus(
    id: string, 
    status: 'PENDING_CLASSIFICATION' | 'CLASSIFIED' | 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED',
    metadata?: Record<string, any>
  ): Promise<FinancialTransaction | null> {
    try {
      const updates: UpdateFinancialTransactionParams = { status };
      
      if (status === 'CLASSIFIED') {
        updates.classifiedAt = new Date();
      } else if (status === 'VERIFIED') {
        updates.verifiedAt = new Date();
      }

      if (metadata) {
        updates.metadata = metadata;
      }

      return this.update(id, updates);

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error updating transaction status', error);
      throw error;
    }
  }

  /**
   * Get transactions requiring manual review
   */
  async getForManualReview(
    userId?: string,
    limit = 50
  ): Promise<FinancialTransaction[]> {
    try {
      const conditions = [eq(financialTransactions.status, 'MANUAL_REVIEW')];
      
      if (userId) {
        conditions.push(eq(financialTransactions.userId, userId));
      }

      const transactions = await supabase
        .select()
        .from(financialTransactions)
        .where(and(...conditions))
        .orderBy(desc(financialTransactions.createdAt))
        .limit(limit);

      return transactions;

    } catch (error) {
      devLogger('FinancialTransactionRepository', '❌ Error getting transactions for manual review', error);
      throw new Error(`Failed to get transactions for review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const financialTransactionRepository = new FinancialTransactionRepository();