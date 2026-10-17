import { getDb } from '../src/db/client';
import {
  getWeeklyCompletionsPerDay,
  getWeeklyGoalStats,
  getWeeklyTimeStats,
} from '../src/db/repositories/weeklyStats';

jest.mock('../src/db/client', () => ({
  getDb: jest.fn(),
}));

jest.mock('../src/db/repositories/timeBlocks', () => ({
  listBlocksForDates: jest.fn(),
}));

const mockedGetDb = getDb as jest.Mock;
const mockedListBlocks = jest.requireMock(
  '../src/db/repositories/timeBlocks',
).listBlocksForDates as jest.Mock;

function fakeDb(
  handler: (sql: string, params?: unknown[]) => { rows?: unknown[] },
) {
  const execute = jest.fn(
    async (sql: string, params?: unknown[]) => handler(sql, params),
  );
  mockedGetDb.mockResolvedValue({ execute });
  return execute;
}

describe('getWeeklyGoalStats', () => {
  it('agrega días completados y valor total por meta en la semana', async () => {
    fakeDb(() => ({
      rows: [
        {
          id: 'g1',
          title: 'Leer',
          target_type: 'count',
          target_value: 1,
          period: 'daily',
          target_date: null,
          days_completed: 5,
          days_active: 6,
          total_value: 5,
        },
        {
          id: 'g2',
          title: 'Correr',
          target_type: 'duration',
          target_value: 120,
          period: 'weekly',
          target_date: null,
          days_completed: 2,
          days_active: 2,
          total_value: 90,
        },
      ],
    }));

    const stats = await getWeeklyGoalStats('2026-10-12', '2026-10-18');

    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({
      goalId: 'g1',
      daysCompleted: 5,
      daysActive: 6,
      weekCompleted: true,
    });
    expect(stats[1]).toMatchObject({
      totalValue: 90,
      weekCompleted: false,
    });
  });

  it('filtra metas de un día fuera de la semana', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    await getWeeklyGoalStats('2026-10-12', '2026-10-18');
    const [, params] = execute.mock.calls[0];
    expect(params).toEqual([
      '2026-10-12',
      '2026-10-18',
      '2026-10-12',
      '2026-10-18',
    ]);
    const sql = execute.mock.calls[0][0] as string;
    expect(sql).toContain('g.target_date >= ? AND g.target_date <= ?');
  });
});

describe('getWeeklyTimeStats', () => {
  it('suma horas por categoría ignorando el tiempo libre', async () => {
    mockedListBlocks.mockResolvedValue({
      '2026-10-12': [
        {
          category_id: 'c1',
          category_name: 'Trabajo',
          category_color: '#ff0000',
          category_emoji: '💼',
          start_time: '09:00',
          end_time: '11:00',
        },
        {
          category_id: '__free__',
          category_name: 'Libre',
          category_color: '#000',
          category_emoji: '○',
          start_time: '11:00',
          end_time: '12:00',
        },
        {
          category_id: 'c1',
          category_name: 'Trabajo',
          category_color: '#ff0000',
          category_emoji: '💼',
          start_time: '23:00',
          end_time: '01:00',
        },
      ],
      '2026-10-13': [
        {
          category_id: 'c2',
          category_name: 'Estudio',
          category_color: '#00ff00',
          category_emoji: null,
          start_time: '08:00',
          end_time: '09:30',
        },
      ],
    });

    const stats = await getWeeklyTimeStats(['2026-10-12', '2026-10-13']);

    expect(stats).toHaveLength(2);
    // Trabajo: 2 h + 2 h (trasnoche) = 4 h
    expect(stats[0]).toMatchObject({ categoryId: 'c1', hours: 4 });
    expect(stats[1]).toMatchObject({ categoryId: 'c2', hours: 1.5 });
  });
});

describe('getWeeklyCompletionsPerDay', () => {
  it('agrega completados por fecha', async () => {
    fakeDb(() => ({
      rows: [
        { date: '2026-10-12', completed: 2 },
        { date: '2026-10-14', completed: 4 },
      ],
    }));
    const days = await getWeeklyCompletionsPerDay('2026-10-12', '2026-10-18');
    expect(days).toEqual([
      { date: '2026-10-12', completed: 2 },
      { date: '2026-10-14', completed: 4 },
    ]);
  });
});
