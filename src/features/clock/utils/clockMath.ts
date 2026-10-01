export type TimeBlockSegment = {
  categoryId: string;
  categoryName: string;
  color: string;
  emoji?: string | null;
  startMinutes: number; // minutos desde medianoche
  endMinutes: number;
};

export type RingSegment = {
  categoryId: string;
  categoryName: string;
  color: string;
  emoji?: string | null;
  startAngle: number; // grados, 0 = arriba (12 en punto)
  endAngle: number;
  startMinutes: number;
  endMinutes: number;
  hours: number;
};

const FREE_COLOR = '#4B4F5A';
const FREE_LABEL = 'Libre';

export function buildRingSegments(
  blocks: TimeBlockSegment[],
  windowStartMinutes: number, // ej. 8*60
  windowEndMinutes: number,   // ej. 20*60
  arcStart = 0,
  arcSpan = 360,
): RingSegment[] {
  const windowLength = windowEndMinutes - windowStartMinutes;
  const toAngle = (minutes: number) => arcStart + ((minutes - windowStartMinutes) / windowLength) * arcSpan;

  const clamped = blocks
    .map((b) => ({
      ...b,
      startMinutes: Math.max(b.startMinutes, windowStartMinutes),
      endMinutes: Math.min(b.endMinutes, windowEndMinutes),
    }))
    .filter((b) => b.endMinutes > b.startMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const segments: RingSegment[] = [];
  let cursor = windowStartMinutes;

  for (const block of clamped) {
    if (block.startMinutes > cursor) {
      segments.push(freeSegment(cursor, block.startMinutes, toAngle));
    }
    segments.push({
      categoryId: block.categoryId,
      categoryName: block.categoryName,
      color: block.color,
      emoji: block.emoji,
      startAngle: toAngle(block.startMinutes),
      endAngle: toAngle(block.endMinutes),
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      hours: (block.endMinutes - block.startMinutes) / 60,
    });
    cursor = Math.max(cursor, block.endMinutes);
  }

  if (cursor < windowEndMinutes) {
    segments.push(freeSegment(cursor, windowEndMinutes, toAngle));
  }

  return segments;

  function freeSegment(start: number, end: number, angleFn: (m: number) => number): RingSegment {
    return {
      categoryId: '__free__',
      categoryName: FREE_LABEL,
      color: FREE_COLOR,
      emoji: '○',
      startAngle: angleFn(start),
      endAngle: angleFn(end),
      startMinutes: start,
      endMinutes: end,
      hours: (end - start) / 60,
    };
  }
}

export function mergeSegmentsByCategory(segments: RingSegment[]) {
  const map = new Map<string, { categoryName: string; color: string; hours: number }>();
  for (const s of segments) {
    const existing = map.get(s.categoryId);
    if (existing) existing.hours += s.hours;
    else map.set(s.categoryId, { categoryName: s.categoryName, color: s.color, hours: s.hours });
  }
  return Array.from(map.values());
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180; // -90 para que 0° quede arriba
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

export function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function angleForClockHand(date: Date, kind: 'hour' | 'minute') {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  if (kind === 'minute') return (minutes / 60) * 360;
  return ((hours + minutes / 60) / 12) * 360;
}
