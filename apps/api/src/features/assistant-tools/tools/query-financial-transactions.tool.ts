import { tool } from 'ai';
import { z } from 'zod';
import { financialTransactionRepository, TransactionQueryFilters, TransactionQueryOptions } from '../../assistant-financial-documents/financial-transaction.repository';
import { devLogger } from '../../../utils/logger.utils';

const queryFinancialTransactionsAction = async (params: {
  userId: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  transactionType?: 'INCOME' | 'EXPENSE';
  amountFrom?: number;
  amountTo?: number;
  merchant?: string;
  limit?: number;
  summaryOnly?: boolean;
}) => {
  const {
    userId,
    dateFrom,
    dateTo,
    category,
    transactionType,
    amountFrom,
    amountTo,
    merchant,
    limit = 10,
    summaryOnly = false
  } = params;

  try {
    devLogger('QueryFinancialTransactions', `🔍 Querying financial transactions for user: ${userId}`);
    devLogger('QueryFinancialTransactions', `Filters: type=${transactionType}, category=${category}, amount=${amountFrom}-${amountTo}, dates=${dateFrom} to ${dateTo}, merchant=${merchant}`);

    // Build filters
    const filters: TransactionQueryFilters = {
      userId
    };

    if (transactionType) {
      filters.transactionType = transactionType;
    }

    if (category) {
      filters.category = category;
    }

    if (merchant) {
      filters.merchant = merchant;
    }

    if (amountFrom) {
      filters.amountFrom = amountFrom;
    }

    if (amountTo) {
      filters.amountTo = amountTo;
    }

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    // Query options
    const options: TransactionQueryOptions = {
      limit,
      orderBy: 'date',
      orderDirection: 'desc'
    };

    if (summaryOnly) {
      // Get transaction summary instead of individual transactions
      const summary = await financialTransactionRepository.getTransactionSummary(
        userId,
        filters.dateFrom,
        filters.dateTo
      );

      return {
        success: true,
        type: 'summary',
        data: {
          totalIncome: summary.totalIncome,
          totalExpenses: summary.totalExpenses,
          netIncome: summary.netIncome,
          transactionCount: summary.transactionCount,
          categoryBreakdown: summary.categoryBreakdown,
          monthlyTrend: summary.monthlyTrend
        },
        message: `Resumen financiero encontrado: ${summary.transactionCount} transacciones, ingresos totales: $${summary.totalIncome.toLocaleString('es-CL')} CLP, gastos totales: $${summary.totalExpenses.toLocaleString('es-CL')} CLP`
      };
    }

    // Get individual transactions
    const result = await financialTransactionRepository.getTransactions(filters, options);

    const transactions = result.transactions.map(t => ({
      id: t.id,
      transactionType: t.transactionType,
      category: t.category,
      subcategory: t.subcategory,
      amount: parseFloat(t.amount),
      currency: t.currency,
      transactionDate: t.transactionDate,
      description: t.description,
      merchant: t.merchant,
      confidenceScore: parseFloat(t.confidenceScore || '0'),
      status: t.status,
      createdAt: t.createdAt
    }));

    devLogger('QueryFinancialTransactions', `✅ Found ${transactions.length} transactions (total: ${result.total})`);

    return {
      success: true,
      type: 'transactions',
      data: {
        transactions,
        total: result.total,
        returned: transactions.length
      },
      message: `Se encontraron ${result.total} transacciones. Mostrando las ${transactions.length} más recientes.`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    devLogger('QueryFinancialTransactions', `❌ Error querying transactions: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      message: 'Error al buscar transacciones financieras. Intenta de nuevo.'
    };
  }
};

export const queryFinancialTransactionsTool = tool({
  description: 'Query and retrieve user financial transactions from database. Can filter by date, category, amount, merchant, and transaction type. Supports both detailed transaction lists and summary reports.',
  inputSchema: z.object({
    userId: z.string().describe('The user ID to query transactions for'),
    dateFrom: z.string().optional().describe('Start date filter in ISO format (YYYY-MM-DD)'),
    dateTo: z.string().optional().describe('End date filter in ISO format (YYYY-MM-DD)'),
    category: z.string().optional().describe('Filter by transaction category (e.g., "electronica", "alimentacion", "transporte")'),
    transactionType: z.enum(['INCOME', 'EXPENSE']).optional().describe('Filter by transaction type: INCOME for ingresos, EXPENSE for gastos'),
    amountFrom: z.number().optional().describe('Minimum amount filter (in CLP)'),
    amountTo: z.number().optional().describe('Maximum amount filter (in CLP)'),
    merchant: z.string().optional().describe('Filter by merchant/store name'),
    limit: z.number().default(10).describe('Maximum number of transactions to return (default 10, max 100)'),
    summaryOnly: z.boolean().default(false).describe('If true, returns summary statistics instead of individual transactions')
  }),
  execute: queryFinancialTransactionsAction
});