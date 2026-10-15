import {
  dateFromKey,
  localDateKey,
  weekdayFromKey,
} from '../src/shared/utils/date';

test('interpreta las fechas guardadas como fechas locales, no UTC', () => {
  const date = dateFromKey('2026-09-30');
  expect(localDateKey(date)).toBe('2026-09-30');
  expect(weekdayFromKey('2026-09-30')).toBe(3);
});

describe('periodos contables', () => {
  const { periodStart, periodEnd, periodLabel } = jest.requireActual(
    '../src/shared/utils/date',
  ) as typeof import('../src/shared/utils/date');

  // 2026-10-15 es jueves
  const ref = new Date(2026, 9, 15, 12, 0, 0);

  test('semana actual: lunes a domingo', () => {
    expect(periodStart('week', ref)).toBe('2026-10-12');
    expect(periodEnd('week', ref)).toBe('2026-10-18');
  });

  test('mes actual: día 1 al último día', () => {
    expect(periodStart('month', ref)).toBe('2026-10-01');
    expect(periodEnd('month', ref)).toBe('2026-10-31');
  });

  test('offset -1 retrocede una semana / un mes', () => {
    expect(periodStart('week', ref, -1)).toBe('2026-10-05');
    expect(periodEnd('week', ref, -1)).toBe('2026-10-11');
    expect(periodStart('month', ref, -1)).toBe('2026-09-01');
    expect(periodEnd('month', ref, -1)).toBe('2026-09-30');
  });

  test('etiquetas legibles', () => {
    expect(periodLabel('week', ref)).toBe('12 – 18 oct');
    expect(periodLabel('week', ref, -1)).toBe('5 – 11 oct');
    expect(periodLabel('month', ref)).toMatch(/octubre.*2026/);
  });

  test('periodStart sin offset conserva el comportamiento anterior', () => {
    expect(periodStart('week', ref)).toBe(periodStart('week', ref, 0));
    expect(periodStart('month', ref)).toBe(periodStart('month', ref, 0));
  });
});
