import {
  doIntervalsOverlap,
  normalizeTimeString,
} from '../src/features/clock/utils/timeValidation';
import { periodStart } from '../src/shared/utils/date';

describe('normalizeTimeString', () => {
  it('normalizes single digit hours and minutes with leading zeros', () => {
    expect(normalizeTimeString('9:0')).toBe('09:00');
    expect(normalizeTimeString('9')).toBe('09:00');
    expect(normalizeTimeString('23:5')).toBe('23:05');
    expect(normalizeTimeString('8:45')).toBe('08:45');
  });

  it('handles empty or out-of-range values gracefully', () => {
    expect(normalizeTimeString('')).toBe('00:00');
    expect(normalizeTimeString('25:70')).toBe('23:59');
  });
});

describe('doIntervalsOverlap', () => {
  it('detects simple overlaps', () => {
    expect(doIntervalsOverlap('08:00', '10:00', '09:00', '11:00')).toBe(true);
    expect(doIntervalsOverlap('08:00', '10:00', '10:00', '12:00')).toBe(false);
  });

  it('detects overlaps with intervals crossing midnight', () => {
    expect(doIntervalsOverlap('22:00', '02:00', '23:00', '01:00')).toBe(true);
    expect(doIntervalsOverlap('22:00', '02:00', '01:00', '03:00')).toBe(true);
    expect(doIntervalsOverlap('22:00', '02:00', '03:00', '05:00')).toBe(false);
  });
});

describe('periodStart', () => {
  it('returns valid date strings for week and month', () => {
    const week = periodStart('week', new Date(2026, 9, 15)); // Thursday
    const month = periodStart('month', new Date(2026, 9, 15));
    expect(week).toBe('2026-10-12'); // Monday of that week
    expect(month).toBe('2026-10-01'); // First of the month
  });
});
