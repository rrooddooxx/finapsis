export type ReminderExtractionResponse = {
  success: boolean;
  message?: string;
  jobId?: string;
  when?: string;
  isRecurring?: boolean;
  error?: string;
}

export type JobData = {
  userId: string;
  message: string;
  scheduledFor: string;
  isRecurring: boolean;
  recurringPattern?: string;
}