import {
  listBlocksForDate,
  listBlocksForDates,
} from '../src/db/repositories/timeBlocks';
import { listExpensesWithDetails } from '../src/db/repositories/expenses';
import { buildContextBlocks } from '../src/services/ai/context';

jest.mock('../src/db/repositories/timeBlocks', () => ({
  listBlocksForDate: jest.fn(async () => []),
  listBlocksForDates: jest.fn(async () => ({})),
}));
jest.mock('../src/db/repositories/goals', () => ({
  listTodayGoals: jest.fn(async () => []),
}));
jest.mock('../src/db/repositories/notes', () => ({
  listNotes: jest.fn(async () => []),
}));
jest.mock('../src/db/repositories/expenses', () => ({
  listExpensesWithDetails: jest.fn(async () => []),
}));

const mockedListBlocksForDate = listBlocksForDate as jest.Mock;
const mockedListBlocksForDates = listBlocksForDates as jest.Mock;
const mockedListExpenses = listExpensesWithDetails as jest.Mock;

const RANGE = { startDate: '2026-10-01', endDate: '2026-10-31', label: 'octubre' };

describe('rangos de contexto de la IA', () => {
  beforeEach(() => jest.clearAllMocks());

  it('plan del día usa listBlocksForDate', async () => {
    const blocks = await buildContextBlocks(['plan'], RANGE, {
      planRange: 'day',
    });
    expect(mockedListBlocksForDate).toHaveBeenCalledTimes(1);
    expect(mockedListBlocksForDates).not.toHaveBeenCalled();
    expect(blocks[0].label).toBe('Plan de hoy');
  });

  it('plan semanal pide 7 días y etiqueta la semana', async () => {
    const blocks = await buildContextBlocks(['plan'], RANGE, {
      planRange: 'week',
    });
    expect(mockedListBlocksForDates).toHaveBeenCalledTimes(1);
    const dates: string[] = mockedListBlocksForDates.mock.calls[0][0];
    expect(dates).toHaveLength(7);
    expect(blocks[0].label).toBe('Plan de la semana');
  });

  it('plan mensual pide los días del mes', async () => {
    const blocks = await buildContextBlocks(['plan'], RANGE, {
      planRange: 'month',
    });
    const dates: string[] = mockedListBlocksForDates.mock.calls[0][0];
    expect(dates.length).toBeGreaterThan(27);
    expect(dates.length).toBeLessThanOrEqual(31);
    expect(blocks[0].label).toBe('Plan del mes');
  });

  it('gastos del periodo actual hace 2 consultas (periodo + anterior)', async () => {
    const blocks = await buildContextBlocks(['expenses'], RANGE, {
      expensesMode: 'current',
    });
    expect(mockedListExpenses).toHaveBeenCalledTimes(2);
    expect(blocks[0].label).toContain('Gastos ·');
  });

  it('gastos últimos 3 consulta 3 periodos', async () => {
    const blocks = await buildContextBlocks(['expenses'], RANGE, {
      expensesMode: 'last3',
      periodType: 'month',
    });
    expect(mockedListExpenses).toHaveBeenCalledTimes(3);
    expect(blocks[0].label).toBe('Gastos · últimos 3');
    expect(blocks[0].text).toContain('últimos 3 meses');
  });
});
