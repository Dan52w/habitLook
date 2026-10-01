export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Construye una fecha local; evita que YYYY-MM-DD se interprete como UTC. */
export function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function weekdayFromKey(dateKey: string): number {
  return dateFromKey(dateKey).getDay();
}

export function periodStart(period: 'week' | 'month', referenceDate = new Date()): string {
  const date = new Date(referenceDate.getTime());
  if (period === 'week') {
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - diff);
  } else {
    date.setDate(1);
  }
  return localDateKey(date);
}
