import { Context } from 'hono';
import { addGeneralFinancialKnowledge } from '../assistant-retrieval/services/general-knowledge.service';
import { insertGeneralFinancialKnowledgeSchema, type NewGeneralFinancialKnowledgeParams } from '../../providers/supabase/schema/general-financial-knowledge';

export const embedKnowledge = async (c: Context) => {
    try {
        const body = await c.req.json();
        
        // Validate input
        const validatedData = insertGeneralFinancialKnowledgeSchema.parse(body);
        
        const { content, category = 'general', source } = validatedData;
        
        if (!content || content.trim().length === 0) {
            return c.json({
                success: false,
                message: 'Content is required and cannot be empty',
            }, 400);
        }

        // Add knowledge and generate embeddings
        const result = await addGeneralFinancialKnowledge(content, category, source || undefined);
        
        return c.json({
            success: true,
            message: 'Financial knowledge embedded successfully',
            data: {
                knowledgeId: result.knowledgeId,
                embeddingsCount: result.embeddingsCount,
                category
            }
        });

    } catch (error: any) {
        console.error('❌ Error in embedKnowledge controller:', error);
        
        if (error?.name === 'ZodError') {
            return c.json({
                success: false,
                message: 'Invalid input data',
                errors: error.errors
            }, 400);
        }
        
        return c.json({
            success: false,
            message: 'Failed to embed financial knowledge',
            error: error?.message || 'Unknown error'
        }, 500);
    }
};