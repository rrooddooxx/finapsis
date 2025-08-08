import {z} from "zod";

export const updatePersonalGoalSchema = z.object({
    userId: z.string()
        .describe("ID del usuario propietario de la meta"),
        
    goalId: z.string()
        .min(1)
        .describe("ID of the goal to update"),
    
    currentAmount: z.number()
        .min(0)
        .optional()
        .describe("Updated current progress towards the goal (in CLP)"),
    
    status: z.enum(["active", "completed", "paused", "cancelled"])
        .optional()
        .describe("Updated status of the goal"),
    
    targetAmount: z.number()
        .positive()
        .optional()
        .describe("Updated target amount (in CLP)"),
    
    targetDate: z.string()
        .optional()
        .describe("Updated target date (YYYY-MM-DD format)"),
    
    description: z.string()
        .min(1)
        .optional()
        .describe("Updated description of the goal")
});

export type UpdatePersonalGoalSchema = z.infer<typeof updatePersonalGoalSchema>;