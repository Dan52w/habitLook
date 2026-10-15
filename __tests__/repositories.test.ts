import { getDb } from '../src/db/client';
import {
  createAccount,
  deleteAccount,
  getAccountBalance,
} from '../src/db/repositories/accounts';
import {
  createExpenseCategory,
  listExpenseCategories,
} from '../src/db/repositories/expenseCategories';
import { getGoalStreak } from '../src/db/repositories/goals';
import { updateExpense } from '../src/db/repositories/expenses';
import {
  deleteTimeBlockOccurrence,
  updateTimeBlock,
} from '../src/db/repositories/timeBlocks';

jest.mock('../src/db/client', () => ({
  getDb: jest.fn(),
}));

const mockedGetDb = getDb as jest.Mock;

function fakeDb(
  handler: (sql: string, params?: unknown[]) => { rows?: unknown[] },
) {
  const executed: { sql: string; params?: unknown[] }[] = [];
  const execute = jest.fn(async (sql: string, params?: unknown[]) => {
    executed.push({ sql, params });
    return handler(sql, params);
  });
  const db = {
    executed,
    execute,
    transaction: jest.fn(
      async (cb: (tx: { execute: typeof execute }) => Promise<void>) => {
        await cb({ execute });
      },
    ),
  };
  mockedGetDb.mockResolvedValue(db);
  return db;
}

describe('accounts repository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calcula el saldo: ingresos - gastos - pagos divididos + transferencias recibidas - enviadas', async () => {
    fakeDb(() => ({
      rows: [
        {
          income: 1000,
          expense: 400,
          splits: 100,
          transfers_in: 200,
          transfers_out: 50,
        },
      ],
    }));
    await expect(getAccountBalance('acc-1')).resolves.toBe(650);
  });

  it('archiva la cuenta cuando tiene movimientos en lugar de eliminarla', async () => {
    const db = fakeDb(sql =>
      sql.includes('COUNT(*) FROM expenses')
        ? { rows: [{ n: 3 }] }
        : { rows: [] },
    );
    await expect(deleteAccount('acc-1')).resolves.toEqual({
      deleted: false,
      reason: 'archived',
    });
    expect(db.executed.some(e => e.sql.includes('SET is_archived = 1'))).toBe(
      true,
    );
    expect(
      db.executed.some(e => e.sql.startsWith('DELETE FROM accounts')),
    ).toBe(false);
  });

  it('elimina la cuenta cuando no tiene movimientos', async () => {
    const db = fakeDb(sql =>
      sql.includes('COUNT(*) FROM expenses')
        ? { rows: [{ n: 0 }] }
        : { rows: [] },
    );
    await expect(deleteAccount('acc-1')).resolves.toEqual({ deleted: true });
    expect(
      db.executed.some(e => e.sql.startsWith('DELETE FROM accounts')),
    ).toBe(true);
  });

  it('createAccount normaliza el nombre y asigna un color', async () => {
    const db = fakeDb(() => ({ rows: [] }));
    const account = await createAccount('  Bancolombia  '.trim(), 'bank');
    expect(account.name).toBe('Bancolombia');
    expect(account.type).toBe('bank');
    expect(account.color).toMatch(/^#/);
    expect(
      db.executed.some(e => e.sql.startsWith('INSERT INTO accounts')),
    ).toBe(true);
  });
});

describe('expenseCategories repository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createExpenseCategory recorta el nombre y devuelve el id', async () => {
    const db = fakeDb(() => ({ rows: [] }));
    const id = await createExpenseCategory('  Comida  ');
    expect(typeof id).toBe('string');
    const insert = db.executed.find(e =>
      e.sql.startsWith('INSERT INTO expense_categories'),
    );
    expect(insert?.params?.[1]).toBe('Comida');
  });

  it('listExpenseCategories devuelve las filas tal cual', async () => {
    fakeDb(() => ({
      rows: [{ id: 'a', name: 'Comida', color: '#fff', icon: '🍽️' }],
    }));
    const list = await listExpenseCategories();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Comida');
  });
});

describe('getGoalStreak', () => {
  beforeEach(() => jest.clearAllMocks());

  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return keyOf(d);
  };

  it('cuenta días consecutivos cumplidos en metas diarias', async () => {
    fakeDb(sql => {
      if (sql.includes('SELECT period, target_value'))
        return { rows: [{ period: 'daily', target_value: 1 }] };
      return {
        rows: [
          { date: daysAgo(0) },
          { date: daysAgo(1) },
          { date: daysAgo(2) },
        ],
      };
    });
    await expect(getGoalStreak('g1')).resolves.toBe(3);
  });

  it('mantiene viva la racha si hoy aún está pendiente', async () => {
    fakeDb(sql => {
      if (sql.includes('SELECT period, target_value'))
        return { rows: [{ period: 'daily', target_value: 1 }] };
      return { rows: [{ date: daysAgo(1) }, { date: daysAgo(2) }] };
    });
    await expect(getGoalStreak('g1')).resolves.toBe(2);
  });

  it('rompe la racha cuando se salta un día completo', async () => {
    fakeDb(sql => {
      if (sql.includes('SELECT period, target_value'))
        return { rows: [{ period: 'daily', target_value: 1 }] };
      return { rows: [{ date: daysAgo(5) }] };
    });
    await expect(getGoalStreak('g1')).resolves.toBe(0);
  });

  it('cuenta semanas consecutivas cumplidas en metas semanales', async () => {
    fakeDb((sql, params) => {
      if (sql.includes('SELECT period, target_value'))
        return { rows: [{ period: 'weekly', target_value: 5 }] };
      if (sql.includes('COALESCE(SUM(value)')) {
        const weekStart = String(params?.[1] ?? '');
        const diffDays =
          (Date.now() - new Date(`${weekStart}T12:00:00`).getTime()) / 86400000;
        return { rows: [{ total: diffDays < 21 ? 7 : 0 }] };
      }
      return { rows: [] };
    });
    await expect(getGoalStreak('g1')).resolves.toBe(3);
  });
});

describe('updateExpense con gastos divididos', () => {
  beforeEach(() => jest.clearAllMocks());

  const splitHandler =
    (balance: number) =>
    (sql: string): { rows?: unknown[] } => {
      if (sql.includes('FROM expenses WHERE id = ?'))
        return { rows: [{ amount: 100, account_id: null, type: 'expense' }] };
      if (sql.includes('COUNT(*) AS n FROM expense_splits'))
        return { rows: [{ n: 2 }] };
      if (sql.includes("type = 'income'"))
        return {
          rows: [
            {
              income: balance,
              expense: 0,
              splits: 0,
              transfers_in: 0,
              transfers_out: 0,
            },
          ],
        };
      return { rows: [] };
    };

  it('convierte a gasto simple eliminando los splits al asignar cuenta', async () => {
    const db = fakeDb(splitHandler(1000));
    await updateExpense({
      id: 'e1',
      amount: 100,
      accountId: 'acc-9',
      date: '2026-10-15',
    });
    const deleted = db.executed.find(e =>
      e.sql.startsWith('DELETE FROM expense_splits'),
    );
    expect(deleted?.params).toEqual(['e1']);
    const updated = db.executed.find(e =>
      e.sql.startsWith('UPDATE expenses SET'),
    );
    expect(updated?.params?.[2]).toBe('acc-9');
  });

  it('no toca los splits si el saldo es insuficiente (falla antes de escribir)', async () => {
    const db = fakeDb(splitHandler(50));
    await expect(
      updateExpense({ id: 'e1', amount: 100, accountId: 'acc-9', date: '2026-10-15' }),
    ).rejects.toThrow('Saldo insuficiente');
    expect(
      db.executed.some(e => e.sql.startsWith('DELETE FROM expense_splits')),
    ).toBe(false);
    expect(db.executed.some(e => e.sql.startsWith('UPDATE expenses SET'))).toBe(
      false,
    );
  });
});

describe('bloques que cruzan medianoche', () => {
  beforeEach(() => jest.clearAllMocks());

  const midnightBlock = {
    start_time: '22:00',
    end_time: '02:00',
    schedule_date: null,
    day_of_week: 1, // lunes
  };
  const dayBlock = {
    start_time: '08:00',
    end_time: '09:00',
    schedule_date: null,
    day_of_week: 2, // martes
  };

  function fakeBlockDb(block: typeof midnightBlock | null) {
    return fakeDb(sql =>
      sql.startsWith('SELECT start_time')
        ? { rows: block ? [block] : [] }
        : { rows: [] },
    );
  }

  it('borrar la ocurrencia vista el día siguiente registra la excepción en la fecha de origen', async () => {
    const db = fakeBlockDb(midnightBlock);
    // Bloque de lunes 22:00–02:00, visto el martes: la excepción debe
    // quedar en el lunes para que el filtro la encuentre.
    await deleteTimeBlockOccurrence('b1', '2026-10-13', true);
    const inserted = db.executed.find(e =>
      e.sql.startsWith('INSERT OR IGNORE INTO time_block_exceptions'),
    );
    expect(inserted?.params).toEqual(['b1', '2026-10-12']);
  });

  it('borrar la ocurrencia el mismo día de origen no cambia la fecha', async () => {
    const db = fakeBlockDb(midnightBlock);
    await deleteTimeBlockOccurrence('b1', '2026-10-12', true);
    const inserted = db.executed.find(e =>
      e.sql.startsWith('INSERT OR IGNORE INTO time_block_exceptions'),
    );
    expect(inserted?.params).toEqual(['b1', '2026-10-12']);
  });

  it('un bloque diurno normal conserva la fecha vista', async () => {
    const db = fakeBlockDb(dayBlock);
    await deleteTimeBlockOccurrence('b2', '2026-10-13', true);
    const inserted = db.executed.find(e =>
      e.sql.startsWith('INSERT OR IGNORE INTO time_block_exceptions'),
    );
    expect(inserted?.params).toEqual(['b2', '2026-10-13']);
  });

  it('editar "toda la serie" desde el día siguiente no desplaza el día de la semana', async () => {
    const db = fakeBlockDb(midnightBlock);
    await updateTimeBlock({
      id: 'b1',
      categoryId: 'c1',
      startTime: '22:00',
      endTime: '02:00',
      date: '2026-10-13', // visto el martes
      recurring: true,
      scope: 'all',
    });
    const updated = db.executed.find(e =>
      e.sql.startsWith('UPDATE time_blocks SET'),
    );
    // day_of_week debe seguir siendo lunes (1), no martes (2)
    expect(updated?.params?.[3]).toBe(1);
  });
});
