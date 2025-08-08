export function formatMessage(message: string, scheduledFor: string, isRecurring: boolean): string {
  const date = new Date(scheduledFor);
  const timeString = date.toLocaleString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const recurringText = isRecurring ? '\n🔄 <i>Recordatorio recurrente</i>' : '';
  
  return `
🔔 <b>¡Recordatorio!</b>

📝 <b>${message}</b>

⏰ <i>Programado para: ${timeString}</i>${recurringText}

<i>¿Ya lo completaste? ✅</i>
  `.trim();
}