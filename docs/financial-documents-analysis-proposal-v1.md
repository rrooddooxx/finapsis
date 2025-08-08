Based on the extracted document data, here's how I would implement a financial transaction
classification system:

1. Financial Transaction Classification Service

Create a service that analyzes the extracted text to determine transaction type and details:

```json
export interface FinancialTransaction {
userId: string;
documentId: string;
transactionType: 'INCOME' | 'EXPENSE';
category: string;
subcategory?: string;
amount: number;
currency: string;
date: Date;
description: string;
merchant?: string;
confidence: number;
metadata: {
documentType: string;
extractedText: string;
processingMethod: 'OCR' | 'MANUAL';
};
```

1. Transaction Type Detection Logic

```tsx
class FinancialTransactionClassifier {
  
	classifyTransaction(extractedData: any,
	documentType: string): FinancialTransaction {
		
		const transactionType = this.determineTransactionType(extractedData.text,
		 documentType);
		
		const amount = this.extractPrimaryAmount(
		extractedData.financialData.amounts);
		
		const category = this.categorizeTransaction(extractedData.text, 
		transactionType);

	  return {
	    transactionType,
	    amount,
	    category,
	    date: this.extractTransactionDate(extractedData.financialData.dates),
	    description: this.generateDescription(extractedData.text),
	    merchant: extractedData.financialData.merchant,
	    confidence: this.calculateConfidence(extractedData),
	    // ... other fields
	  };
}

private determineTransactionType(text: string, documentType: string): 'INCOME' | 'EXPENSE' {
  const lowerText = text.toLowerCase();

  // Document type based rules
  if (documentType === 'INVOICE' && this.isInvoiceFromUser(text)) {
    return 'INCOME'; // User is billing someone
  }

  // Keyword based classification
  const incomeKeywords = ['salary', 'payment received', 'deposit', 'refund', 'honorarios'];
  const expenseKeywords = ['payment', 'purchase', 'bill', 'invoice', 'fee', 'subscription'];

  const incomeScore = this.calculateKeywordScore(lowerText, incomeKeywords);
  const expenseScore = this.calculateKeywordScore(lowerText, expenseKeywords);

  return incomeScore > expenseScore ? 'INCOME' : 'EXPENSE';
}
}
```

1. Database Schema Design

- Financial transactions table

```sql
CREATE TABLE financial_transactions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id),
	document_id UUID NOT NULL REFERENCES documents(id),
	transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
	category VARCHAR(50) NOT NULL,
	subcategory VARCHAR(50),
	amount DECIMAL(15,2) NOT NULL,
	currency VARCHAR(3) DEFAULT 'USD',
	transaction_date TIMESTAMP NOT NULL,
	description TEXT,
	merchant VARCHAR(255),
	confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
	created_at TIMESTAMP DEFAULT NOW(),
	updated_at TIMESTAMP DEFAULT NOW()
);
```

- Transaction categories reference table

```sql
CREATE TABLE transaction_categories (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name VARCHAR(50) UNIQUE NOT NULL,
	type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
	parent_category_id UUID REFERENCES transaction_categories(id),
	description TEXT
);
```

1. Integration with Document Processor

```tsx
Modify the document processing workflow:

// In the document upload worker
async processDocumentUpload(job: Job<DocumentUploadJobData>) {
// 1. Analyze document with OCI
const analysisResult = await documentAnalyzerService.analyzeDocument(request);
if (analysisResult.status === 'completed' && analysisResult.extractedData) {
  // 2. Classify as financial transaction
  const transaction = await financialClassifier.classifyTransaction(
    analysisResult.extractedData,
    request.config.documentType
  );

  // 3. Store in financial transactions table
  await financialTransactionService.createTransaction(transaction);

  // 4. Update user's financial summary
  await userFinancialSummaryService.updateSummary(transaction.userId, transaction);
	}
}

```

1. Transaction Categories System

Pre-defined categories based on document analysis:

```tsx
const TRANSACTION_CATEGORIES = {
INCOME: {
'professional_services': ['consulting', 'freelance', 'honorarios'],
'salary': ['salary', 'wage', 'payroll'],
'business': ['invoice', 'payment_received', 'sales'],
'investment': ['dividend', 'interest', 'capital_gain'],
'other_income': ['refund', 'bonus', 'gift']
},
EXPENSE: {
'utilities': ['electricity', 'water', 'gas', 'internet'],
'transportation': ['fuel', 'parking', 'public_transport', 'uber'],
'food': ['restaurant', 'grocery', 'food_delivery'],
'healthcare': ['pharmacy', 'doctor', 'hospital', 'insurance'],
'education': ['course', 'books', 'tuition', 'certification'],
'entertainment': ['movie', 'concert', 'subscription', 'gaming'],
'shopping': ['clothing', 'electronics', 'home', 'personal_care']
}
};
```

1. Confidence Scoring System

```tsx
private calculateConfidence(extractedData: any): number {
let confidence = 0.5; // Base confidence
// Amount clarity (clear monetary values found)
if (extractedData.financialData.amounts.length > 0) confidence += 0.2;

// Date clarity (clear dates found)
if (extractedData.financialData.dates.length > 0) confidence += 0.1;

// Merchant/entity identification
if (extractedData.financialData.merchant) confidence += 0.1;

// Document type confidence
if (extractedData.metadata.documentType !== 'OTHERS') confidence += 0.1;

// Text quality (OCR confidence from words array)
const avgWordConfidence = this.calculateAverageWordConfidence(extractedData);
confidence *= avgWordConfidence;

return Math.min(confidence, 1.0);
}
```

1. User Financial Dashboard Integration

Create aggregated views for user financial status:

```tsx
interface UserFinancialSummary {
userId: string;
period: 'monthly' | 'yearly';
totalIncome: number;
totalExpenses: number;
netIncome: number;
categoryBreakdown: Record<string, number>;
documentCount: number;
lastUpdated: Date;
}
```

This approach gives you:

- Automatic transaction classification from documents
- Confidence scoring for manual review of uncertain classifications
- Structured financial data for budgeting and analysis
- Category-based insights for spending patterns
- Scalable architecture that can learn from user corrections over time