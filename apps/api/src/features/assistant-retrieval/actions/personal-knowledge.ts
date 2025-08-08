import {
    NewPersonalKnowledgeParams,
    insertPersonalKnowledgeSchema,
    personalKnowledge,
} from '../../../providers/supabase/schema/personal-knowledge';
import {supabase} from '../../../providers/supabase';
import {createPersonalKnowledgeEmbeddings} from "../services/universal-embedding.service";
import {z} from 'zod';

export const createPersonalKnowledge = async (input: NewPersonalKnowledgeParams & { userId: string }) => {
    console.log('🔥 createPersonalKnowledge llamado con:', input);
    
    try {
        console.log('🔥 Validando input...');
        const {content, userId} = insertPersonalKnowledgeSchema.extend({
            userId: z.string()
        }).parse(input);
        console.log('🔥 Input validado:', {content: content.substring(0, 50), userId});

        console.log('🔥 Probando conexión a la BD...');
        
        // Primero probemos una consulta simple
        try {
            const testQuery = await supabase.select().from(personalKnowledge).limit(1);
            console.log('🔥 Conexión BD OK, conocimientos existentes:', testQuery.length);
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            throw new Error('Database connection failed');
        }
        
        console.log('🔥 Insertando conocimiento personal...');
        
        // Test directo con timeout
        const insertPromise = supabase
            .insert(personalKnowledge)
            .values({content, userId})
            .returning();
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Insert timeout after 5 seconds')), 5000)
        );
        
        const insertResult = await Promise.race([insertPromise, timeoutPromise]);
        console.log('🔥 Insert result:', insertResult);
        const [personalKnowledgeItem] = insertResult;

        if (!personalKnowledgeItem) {
            throw new Error('Failed to create personal knowledge');
        }
        console.log('🔥 Conocimiento personal creado:', personalKnowledgeItem.id);

        console.log('🔥 Generando embeddings universales...');
        try {
            const { embeddingsCount } = await createPersonalKnowledgeEmbeddings(
                personalKnowledgeItem.id,
                content,
                userId
            );
            console.log('🔥 Embeddings universales creados:', embeddingsCount);
        } catch (embeddingError) {
            console.error('⚠️ Error creando embeddings (conocimiento guardado):', embeddingError);
            // Don't throw here - knowledge creation succeeded, embeddings are optional
        }

        return `✅ Información guardada exitosamente para el usuario ${userId}`;
    } catch (e) {
        console.error('❌ Error en createResource:', e);
        if (e instanceof Error) {
            return `❌ Error al guardar información: ${e.message}`;
        }
        return '❌ Error desconocido al guardar información';
    }
};
