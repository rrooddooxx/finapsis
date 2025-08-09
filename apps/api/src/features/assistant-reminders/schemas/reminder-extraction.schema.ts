import {z} from "zod";

export const reminderExtractionSchema = z.object({
  message: z.string(),
  when: z.object({
    type: z.enum(['relative', 'absolute', 'recurring']),
    value: z.string(),
    timestamp: z.number(),
  }),
  isRecurring: z.boolean(),
  recurringPattern: z.string().optional(),
  repeatCount: z.number().optional() // For limited repetitions like "4 veces"
});

export const reminderExtractionInputSchema = z.object({
  userMessage: z.string(),
  userId: z.string()
})

export type ReminderExtractionInputParams = z.infer<typeof reminderExtractionInputSchema>;