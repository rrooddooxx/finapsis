import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable, decimal, date } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { nanoid } from "../utils";

export const personalFinancialGoals = pgTable("personal_financial_goals", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: varchar("user_id", { length: 191 }).notNull(),
  goalType: varchar("goal_type", { length: 100 }).notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).default("0"),
  targetDate: date("target_date"),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

// Schema for creating personal financial goals - used to validate API requests
export const insertPersonalFinancialGoalSchema = createSelectSchema(personalFinancialGoals)
  .extend({
    targetAmount: z.number().positive().optional(),
    currentAmount: z.number().min(0).optional(),
    targetDate: z.string().optional(), // Will be converted to date
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true, // Will be provided by context
  });

// Schema for updating personal financial goals
export const updatePersonalFinancialGoalSchema = insertPersonalFinancialGoalSchema
  .partial()
  .extend({
    id: z.string(),
  });

// Type for personal financial goal creation - used to type API request params
export type NewPersonalFinancialGoalParams = z.infer<typeof insertPersonalFinancialGoalSchema>;

// Type for personal financial goal updates
export type UpdatePersonalFinancialGoalParams = z.infer<typeof updatePersonalFinancialGoalSchema>;

// Goal status enum for validation
export const goalStatusEnum = z.enum(["active", "completed", "paused", "cancelled"]);
export type GoalStatus = z.infer<typeof goalStatusEnum>;