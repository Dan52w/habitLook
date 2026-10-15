const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function normalizeTimeString(val: string): string {
  if (!val) return '00:00';
  const parts = val.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const validH = isNaN(h) ? 0 : Math.min(23, Math.max(0, h));
  const validM = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));
  return `${String(validH).padStart(2, '0')}:${String(validM).padStart(
    2,
    '0',
  )}`;
}

export function doIntervalsOverlap(
  s1: string,
  e1: string,
  s2: string,
  e2: string,
): boolean {
  const start1 = toMinutes(s1);
  const end1 = toMinutes(e1);
  const start2 = toMinutes(s2);
  const end2 = toMinutes(e2);

  const intervals1 =
    start1 < end1
      ? [[start1, end1]]
      : [
          [start1, 1440],
          [0, end1],
        ];
  const intervals2 =
    start2 < end2
      ? [[start2, end2]]
      : [
          [start2, 1440],
          [0, end2],
        ];

  for (const [aStart, aEnd] of intervals1) {
    for (const [bStart, bEnd] of intervals2) {
      if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
        return true;
      }
    }
  }
  return false;
}
