import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { nanoid } from "../utils";

export const personalKnowledge = pgTable("personal_knowledge", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: varchar("user_id", { length: 191 }).notNull(),
  content: text("content").notNull(),

  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

// Schema for personal knowledge - used to validate API requests
export const insertPersonalKnowledgeSchema = createSelectSchema(personalKnowledge)
  .extend({})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true, // Se omite del esquema base pero se requerirá explícitamente
  });

// Type for personal knowledge - used to type API request params and within Components
export type NewPersonalKnowledgeParams = z.infer<typeof insertPersonalKnowledgeSchema>;
