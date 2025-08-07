import {z} from "zod";

export const createPersonalGoalSchema = z.object({
    userId: z.string()
        .describe("ID del usuario para asociar la meta financiera"),
        
    goalType: z.string()
        .min(1)
        .describe("Type of financial goal (e.g., 'ahorro', 'inversion', 'reducir_deuda', 'compra_casa', etc.)"),
    
    targetAmount: z.number()
        .positive()
        .optional()
        .describe("Target amount to achieve (in CLP)"),
    
    currentAmount: z.number()
        .min(0)
        .optional()
        .describe("Current progress towards the goal (in CLP)"),
    
    targetDate: z.string()
        .optional()
        .describe("Target date to achieve the goal (YYYY-MM-DD format)"),
    
    description: z.string()
        .min(1)
        .describe("Detailed description of the financial goal")
});

export type CreatePersonalGoalSchema = z.infer<typeof createPersonalGoalSchema>;