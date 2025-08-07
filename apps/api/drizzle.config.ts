import type { Config } from "drizzle-kit";

const POSTGRES_URL = process.env.DATABASE_URL;

if(!POSTGRES_URL) throw new Error('DATABASE_URL is not defined')

export default {
  schema: "./src/providers/supabase/schema",
  dialect: "postgresql",
  out: "./src/providers/supabase/migrations",
  dbCredentials: {
    url: POSTGRES_URL,
  }
} satisfies Config;
