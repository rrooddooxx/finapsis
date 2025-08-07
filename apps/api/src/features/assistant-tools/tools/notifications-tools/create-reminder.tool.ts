import {tool} from "ai";
import {devLogger} from "../../../../utils/logger.utils";
import {AssistantTool} from "../../tools.module";
import {ReminderExtractionInputParams, reminderExtractionInputSchema, reminderExtractionSchema} from "../../schemas/reminder-extraction.schema";
import {JobData, ReminderExtractionResponse} from "../../model/reminder-extraction.types";
import {generateObject} from "ai";
import {openai} from "@ai-sdk/openai";
import {Queue} from "bullmq";
import {convertToChronPattern} from "../../../../utils/convert-to-chron-pattern.utils";

const reminderQueue = new Queue('reminders', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

const createReminderAction = async ({ userMessage, userId }: ReminderExtractionInputParams): Promise<ReminderExtractionResponse> => {
  devLogger("Tool Called!!", `Tool: ${AssistantTool.CREATE_REMINDER} |  Params: ${userMessage}, ${userId}`)
  try{
    const currentTime = Date.now();
    const currentDate = new Date().toISOString();
    
    const extractionResult = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt: `
        Analiza este mensaje de usuario y extrae la información del recordatorio:
        
        Mensaje: "${userMessage}"
        Fecha/hora actual: ${currentDate}
        
        Instrucciones:
        1. Extrae el mensaje/tarea a recordar
        2. Calcula cuándo debe ejecutarse (timestamp Unix)
        3. Determina si es recurrente
        
        Para tiempo relativo:
        - "en 2 horas" = ahora + 2 horas
        - "en 30 minutos" = ahora + 30 minutos
        - "mañana a las 9" = mañana a las 9:00
        
        Para recurrente:
        - "todos los 20 de cada mes" = recurring, próximo día 20
        - "cada semana" = recurring, mismo día siguiente semana
        
        Timestamp actual: ${currentTime}
      `,
      schema: reminderExtractionSchema,
    });
    
    const reminderData = extractionResult.object;
    
    // 📅 Programar el trabajo en BullMQ
    const delay = reminderData.when.timestamp - currentTime;
    
    if (delay < 0) {
      return {
        success: false,
        error: 'No se puede programar un recordatorio en el pasado'
      };
    }
    
    const jobData: JobData = {
      userId,
      message: reminderData.message,
      scheduledFor: new Date(reminderData.when.timestamp).toISOString(),
      isRecurring: reminderData.isRecurring,
      recurringPattern: reminderData.recurringPattern,
    };
    
    const job = await reminderQueue.add(
      'send-reminder',
      jobData,
      {
        delay,
        // Solo agregar repeat si es recurrente
        ...(reminderData.isRecurring && {
          repeat: { 
            pattern: convertToChronPattern(reminderData.recurringPattern) 
          }
        }),
        removeOnComplete: 10, // Solo guardar los últimos 10 completados
        removeOnFail: 5, // Solo guardar los últimos 5 fallidos
      }
    );
    
    return {
      success: true,
      message: `✅ Recordatorio programado para ${new Date(reminderData.when.timestamp).toLocaleString('es-ES')}`,
      jobId: job.id,
      when: reminderData.when.value,
      isRecurring: reminderData.isRecurring,
    };
  } catch(error){
    console.error('Error creando recordatorio', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

export const createReminderTool = tool({
  description: 'Crea un recordatorio para el usuario basado en lenguaje natural',
  inputSchema: reminderExtractionInputSchema,
  execute: createReminderAction,
})
