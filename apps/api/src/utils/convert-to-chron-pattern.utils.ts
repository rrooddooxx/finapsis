export function convertToChronPattern(pattern?: string): string | undefined {
  if (!pattern) return undefined;
  
  const lower = pattern.toLowerCase();
  
  // Handle seconds - cron doesn't support seconds, so convert to minutes
  if (lower.includes('segundo') || lower.includes('seconds')) {
    const secondsMatch = lower.match(/(\d+)\s*segundo/);
    if (secondsMatch) {
      const seconds = parseInt(secondsMatch[1]);
      // Convert to minutes if >= 60 seconds, otherwise use minimum 1 minute
      const minutes = seconds >= 60 ? Math.floor(seconds / 60) : 1;
      return `*/${minutes} * * * *`; // Every X minutes
    }
  }
  
  // Handle minutes
  if (lower.includes('minuto') || lower.includes('minutes')) {
    const minutesMatch = lower.match(/(\d+)\s*minuto/);
    if (minutesMatch) {
      const minutes = parseInt(minutesMatch[1]);
      return `*/${minutes} * * * *`; // Every X minutes
    }
  }
  
  // Handle hours
  if (lower.includes('hora') || lower.includes('hours')) {
    const hoursMatch = lower.match(/(\d+)\s*hora/);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1]);
      return `0 */${hours} * * *`; // Every X hours
    }
  }
  
  if (lower.includes('día') || lower.includes('daily')) {
    return '0 9 * * *'; // Todos los días a las 9 AM
  }
  
  if (lower.includes('semana') || lower.includes('weekly')) {
    return '0 9 * * 1'; // Lunes a las 9 AM
  }
  
  // Para mensual, extraer el día
  const dayMatch = lower.match(/(\d+)/);
  if (dayMatch && (lower.includes('mes') || lower.includes('monthly'))) {
    const day = dayMatch[1];
    return `0 9 ${day} * *`; // Día específico del mes a las 9 AM
  }
  
  return undefined;
}