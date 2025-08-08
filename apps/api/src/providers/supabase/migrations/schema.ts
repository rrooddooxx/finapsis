import { pgTable, pgEnum, varchar, text, timestamp, numeric, date, index, foreignKey, vector, unique, jsonb, integer, boolean } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const aal_level = pgEnum("aal_level", ['aal1', 'aal2', 'aal3'])
export const code_challenge_method = pgEnum("code_challenge_method", ['s256', 'plain'])
export const factor_status = pgEnum("factor_status", ['unverified', 'verified'])
export const factor_type = pgEnum("factor_type", ['totp', 'webauthn', 'phone'])
export const one_time_token_type = pgEnum("one_time_token_type", ['confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token'])
export const processing_stage = pgEnum("processing_stage", ['DOCUMENT_UPLOAD', 'OCR_EXTRACTION', 'DOCUMENT_CLASSIFICATION', 'TEXT_ANALYSIS', 'LLM_VERIFICATION', 'TRANSACTION_CREATION', 'CONFIDENCE_SCORING', 'FINAL_VALIDATION', 'VISION_ANALYSIS', 'USER_CONFIRMATION', 'CONFIRMATION_PROCESSING'])
export const processing_status = pgEnum("processing_status", ['QUEUED', 'PROCESSING_OCR', 'PROCESSING_CLASSIFICATION', 'PROCESSING_LLM_VERIFICATION', 'COMPLETED', 'FAILED', 'TIMEOUT', 'MANUAL_REVIEW_REQUIRED', 'PROCESSING_VISION', 'PENDING_CONFIRMATION'])
export const summary_period = pgEnum("summary_period", ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
export const transaction_status = pgEnum("transaction_status", ['PENDING_CLASSIFICATION', 'CLASSIFIED', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED'])
export const transaction_type = pgEnum("transaction_type", ['INCOME', 'EXPENSE'])
export const action = pgEnum("action", ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR'])
export const equality_op = pgEnum("equality_op", ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in'])
export const buckettype = pgEnum("buckettype", ['STANDARD', 'ANALYTICS'])


export const personal_knowledge = pgTable("personal_knowledge", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	content: text("content").notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	user_id: varchar("user_id", { length: 191 }).notNull(),
});

export const general_financial_knowledge = pgTable("general_financial_knowledge", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	content: text("content").notNull(),
	category: varchar("category", { length: 50 }).default('general'::character varying).notNull(),
	source: varchar("source", { length: 255 }),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const personal_financial_goals = pgTable("personal_financial_goals", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	user_id: varchar("user_id", { length: 191 }).notNull(),
	goal_type: varchar("goal_type", { length: 100 }).notNull(),
	target_amount: numeric("target_amount", { precision: 15, scale:  2 }),
	current_amount: numeric("current_amount", { precision: 15, scale:  2 }).default('0'),
	target_date: date("target_date"),
	description: text("description").notNull(),
	status: varchar("status", { length: 50 }).default('active'::character varying).notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const personal_embeddings = pgTable("personal_embeddings", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	personal_knowledge_id: varchar("personal_knowledge_id", { length: 191 }).references(() => personal_knowledge.id, { onDelete: "cascade" } ),
	user_id: varchar("user_id", { length: 191 }).notNull(),
	content: text("content").notNull(),
	embedding: vector("embedding", { dimensions: 1536 }).notNull(),
},
(table) => {
	return {
		personalEmbeddingIndex: index("personalEmbeddingIndex").using("hnsw", table.embedding.op("vector_cosine_ops")),
		personalUserIndex: index("personalUserIndex").using("btree", table.user_id),
	}
});

export const users = pgTable("users", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	email: text("email").notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		email_idx: index().using("btree", table.email),
		users_email_unique: unique("users_email_unique").on(table.email),
	}
});

export const embeddings = pgTable("embeddings", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	entity_type: varchar("entity_type", { length: 50 }).notNull(),
	entity_id: varchar("entity_id", { length: 191 }).notNull(),
	user_id: varchar("user_id", { length: 191 }),
	content: text("content").notNull(),
	embedding: vector("embedding", { dimensions: 1536 }).notNull(),
	metadata: jsonb("metadata"),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		ntityIndex: index("embeddingsEntityIndex").using("btree", table.entity_type, table.entity_id),
		ntityTypeIndex: index("embeddingsEntityTypeIndex").using("btree", table.entity_type),
		etadataIndex: index("embeddingsMetadataIndex").using("gin", table.metadata),
		serEntityIndex: index("embeddingsUserEntityIndex").using("btree", table.user_id, table.entity_type),
		serIndex: index("embeddingsUserIndex").using("btree", table.user_id),
		ectorIndex: index("embeddingsVectorIndex").using("hnsw", table.embedding.op("vector_cosine_ops")),
	}
});

export const general_financial_embeddings = pgTable("general_financial_embeddings", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	knowledge_id: varchar("knowledge_id", { length: 191 }).references(() => general_financial_knowledge.id, { onDelete: "cascade" } ),
	content: text("content").notNull(),
	embedding: vector("embedding", { dimensions: 1536 }).notNull(),
	category: varchar("category", { length: 50 }).default('general'::character varying).notNull(),
},
(table) => {
	return {
		generalCategoryIndex: index("generalCategoryIndex").using("btree", table.category),
		generalEmbeddingIndex: index("generalEmbeddingIndex").using("hnsw", table.embedding.op("vector_cosine_ops")),
	}
});

export const document_processing_logs = pgTable("document_processing_logs", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	document_id: varchar("document_id", { length: 191 }).notNull(),
	user_id: varchar("user_id", { length: 191 }).notNull(),
	transaction_id: varchar("transaction_id", { length: 191 }),
	bucket_name: varchar("bucket_name", { length: 255 }).notNull(),
	object_name: varchar("object_name", { length: 500 }).notNull(),
	namespace: varchar("namespace", { length: 255 }).notNull(),
	status: processing_status("status").default('QUEUED').notNull(),
	current_stage: processing_stage("current_stage").default('DOCUMENT_UPLOAD').notNull(),
	document_type: varchar("document_type", { length: 50 }),
	detected_language: varchar("detected_language", { length: 10 }).default('es'::character varying),
	overall_confidence: numeric("overall_confidence", { precision: 3, scale:  2 }),
	ocr_confidence: numeric("ocr_confidence", { precision: 3, scale:  2 }),
	classification_confidence: numeric("classification_confidence", { precision: 3, scale:  2 }),
	llm_confidence: numeric("llm_confidence", { precision: 3, scale:  2 }),
	total_processing_time: integer("total_processing_time"),
	ocr_processing_time: integer("ocr_processing_time"),
	classification_processing_time: integer("classification_processing_time"),
	llm_processing_time: integer("llm_processing_time"),
	oracle_job_id: varchar("oracle_job_id", { length: 191 }),
	openai_request_id: varchar("openai_request_id", { length: 191 }),
	extracted_data: jsonb("extracted_data"),
	llm_response: jsonb("llm_response"),
	errors: jsonb("errors"),
	queued_at: timestamp("queued_at", { mode: 'string' }).defaultNow().notNull(),
	started_at: timestamp("started_at", { mode: 'string' }),
	completed_at: timestamp("completed_at", { mode: 'string' }),
	failed_at: timestamp("failed_at", { mode: 'string' }),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		date_status_idx: index("document_processing_logs_date_status_index").using("btree", table.created_at, table.status),
		document_id_idx: index().using("btree", table.document_id),
		errors_idx: index().using("gin", table.errors),
		extracted_data_idx: index().using("gin", table.extracted_data),
		oracle_job_idx: index("document_processing_logs_oracle_job_index").using("btree", table.oracle_job_id),
		stage_idx: index("document_processing_logs_stage_index").using("btree", table.current_stage),
		status_idx: index().using("btree", table.status),
		status_stage_idx: index("document_processing_logs_status_stage_index").using("btree", table.status, table.current_stage),
		transaction_id_idx: index().using("btree", table.transaction_id),
		user_id_idx: index().using("btree", table.user_id),
		user_status_idx: index("document_processing_logs_user_status_index").using("btree", table.user_id, table.status),
	}
});

export const transaction_categories = pgTable("transaction_categories", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	display_name: varchar("display_name", { length: 150 }).notNull(),
	parent_category_id: varchar("parent_category_id", { length: 191 }),
	level: integer("level").default(0).notNull(),
	sort_order: integer("sort_order").default(0).notNull(),
	transaction_type: transaction_type("transaction_type").notNull(),
	description: text("description"),
	icon: varchar("icon", { length: 50 }),
	color: varchar("color", { length: 7 }),
	is_chilean_specific: boolean("is_chilean_specific").default(true).notNull(),
	sii_category: varchar("sii_category", { length: 100 }),
	is_active: boolean("is_active").default(true).notNull(),
	is_system_category: boolean("is_system_category").default(true).notNull(),
	keywords: jsonb("keywords"),
	patterns: jsonb("patterns"),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		active_idx: index("transaction_categories_active_index").using("btree", table.is_active),
		keywords_idx: index().using("gin", table.keywords),
		level_idx: index().using("btree", table.level),
		name_idx: index().using("btree", table.name),
		parent_idx: index("transaction_categories_parent_index").using("btree", table.parent_category_id),
		parent_level_idx: index("transaction_categories_parent_level_index").using("btree", table.parent_category_id, table.level),
		patterns_idx: index().using("gin", table.patterns),
		type_active_idx: index("transaction_categories_type_active_index").using("btree", table.transaction_type, table.is_active),
		type_idx: index("transaction_categories_type_index").using("btree", table.transaction_type),
		transaction_categories_name_unique: unique("transaction_categories_name_unique").on(table.name),
	}
});

export const financial_transactions = pgTable("financial_transactions", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	user_id: varchar("user_id", { length: 191 }).notNull(),
	document_id: varchar("document_id", { length: 191 }),
	transaction_type: transaction_type("transaction_type").notNull(),
	category: varchar("category", { length: 100 }).notNull(),
	subcategory: varchar("subcategory", { length: 100 }),
	amount: numeric("amount", { precision: 15, scale:  2 }).notNull(),
	currency: varchar("currency", { length: 3 }).default('CLP'::character varying).notNull(),
	transaction_date: timestamp("transaction_date", { mode: 'string' }).notNull(),
	description: text("description").notNull(),
	merchant: varchar("merchant", { length: 255 }),
	confidence_score: numeric("confidence_score", { precision: 3, scale:  2 }),
	status: transaction_status("status").default('PENDING_CLASSIFICATION').notNull(),
	processing_method: varchar("processing_method", { length: 50 }).notNull(),
	metadata: jsonb("metadata"),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	classified_at: timestamp("classified_at", { mode: 'string' }),
	verified_at: timestamp("verified_at", { mode: 'string' }),
},
(table) => {
	return {
		category_idx: index().using("btree", table.category),
		date_idx: index("financial_transactions_date_index").using("btree", table.transaction_date),
		metadata_idx: index().using("gin", table.metadata),
		status_idx: index().using("btree", table.status),
		type_idx: index("financial_transactions_type_index").using("btree", table.transaction_type),
		user_category_idx: index("financial_transactions_user_category_index").using("btree", table.user_id, table.category),
		user_date_idx: index("financial_transactions_user_date_index").using("btree", table.user_id, table.transaction_date),
		user_id_idx: index().using("btree", table.user_id),
		user_type_idx: index("financial_transactions_user_type_index").using("btree", table.user_id, table.transaction_type),
	}
});

export const user_financial_summary = pgTable("user_financial_summary", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	user_id: varchar("user_id", { length: 191 }).notNull(),
	period: summary_period("period").notNull(),
	period_start: date("period_start").notNull(),
	period_end: date("period_end").notNull(),
	total_income: numeric("total_income", { precision: 15, scale:  2 }).default('0').notNull(),
	total_expenses: numeric("total_expenses", { precision: 15, scale:  2 }).default('0').notNull(),
	net_income: numeric("net_income", { precision: 15, scale:  2 }).default('0').notNull(),
	income_transaction_count: integer("income_transaction_count").default(0).notNull(),
	expense_transaction_count: integer("expense_transaction_count").default(0).notNull(),
	total_transaction_count: integer("total_transaction_count").default(0).notNull(),
	expense_category_breakdown: jsonb("expense_category_breakdown"),
	income_category_breakdown: jsonb("income_category_breakdown"),
	top_merchants: jsonb("top_merchants"),
	top_expense_categories: jsonb("top_expense_categories"),
	clp_total_income: numeric("clp_total_income", { precision: 15, scale:  2 }).default('0').notNull(),
	clp_total_expenses: numeric("clp_total_expenses", { precision: 15, scale:  2 }).default('0').notNull(),
	clp_net_income: numeric("clp_net_income", { precision: 15, scale:  2 }).default('0').notNull(),
	savings_rate: numeric("savings_rate", { precision: 5, scale:  2 }),
	expense_growth_rate: numeric("expense_growth_rate", { precision: 5, scale:  2 }),
	income_growth_rate: numeric("income_growth_rate", { precision: 5, scale:  2 }),
	documents_processed: integer("documents_processed").default(0).notNull(),
	average_processing_confidence: numeric("average_processing_confidence", { precision: 3, scale:  2 }),
	manually_reviewed_transactions: integer("manually_reviewed_transactions").default(0).notNull(),
	insights: jsonb("insights"),
	calculated_at: timestamp("calculated_at", { mode: 'string' }).defaultNow().notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		expense_category_idx: index("user_financial_summary_expense_category_index").using("gin", table.expense_category_breakdown),
		income_category_idx: index("user_financial_summary_income_category_index").using("gin", table.income_category_breakdown),
		insights_idx: index().using("gin", table.insights),
		period_date_idx: index("user_financial_summary_period_date_index").using("btree", table.period, table.period_start),
		period_idx: index().using("btree", table.period),
		period_start_idx: index().using("btree", table.period_start),
		top_merchants_idx: index().using("gin", table.top_merchants),
		user_date_idx: index("user_financial_summary_user_date_index").using("btree", table.user_id, table.period_start),
		user_id_idx: index().using("btree", table.user_id),
		user_period_idx: index("user_financial_summary_user_period_index").using("btree", table.user_id, table.period),
		user_financial_summary_user_period_unique: unique("user_financial_summary_user_period_unique").on(table.user_id, table.period, table.period_start, table.period_end),
	}
});