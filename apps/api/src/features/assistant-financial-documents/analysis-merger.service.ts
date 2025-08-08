import { devLogger } from "../../utils/logger.utils";

export interface AnalysisSource {
  source: 'OCR' | 'LLM' | 'VISION';
  confidence: number;
  transactionType?: 'INCOME' | 'EXPENSE';
  category?: string;
  subcategory?: string;
  amount?: number;
  currency?: string;
  merchant?: string;
  description?: string;
  transactionDate?: Date | string;
  rawData?: any;
}

export interface MergedAnalysisResult {
  finalResult: {
    transactionType: 'INCOME' | 'EXPENSE';
    category: string;
    subcategory?: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    description: string;
    merchant?: string;
  };
  finalConfidence: number;
  sourcesUsed: string[];
  discrepancies: string[];
  reasoning: string;
}

/**
 * Service to merge and analyze results from multiple document analysis sources
 */
export class AnalysisMergerService {

  /**
   * Merge results from OCR, LLM, and Vision API analysis
   */
  mergeAnalysisResults(
    classificationResult: any,
    llmResult: any,
    visionResult?: any
  ): MergedAnalysisResult {

    devLogger('AnalysisMerger', `🔍 Starting multi-source analysis merge - Classification: ${!!classificationResult}, LLM: ${!!llmResult}, Vision: ${!!visionResult?.success}`);

    const sources: AnalysisSource[] = [];
    const discrepancies: string[] = [];
    const sourcesUsed: string[] = [];

    // Add OCR/Classification source
    if (classificationResult) {
      sources.push({
        source: 'OCR',
        confidence: classificationResult.confidence || 0,
        transactionType: classificationResult.transactionType,
        category: classificationResult.category,
        subcategory: classificationResult.subcategory,
        amount: classificationResult.amount,
        currency: classificationResult.currency || 'CLP',
        merchant: classificationResult.merchant,
        description: classificationResult.description,
        transactionDate: classificationResult.transactionDate,
        rawData: classificationResult
      });
      sourcesUsed.push('OCR Classification');
    }

    // Add LLM source
    if (llmResult) {
      sources.push({
        source: 'LLM',
        confidence: llmResult.confidence || 0,
        transactionType: llmResult.transactionType,
        category: llmResult.category,
        amount: llmResult.amount,
        currency: llmResult.currency || 'CLP',
        merchant: llmResult.merchant,
        description: llmResult.description,
        rawData: llmResult
      });
      sourcesUsed.push('LLM Verification');
    }

    // Add Vision source (prioritized for Chilean businesses)
    if (visionResult?.success) {
      sources.push({
        source: 'VISION',
        confidence: visionResult.confidence || 0,
        transactionType: visionResult.transactionInfo?.transactionType,
        category: visionResult.transactionInfo?.category,
        subcategory: visionResult.transactionInfo?.subcategory,
        amount: visionResult.transactionInfo?.amount,
        currency: visionResult.transactionInfo?.currency || 'CLP',
        merchant: visionResult.merchantInfo?.merchantName,
        description: visionResult.transactionInfo?.description,
        transactionDate: visionResult.dates?.[0] ? new Date(visionResult.dates[0]) : undefined,
        rawData: visionResult
      });
      sourcesUsed.push('OpenAI Vision');
    }

    // Find discrepancies between sources
    this.detectDiscrepancies(sources, discrepancies);

    // Determine the best source based on confidence and Chilean context
    const bestSource = this.selectBestSource(sources);
    const finalConfidence = this.calculateFinalConfidence(sources, bestSource);

    const finalResult = {
      transactionType: bestSource.transactionType || 'EXPENSE',
      category: bestSource.category || 'otros_gastos',
      subcategory: bestSource.subcategory,
      amount: bestSource.amount || 0,
      currency: bestSource.currency || 'CLP',
      transactionDate: this.parseTransactionDate(bestSource.transactionDate),
      description: bestSource.description || 'Transacción procesada',
      merchant: bestSource.merchant
    };

    const reasoning = this.generateReasoning(bestSource, sources, discrepancies);

    devLogger('AnalysisMerger', `✅ Analysis merge completed - Source: ${bestSource.source}, Confidence: ${finalConfidence}, Discrepancies: ${discrepancies.length}, Amount: ${finalResult.amount}, Merchant: ${finalResult.merchant}`);

    return {
      finalResult,
      finalConfidence,
      sourcesUsed,
      discrepancies,
      reasoning
    };
  }

  /**
   * Select the best analysis source based on confidence and Chilean context
   */
  private selectBestSource(sources: AnalysisSource[]): AnalysisSource {
    if (sources.length === 0) {
      throw new Error('No analysis sources available');
    }

    // Prioritize Vision API for Chilean documents (better at recognizing local businesses)
    const visionSource = sources.find(s => s.source === 'VISION');
    if (visionSource && visionSource.confidence > 0.7) {
      devLogger('AnalysisMerger', `🎯 Selected Vision API as primary source - Confidence: ${visionSource.confidence}`);
      return visionSource;
    }

    // Sort by confidence and select the highest
    const sortedSources = sources.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const bestSource = sortedSources[0];

    devLogger('AnalysisMerger', `📊 Selected ${bestSource.source} as primary source - Confidence: ${bestSource.confidence}`);

    return bestSource;
  }

  /**
   * Calculate final confidence considering all sources
   */
  private calculateFinalConfidence(sources: AnalysisSource[], bestSource: AnalysisSource): number {
    let baseConfidence = bestSource.confidence || 0;

    // Boost confidence if multiple sources agree
    if (sources.length > 1) {
      const agreements = this.countAgreements(sources);
      const agreementBoost = agreements * 0.1;
      baseConfidence += agreementBoost;
    }

    // Penalize confidence if there are discrepancies
    const visionSource = sources.find(s => s.source === 'VISION');
    const llmSource = sources.find(s => s.source === 'LLM');
    
    if (visionSource && llmSource) {
      // Check amount agreement (within 10%)
      if (visionSource.amount && llmSource.amount) {
        const amountDiff = Math.abs(visionSource.amount - llmSource.amount);
        const amountPercent = amountDiff / Math.max(visionSource.amount, llmSource.amount);
        
        if (amountPercent < 0.1) {
          baseConfidence += 0.1; // Boost for amount agreement
        }
      }
      
      // Check category agreement
      if (visionSource.category === llmSource.category) {
        baseConfidence += 0.05; // Boost for category agreement
      }
    }

    return Math.min(baseConfidence, 1.0);
  }

  /**
   * Detect discrepancies between analysis sources
   */
  private detectDiscrepancies(sources: AnalysisSource[], discrepancies: string[]): void {
    if (sources.length < 2) return;

    const visionSource = sources.find(s => s.source === 'VISION');
    const llmSource = sources.find(s => s.source === 'LLM');
    const ocrSource = sources.find(s => s.source === 'OCR');

    // Check amount discrepancies
    if (visionSource?.amount && llmSource?.amount) {
      const amountDiff = Math.abs(visionSource.amount - llmSource.amount);
      const amountPercent = amountDiff / Math.max(visionSource.amount, llmSource.amount);
      
      if (amountPercent > 0.2) {
        discrepancies.push(`Amount discrepancy: Vision ${visionSource.amount} vs LLM ${llmSource.amount}`);
      }
    }

    // Check category discrepancies
    const categories = sources.map(s => s.category).filter(Boolean);
    const uniqueCategories = Array.from(new Set(categories));
    if (uniqueCategories.length > 1) {
      discrepancies.push(`Category discrepancy: ${uniqueCategories.join(' vs ')}`);
    }

    // Check transaction type discrepancies
    const types = sources.map(s => s.transactionType).filter(Boolean);
    const uniqueTypes = Array.from(new Set(types));
    if (uniqueTypes.length > 1) {
      discrepancies.push(`Transaction type discrepancy: ${uniqueTypes.join(' vs ')}`);
    }
  }

  /**
   * Count agreements between sources
   */
  private countAgreements(sources: AnalysisSource[]): number {
    let agreements = 0;

    // Count category agreements
    const categories = sources.map(s => s.category).filter(Boolean);
    if (categories.length > 1 && new Set(categories).size === 1) {
      agreements++;
    }

    // Count transaction type agreements
    const types = sources.map(s => s.transactionType).filter(Boolean);
    if (types.length > 1 && new Set(types).size === 1) {
      agreements++;
    }

    return agreements;
  }

  /**
   * Parse transaction date from various formats
   */
  private parseTransactionDate(date: Date | string | undefined): Date {
    if (!date) return new Date();
    
    if (date instanceof Date) return date;
    
    try {
      return new Date(date);
    } catch {
      return new Date();
    }
  }

  /**
   * Generate reasoning for the selected result
   */
  private generateReasoning(
    bestSource: AnalysisSource,
    allSources: AnalysisSource[],
    discrepancies: string[]
  ): string {
    const reasons: string[] = [];

    reasons.push(`Selected ${bestSource.source} as primary source (confidence: ${(bestSource.confidence * 100).toFixed(1)}%)`);

    if (bestSource.source === 'VISION') {
      reasons.push('Vision API prioritized for better Chilean business recognition');
    }

    if (allSources.length > 1) {
      const agreements = this.countAgreements(allSources);
      if (agreements > 0) {
        reasons.push(`${agreements} agreement(s) between sources`);
      }
    }

    if (discrepancies.length > 0) {
      reasons.push(`${discrepancies.length} discrepancy(ies) detected`);
    }

    return reasons.join('. ');
  }
}

export const analysisMergerService = new AnalysisMergerService();