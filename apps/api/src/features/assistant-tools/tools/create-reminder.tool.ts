import {tool} from "ai";
import {createReminderAction} from "../../assistant-reminders/actions/reminder";
import {reminderExtractionInputSchema} from "../../assistant-reminders/schemas/reminder-extraction.schema";

export const createReminderTool = tool({
  description: 'Crea un recordatorio para el usuario basado en lenguaje natural',
  inputSchema: reminderExtractionInputSchema,
  execute: createReminderAction,
})
