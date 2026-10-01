export const money = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);

export const cop = (value: string): number => {
  if (!value) return 0;
  const cleaned = value
    .trim()
    .replace(/[^\d,-]/g, '')
    .replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num) : 0;
};
