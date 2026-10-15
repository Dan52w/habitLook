import { buildRingSegments } from '../src/features/clock/utils/clockMath';

test('rellena los huecos del día con tiempo libre', () => {
  const segments = buildRingSegments(
    [
      {
        categoryId: 'study',
        categoryName: 'Estudio',
        color: '#A78BFA',
        startMinutes: 540,
        endMinutes: 600,
      },
    ],
    480,
    720,
  );

  expect(segments.map(segment => segment.categoryName)).toEqual([
    'Libre',
    'Estudio',
    'Libre',
  ]);
  expect(
    segments.reduce(
      (total, segment) => total + (segment.endMinutes - segment.startMinutes),
      0,
    ),
  ).toBe(240);
});

test('el reloj exterior cubre únicamente el ciclo completo 06:00–17:59', () => {
  const segments = buildRingSegments(
    [
      {
        categoryId: 'class',
        categoryName: 'Clase',
        color: '#A78BFA',
        startMinutes: 1020,
        endMinutes: 1080,
      },
    ],
    360,
    1080,
    0,
    360,
  );

  const classSegment = segments.find(segment => segment.categoryId === 'class');
  expect(classSegment?.startAngle).toBe(330);
  expect(classSegment?.endAngle).toBe(360);
});

test('el reloj interior reinicia en 18:00 y pasa por medianoche', () => {
  const segments = buildRingSegments(
    [
      {
        categoryId: 'night',
        categoryName: 'Noche',
        color: '#A78BFA',
        startMinutes: 1440,
        endMinutes: 1500,
      },
    ],
    1080,
    1800,
    0,
    360,
  );

  const nightSegment = segments.find(segment => segment.categoryId === 'night');
  expect(nightSegment?.startAngle).toBe(180);
  expect(nightSegment?.endAngle).toBe(210);
});
