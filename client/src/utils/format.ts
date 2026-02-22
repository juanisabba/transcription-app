/**
 * Formatea segundos a un string legible (ej: "2h 15min", "45 s", "3 min 20 s").
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} s`;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m} min` : `${h}h`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m} min ${s} s` : `${m} min`;
};
