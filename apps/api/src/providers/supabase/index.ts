import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { devLogger } from "../../utils/logger.utils";
import { personalKnowledge } from "./schema/personal-knowledge";
import { personalEmbeddings } from "./schema/personal-embeddings";
import { personalFinancialGoals } from "./schema/personal-financial-goals";
import { generalFinancialKnowledge } from "./schema/general-financial-knowledge";
import { generalFinancialEmbeddings } from "./schema/general-financial-embeddings";
import { embeddings } from "./schema/embeddings";

const POSTGRES_URL = process.env.DATABASE_URL;

if(!POSTGRES_URL) throw new Error('DATABASE_URL is not defined')

const client = postgres(POSTGRES_URL, {
    debug: true,
});

export const supabase = drizzle(client);

export const clearAllData = async () => {
    try {
        devLogger('🗑️  Clearing all data from database...');
        
        // Delete in order (foreign key constraints)
        await supabase.delete(embeddings);
        await supabase.delete(personalEmbeddings);
        await supabase.delete(personalKnowledge);
        await supabase.delete(generalFinancialEmbeddings);
        await supabase.delete(generalFinancialKnowledge);
        await supabase.delete(personalFinancialGoals);
        
        devLogger('✅ All data cleared successfully');
    } catch (error) {
        devLogger('❌ Error clearing data:', String(error));
        throw error;
    }
};

