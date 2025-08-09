import {devLogger} from "../../../utils/logger.utils";
import {AssistantTool} from "../../assistant-tools/tools.module";
import {ReminderExtractionInputParams, reminderExtractionSchema} from "../schemas/reminder-extraction.schema";
import {JobData, ReminderExtractionResponse} from "../types/reminder-extraction.types";
import {generateObject} from "ai";
import {openai} from "@ai-sdk/openai";
import {Queue} from "bullmq";
import {convertToChronPattern} from "../../../utils/convert-to-chron-pattern.utils";

const reminderQueue = new Queue('reminders', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

export const createReminderAction = async ({ userMessage, userId }: ReminderExtractionInputParams): Promise<ReminderExtractionResponse> => {
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
        4. Si menciona un número de veces (ej: "4 veces"), extrae ese número
        
        Para tiempo relativo:
        - "en 2 horas" = ahora + 2 horas
        - "en 30 minutos" = ahora + 30 minutos
        - "mañana a las 9" = mañana a las 9:00
        
        Para recurrente:
        - "todos los 20 de cada mes" = recurring, próximo día 20
        - "cada semana" = recurring, mismo día siguiente semana
        - "cada 30 segundos, 4 veces" = recurring con repeatCount: 4
        
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
    
    let job;
    
    if (reminderData.isRecurring && reminderData.repeatCount) {
      // For limited repeats, create individual jobs instead of using cron repeat
      const cronPattern = convertToChronPattern(reminderData.recurringPattern);
      if (cronPattern) {
        // Parse the interval from the pattern to calculate delays
        let intervalMs = 60000; // Default 1 minute
        
        // Extract interval from pattern for seconds/minutes
        if (reminderData.recurringPattern?.includes('segundo')) {
          const match = reminderData.recurringPattern.match(/(\d+)\s*segundo/);
          intervalMs = match ? parseInt(match[1]) * 1000 : 60000;
        } else if (reminderData.recurringPattern?.includes('minuto')) {
          const match = reminderData.recurringPattern.match(/(\d+)\s*minuto/);
          intervalMs = match ? parseInt(match[1]) * 60000 : 60000;
        } else if (reminderData.recurringPattern?.includes('hora')) {
          const match = reminderData.recurringPattern.match(/(\d+)\s*hora/);
          intervalMs = match ? parseInt(match[1]) * 3600000 : 3600000;
        }
        
        // Create multiple individual jobs with increasing delays
        const jobs = [];
        for (let i = 0; i < reminderData.repeatCount; i++) {
          const jobDelay = delay + (i * intervalMs);
          const individualJob = await reminderQueue.add(
            'send-reminder',
            {
              ...jobData,
              repetitionNumber: i + 1,
              totalRepetitions: reminderData.repeatCount
            },
            {
              delay: jobDelay,
              removeOnComplete: 10,
              removeOnFail: 5,
            }
          );
          jobs.push(individualJob);
        }
        job = jobs[0]; // Return first job for response
      } else {
        // Fallback to single job if pattern conversion fails
        job = await reminderQueue.add('send-reminder', jobData, { delay });
      }
    } else {
      // Regular job (single or infinite recurring)
      job = await reminderQueue.add(
        'send-reminder',
        jobData,
        {
          delay,
          // Solo agregar repeat si es recurrente y sin límite
          ...(reminderData.isRecurring && !reminderData.repeatCount && {
            repeat: { 
              pattern: convertToChronPattern(reminderData.recurringPattern)
            }
          }),
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      );
    }

    const scheduledTime = new Date(reminderData.when.timestamp).toLocaleString('es-ES');
    const repeatInfo = reminderData.isRecurring && reminderData.repeatCount 
      ? ` (se repetirá ${reminderData.repeatCount} veces)`
      : '';
    
    console.log(`✅ Recordatorio programado para ${scheduledTime}${repeatInfo}`)
    
    return {
      success: true,
      message: `✅ Recordatorio programado para ${scheduledTime}${repeatInfo}`,
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
