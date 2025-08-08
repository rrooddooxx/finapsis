import { sql } from "drizzle-orm";
import { 
  pgTable, 
  varchar, 
  text, 
  timestamp, 
  index
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "../utils";

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    
    email: text('email').notNull().unique(),
    
    createdAt: timestamp('created_at').notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
  },
  (table) => ({
    emailIndex: index('users_email_index').on(table.email),
  })
);

// Zod schemas for validation
export const insertUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const selectUserSchema = createSelectSchema(users);

// Types for TypeScript
export type NewUserParams = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;