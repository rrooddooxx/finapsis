import {z} from "zod";

export const getPersonalGoalsSchema = z.object({
    userId: z.string()
        .describe("ID del usuario para obtener sus metas financieras"),
        
    status: z.enum(["active", "completed", "paused", "cancelled"])
        .optional()
        .describe("Filter goals by status (optional)")
});

export type GetPersonalGoalsSchema = z.infer<typeof getPersonalGoalsSchema>;