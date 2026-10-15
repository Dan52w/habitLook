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
