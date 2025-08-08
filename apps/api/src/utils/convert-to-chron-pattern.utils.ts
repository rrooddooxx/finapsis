export function convertToChronPattern(pattern?: string): string | undefined {
  if (!pattern) return undefined;
  
  const lower = pattern.toLowerCase();
  
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