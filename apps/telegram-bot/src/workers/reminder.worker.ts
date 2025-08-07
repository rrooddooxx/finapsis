import { Job, Worker } from 'bullmq';
import type { ReminderJobData } from '../interfaces/reminder-job-data.interface';
import { formatMessage } from '../utils';
import { Bot } from 'grammy';

export const reminderWorker = new Worker(
  'reminders',
  async (job: Job<ReminderJobData>) => {
    const { userId, message, scheduledFor, isRecurring } = job.data

    const bot = new Bot(Bun.env.TELEGRAM_BOT_TOKEN!)
    
    console.log(`📋 Procesando recordatorio ${job.id} para usuario ${userId}`);

    try {
      const telegramUsername = Bun.env.TELEGRAM_BOT_USERNAME || '@ponytakxn'

      const formattedMessage = formatMessage(message, scheduledFor, isRecurring)

      await bot.api.sendMessage(telegramUsername, formattedMessage, {
        parse_mode: 'HTML',
      })

      console.log(`✅ Recordatorio enviado a ${userId}`);
      
      return { 
        success: true, 
        sentAt: new Date().toISOString(),
        chatId: telegramUsername 
      };
    } catch (error) {
      console.error(`❌ Error en recordatorio ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 5,
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 10 },
  }
)