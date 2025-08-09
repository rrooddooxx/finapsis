const { Queue } = require('bullmq');

const reminderQueue = new Queue('reminders', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

async function clearReminders() {
  try {
    console.log('🧹 Clearing all reminder jobs...');
    
    // Clear all jobs (waiting, active, completed, failed, delayed)
    await reminderQueue.obliterate({ force: true });
    
    console.log('✅ All reminder jobs cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing reminders:', error);
    process.exit(1);
  }
}

clearReminders();