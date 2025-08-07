import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod";

import { nanoid } from "../utils";

export const generalFinancialKnowledge = pgTable("general_financial_knowledge", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  source: varchar("source", { length: 255 }),
  
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});

// Financial knowledge category enum
export const financialCategoryEnum = z.enum(["ahorro", "credito", "presupuesto", "inversiones", "deudas", "general"]);
export type FinancialCategory = z.infer<typeof financialCategoryEnum>;

// Schema for general financial knowledge - used to validate API requests (manual Zod schema)
export const insertGeneralFinancialKnowledgeSchema = z.object({
  content: z.string().min(1, "Content is required"),
  category: financialCategoryEnum.default("general"),
  source: z.string().optional(),
});

// Type for general financial knowledge - used to type API request params
export type NewGeneralFinancialKnowledgeParams = z.infer<typeof insertGeneralFinancialKnowledgeSchema>;