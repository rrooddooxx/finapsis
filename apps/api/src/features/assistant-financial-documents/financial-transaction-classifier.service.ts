import { devLogger } from "../../utils/logger.utils";
import { chileanExpenseCategories, chileanIncomeCategories } from "../../providers/supabase/schema/transaction-categories";

export interface ExtractedFinancialData {
  text: string;
  amounts: number[];
  dates: string[];
  merchant?: string | null;
  tables?: any[];
  keyValuePairs?: any[];
}

export interface ClassificationResult {
  transactionType: 'INCOME' | 'EXPENSE';
  category: string;
  subcategory?: string;
  amount: number;
  currency: string;
  transactionDate: Date;
  description: string;
  merchant?: string;
  confidence: number;
  reasoning: string;
  extractedEntities: Record<string, any>;
}

export interface DocumentContext {
  documentType?: string;
  fileName?: string;
  language?: string;
}

export class FinancialTransactionClassifier {
  private readonly chileanKeywords: Map<string, { category: string; type: 'INCOME' | 'EXPENSE'; weight: number }>;
  private readonly chileanPatterns: Map<RegExp, { category: string; type: 'INCOME' | 'EXPENSE'; weight: number }>;

  constructor() {
    this.chileanKeywords = new Map();
    this.chileanPatterns = new Map();
    this.initializeChileanClassifiers();
  }

  /**
   * Main classification method that intelligently categorizes Chilean financial documents
   */
  async classifyTransaction(
    extractedData: ExtractedFinancialData, 
    documentContext: DocumentContext
  ): Promise<ClassificationResult> {
    devLogger('FinancialTransactionClassifier', '🧠 Starting intelligent transaction classification', {
      textLength: extractedData.text?.length || 0,
      amountCount: extractedData.amounts?.length || 0,
      documentType: documentContext.documentType
    });

    try {
      // 1. Determine transaction type (INCOME vs EXPENSE)
      const transactionType = this.determineTransactionType(extractedData.text, documentContext);
      
      // 2. Extract primary amount
      const amount = this.extractPrimaryAmount(extractedData.amounts || []);
      
      // 3. Classify category based on transaction type
      const categoryResult = this.categorizeTransaction(
        extractedData.text, 
        transactionType, 
        documentContext
      );
      
      // 4. Extract transaction date
      const transactionDate = this.extractTransactionDate(extractedData.dates || []);
      
      // 5. Generate description
      const description = this.generateDescription(extractedData.text, categoryResult.category);
      
      // 6. Extract merchant information
      const merchant = this.extractMerchant(extractedData.text, extractedData.keyValuePairs);
      
      // 7. Calculate confidence score
      const confidence = this.calculateConfidence(
        extractedData, 
        categoryResult, 
        documentContext,
        amount,
        transactionDate
      );

      const result: ClassificationResult = {
        transactionType,
        category: categoryResult.category,
        subcategory: categoryResult.subcategory,
        amount,
        currency: 'CLP',
        transactionDate,
        description,
        merchant,
        confidence,
        reasoning: categoryResult.reasoning,
        extractedEntities: {
          detectedAmounts: extractedData.amounts,
          detectedDates: extractedData.dates,
          textLength: extractedData.text?.length || 0,
          documentType: documentContext.documentType,
          keywordMatches: categoryResult.matchedKeywords || [],
          patternMatches: categoryResult.matchedPatterns || []
        }
      };

      devLogger('FinancialTransactionClassifier', '✅ Classification completed', {
        transactionType: result.transactionType,
        category: result.category,
        amount: result.amount,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      devLogger('FinancialTransactionClassifier', '❌ Error during classification', error);
      throw new Error(`Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Determine if transaction is INCOME or EXPENSE based on Chilean document patterns
   */
  private determineTransactionType(text: string, context: DocumentContext): 'INCOME' | 'EXPENSE' {
    const lowerText = text.toLowerCase();
    
    // Document type based rules for Chilean documents
    if (context.documentType === 'INVOICE' && this.isInvoiceFromUser(text)) {
      return 'INCOME'; // User is billing someone (factura emitida)
    }
    
    if (context.documentType === 'PAYSLIP') {
      return 'INCOME'; // Payslip is always income (liquidación de sueldo)
    }

    // Chilean-specific income keywords
    const chileanIncomeKeywords = [
      'sueldo', 'salario', 'remuneracion', 'liquidacion', 'haberes',
      'honorarios', 'freelance', 'independiente', 'servicios', 'consultoria',
      'ventas', 'factura emitida', 'ingreso', 'cobro',
      'dividendos', 'intereses', 'inversion', 'renta', 'deposito plazo',
      'bono', 'subsidio', 'devolucion', 'reembolso', 'premio'
    ];

    // Chilean-specific expense keywords
    const chileanExpenseKeywords = [
      'compra', 'pago', 'factura', 'boleta', 'recibo', 'gasto',
      'supermercado', 'restaurante', 'comida', 'bencina', 'combustible',
      'luz', 'agua', 'gas', 'internet', 'telefono', 'cable',
      'medico', 'farmacia', 'clinica', 'hospital', 'medicina',
      'colegio', 'universidad', 'educacion', 'matricula'
    ];

    // Calculate keyword scores
    const incomeScore = this.calculateKeywordScore(lowerText, chileanIncomeKeywords);
    const expenseScore = this.calculateKeywordScore(lowerText, chileanExpenseKeywords);

    // Check for Chilean business patterns
    const businessPatterns = [
      /rut[\s:]?\d{2}\.\d{3}\.\d{3}[-]?[\dk]/gi, // RUT pattern
      /factura\s+electronica/gi,
      /boleta\s+electronica/gi
    ];

    const hasBusinessPatterns = businessPatterns.some(pattern => pattern.test(text));
    
    if (hasBusinessPatterns && incomeScore === expenseScore) {
      // If business document and scores are tied, lean towards expense (most common)
      return 'EXPENSE';
    }

    return incomeScore > expenseScore ? 'INCOME' : 'EXPENSE';
  }

  /**
   * Categorize transaction based on Chilean financial categories
   */
  private categorizeTransaction(
    text: string, 
    transactionType: 'INCOME' | 'EXPENSE',
    context: DocumentContext
  ): { category: string; subcategory?: string; reasoning: string; matchedKeywords?: string[]; matchedPatterns?: string[] } {
    const lowerText = text.toLowerCase();
    const categories = transactionType === 'EXPENSE' ? chileanExpenseCategories : chileanIncomeCategories;
    
    let bestMatch = {
      category: transactionType === 'EXPENSE' ? 'otros_gastos' : 'otros_ingresos',
      subcategory: undefined,
      score: 0,
      matchedKeywords: [] as string[],
      matchedPatterns: [] as string[],
      reasoning: 'Clasificación por defecto'
    };

    // Score each category
    for (const categoryData of categories) {
      let score = 0;
      const matchedKeywords: string[] = [];
      const matchedPatterns: string[] = [];

      // Check keywords
      if (categoryData.keywords) {
        for (const keyword of categoryData.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            score += 2; // Base keyword weight
            matchedKeywords.push(keyword);
          }
        }
      }

      // Check patterns
      if (categoryData.patterns) {
        for (const pattern of categoryData.patterns) {
          const regex = new RegExp(pattern, 'gi');
          if (regex.test(text)) {
            score += 3; // Pattern weight higher than keyword
            matchedPatterns.push(pattern);
          }
        }
      }

      // Check subcategories
      let bestSubcategory: string | undefined;
      if (categoryData.subcategories && score > 0) {
        let bestSubScore = 0;
        for (const subcat of categoryData.subcategories) {
          let subScore = 0;
          for (const keyword of subcat.keywords || []) {
            if (lowerText.includes(keyword.toLowerCase())) {
              subScore += 1;
            }
          }
          if (subScore > bestSubScore) {
            bestSubScore = subScore;
            bestSubcategory = subcat.name;
            score += subScore; // Add subcategory score
          }
        }
      }

      // Document type bonus
      if (this.getDocumentTypeCategoryBonus(context.documentType, categoryData.name)) {
        score += 1;
      }

      if (score > bestMatch.score) {
        bestMatch = {
          category: categoryData.name,
          subcategory: bestSubcategory,
          score,
          matchedKeywords,
          matchedPatterns,
          reasoning: `Coincidencia con ${matchedKeywords.length} palabras clave y ${matchedPatterns.length} patrones`
        };
      }
    }

    return {
      category: bestMatch.category,
      subcategory: bestMatch.subcategory,
      reasoning: bestMatch.reasoning,
      matchedKeywords: bestMatch.matchedKeywords,
      matchedPatterns: bestMatch.matchedPatterns
    };
  }

  /**
   * Extract the primary transaction amount from detected amounts
   */
  private extractPrimaryAmount(amounts: number[]): number {
    if (!amounts || amounts.length === 0) {
      return 0;
    }

    // If only one amount, return it
    if (amounts.length === 1) {
      return amounts[0];
    }

    // For multiple amounts, return the largest (likely the main transaction amount)
    // Filter out very small amounts (likely cents or irrelevant numbers)
    const significantAmounts = amounts.filter(amount => amount >= 100); // At least 100 CLP
    
    if (significantAmounts.length === 0) {
      return Math.max(...amounts); // Fallback to largest if no significant amounts
    }

    return Math.max(...significantAmounts);
  }

  /**
   * Extract transaction date from detected dates
   */
  private extractTransactionDate(dates: string[]): Date {
    if (!dates || dates.length === 0) {
      return new Date(); // Default to current date
    }

    // Try to parse each date and return the most recent valid one
    const parsedDates = dates
      .map(dateStr => {
        // Try multiple Chilean date formats
        const formats = [
          /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/,  // DD/MM/YYYY or DD-MM-YYYY
          /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,    // YYYY/MM/DD or YYYY-MM-DD
        ];

        for (const format of formats) {
          const match = dateStr.match(format);
          if (match) {
            let [, part1, part2, part3] = match;
            
            // Determine if it's DD/MM/YYYY or YYYY/MM/DD format
            if (parseInt(part1) > 31) {
              // YYYY/MM/DD format
              const date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3));
              if (!isNaN(date.getTime())) return date;
            } else {
              // DD/MM/YYYY format (Chilean standard)
              let year = parseInt(part3);
              if (year < 100) year += 2000; // Convert 2-digit year
              const date = new Date(year, parseInt(part2) - 1, parseInt(part1));
              if (!isNaN(date.getTime())) return date;
            }
          }
        }

        // Fallback: try direct parsing
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) ? date : null;
      })
      .filter(date => date !== null) as Date[];

    if (parsedDates.length === 0) {
      return new Date(); // Default to current date
    }

    // Return the most recent date (but not in the future)
    const now = new Date();
    const validDates = parsedDates.filter(date => date <= now);
    
    if (validDates.length === 0) {
      return new Date(); // All dates are in future, use current date
    }

    return validDates.reduce((latest, current) => 
      current > latest ? current : latest
    );
  }

  /**
   * Generate a descriptive transaction description
   */
  private generateDescription(text: string, category: string): string {
    // Clean the text and extract key information
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    
    // For Chilean documents, try to extract business name or key description
    const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for business names or key descriptive lines
    for (const line of lines.slice(0, 5)) { // Check first 5 lines
      if (line.length > 10 && line.length < 100) {
        // Skip lines that are mostly numbers or common headers
        if (!/^\d+[\d\s,.-]*$/.test(line) && 
            !line.toLowerCase().includes('total') &&
            !line.toLowerCase().includes('subtotal')) {
          return line;
        }
      }
    }

    // Fallback: generate description based on category
    const categoryDescriptions: Record<string, string> = {
      'transporte': 'Gasto en transporte',
      'servicios_basicos': 'Pago de servicios básicos',
      'alimentacion': 'Gasto en alimentación',
      'salud': 'Gasto médico o de salud',
      'educacion': 'Gasto en educación',
      'entretenimiento': 'Gasto en entretenimiento',
      'sueldo': 'Ingreso por sueldo',
      'trabajo_independiente': 'Ingreso por trabajo independiente',
      'negocio': 'Ingreso por negocio',
      'inversiones': 'Ingreso por inversiones'
    };

    return categoryDescriptions[category] || 'Transacción financiera';
  }

  /**
   * Extract merchant information from text and key-value pairs
   */
  private extractMerchant(text: string, keyValuePairs?: any[]): string | undefined {
    // First try to find merchant in key-value pairs
    if (keyValuePairs && keyValuePairs.length > 0) {
      const merchantKeys = ['merchant', 'comercio', 'empresa', 'proveedor', 'store', 'tienda'];
      for (const pair of keyValuePairs) {
        if (pair.key && pair.value) {
          const lowerKey = pair.key.toLowerCase();
          if (merchantKeys.some(key => lowerKey.includes(key))) {
            return pair.value.toString().trim();
          }
        }
      }
    }

    // Extract from text - look for RUT patterns (Chilean business identifier)
    const rutMatch = text.match(/([A-ZÀ-ÿ][A-ZÀ-ÿ\s]+)\s+RUT[\s:]?\d{2}\.\d{3}\.\d{3}[-]?[\dk]/i);
    if (rutMatch) {
      return rutMatch[1].trim();
    }

    // Look for business name patterns in first few lines
    const lines = text.split('\n').slice(0, 3);
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length > 5 && cleanLine.length < 50) {
        // Skip lines that are mostly numbers
        if (!/^\d+[\d\s,.-]*$/.test(cleanLine)) {
          return cleanLine;
        }
      }
    }

    return undefined;
  }

  /**
   * Calculate overall confidence score for the classification
   */
  private calculateConfidence(
    extractedData: ExtractedFinancialData,
    categoryResult: { matchedKeywords?: string[]; matchedPatterns?: string[] },
    documentContext: DocumentContext,
    amount: number,
    transactionDate: Date
  ): number {
    let confidence = 0.3; // Base confidence

    // Text quality
    if (extractedData.text && extractedData.text.length > 50) {
      confidence += 0.1;
    }

    // Amount detection
    if (amount > 0) {
      confidence += 0.2;
    }

    // Date detection (not default current date)
    const now = new Date();
    if (Math.abs(transactionDate.getTime() - now.getTime()) > 86400000) { // More than 1 day difference
      confidence += 0.1;
    }

    // Keyword matches
    const keywordMatches = categoryResult.matchedKeywords?.length || 0;
    confidence += Math.min(keywordMatches * 0.05, 0.15);

    // Pattern matches (higher weight)
    const patternMatches = categoryResult.matchedPatterns?.length || 0;
    confidence += Math.min(patternMatches * 0.1, 0.2);

    // Document type confidence
    if (documentContext.documentType && documentContext.documentType !== 'OTHERS') {
      confidence += 0.1;
    }

    // Merchant extraction
    if (extractedData.merchant || this.extractMerchant(extractedData.text, extractedData.keyValuePairs)) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Helper methods
   */
  private isInvoiceFromUser(text: string): boolean {
    // Check if this is an invoice issued by the user (income) vs received (expense)
    const incomeInvoiceKeywords = ['factura emitida', 'factura de venta', 'cobro', 'pago recibido'];
    const lowerText = text.toLowerCase();
    return incomeInvoiceKeywords.some(keyword => lowerText.includes(keyword));
  }

  private calculateKeywordScore(text: string, keywords: string[]): number {
    return keywords.reduce((score, keyword) => {
      return score + (text.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
  }

  private getDocumentTypeCategoryBonus(documentType: string | undefined, category: string): boolean {
    if (!documentType) return false;
    
    const bonusMap: Record<string, string[]> = {
      'RECEIPT': ['alimentacion', 'transporte', 'servicios_basicos'],
      'INVOICE': ['servicios_basicos', 'salud', 'educacion'],
      'PAYSLIP': ['sueldo'],
      'BANK_STATEMENT': ['inversiones', 'sueldo']
    };

    return bonusMap[documentType]?.includes(category) || false;
  }

  private initializeChileanClassifiers(): void {
    // Initialize Chilean-specific keywords and patterns
    // This could be expanded with more sophisticated ML-based classification in the future
    devLogger('FinancialTransactionClassifier', '🇨🇱 Initialized Chilean financial document classifier');
  }
}

export const financialTransactionClassifier = new FinancialTransactionClassifier();