export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Construye una fecha local; evita que YYYY-MM-DD se interprete como UTC. */
export function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function weekdayFromKey(dateKey: string): number {
  return dateFromKey(dateKey).getDay();
}

export function periodStart(
  period: 'week' | 'month',
  referenceDate = new Date(),
  offset = 0,
): string {
  const date = new Date(referenceDate.getTime());
  if (offset !== 0) {
    if (period === 'week') date.setDate(date.getDate() + offset * 7);
    else date.setMonth(date.getMonth() + offset);
  }
  if (period === 'week') {
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - diff);
  } else {
    date.setDate(1);
  }
  return localDateKey(date);
}

/** Último día del periodo (semana: domingo; mes: último día del mes). */
export function periodEnd(
  period: 'week' | 'month',
  referenceDate = new Date(),
  offset = 0,
): string {
  const start = dateFromKey(periodStart(period, referenceDate, offset));
  if (period === 'week') {
    start.setDate(start.getDate() + 6);
  } else {
    start.setMonth(start.getMonth() + 1);
    start.setDate(0);
  }
  return localDateKey(start);
}

/** Etiqueta legible del periodo: "12 – 18 oct" o "octubre de 2026". */
export function periodLabel(
  period: 'week' | 'month',
  referenceDate = new Date(),
  offset = 0,
): string {
  const start = dateFromKey(periodStart(period, referenceDate, offset));
  const end = dateFromKey(periodEnd(period, referenceDate, offset));
  const short = (d: Date) =>
    d
      .toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
      .replace(/\./g, '')
      .replace(' de ', ' ');
  if (period === 'week') {
    const sameMonth = start.getMonth() === end.getMonth();
    const startText = sameMonth
      ? String(start.getDate())
      : short(start);
    return `${startText} – ${short(end)}`;
  }
  const long = start.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
  return long.replace(/\./g, '');
}
