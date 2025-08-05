import {
    NewResourceParams,
    insertResourceSchema,
    resources,
} from '../../../providers/supabase/schema/resources';
import {supabase} from '../../../providers/supabase';
import {generateEmbeddings} from "../services/embedding.service";
import {embeddings as embeddingsTable} from '../../../providers/supabase/schema/embeddings'

export const createResource = async (input: NewResourceParams) => {
    try {
        const {content} = insertResourceSchema.parse(input);

        const [resource] = await supabase
            .insert(resources)
            .values({content})
            .returning();

        const embeddings = await generateEmbeddings(content);
        await supabase.insert(embeddingsTable).values(
            embeddings.map(embedding => ({
                resourceId: resource.id,
                ...embedding,
            }))
        )

        return 'Resource successfully created and embedded.';
    } catch (e) {
        if (e instanceof Error)
            return e.message.length > 0 ? e.message : 'Error, please try again.';
    }
};
