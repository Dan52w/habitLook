import { getDb } from '../src/db/client';
import {
  addDebtPayment,
  createDebt,
  deleteDebt,
  getDebtTotals,
  listDebts,
} from '../src/db/repositories/debts';

jest.mock('../src/db/client', () => ({
  getDb: jest.fn(),
}));

const mockedGetDb = getDb as jest.Mock;

function fakeDb(
  handler: (sql: string, params?: unknown[]) => { rows?: unknown[] },
) {
  const execute = jest.fn(
    async (sql: string, params?: unknown[]) => handler(sql, params),
  );
  mockedGetDb.mockResolvedValue({ execute });
  return execute;
}

describe('debts', () => {
  it('createDebt guarda dirección, monto y fecha límite', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    const id = await createDebt({
      title: 'Préstamo moto',
      person: 'Juan',
      direction: 'owe',
      total: 500000,
      dueDate: '2026-11-30',
    });
    expect(typeof id).toBe('string');
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('INSERT INTO debts');
    expect(params).toContain('owe');
    expect(params).toContain(500000);
    expect(params).toContain('2026-11-30');
  });

  it('listDebts calcula pagado, restante y estado', async () => {
    fakeDb(() => ({
      rows: [
        {
          id: 'd1',
          title: 'A',
          person: null,
          direction: 'owe',
          total: 100,
          due_date: null,
          note: null,
          created_at: '2026-10-01',
          paid: 40,
        },
        {
          id: 'd2',
          title: 'B',
          person: null,
          direction: 'owed',
          total: 50,
          due_date: '2020-01-01',
          note: null,
          created_at: '2026-10-01',
          paid: 50,
        },
      ],
    }));
    const debts = await listDebts();
    expect(debts[0]).toMatchObject({
      paid: 40,
      remaining: 60,
      status: 'pending',
    });
    expect(debts[1]).toMatchObject({ remaining: 0, status: 'paid' });
  });

  it('listDebts marca vencida cuando pasó la fecha con saldo', async () => {
    fakeDb(() => ({
      rows: [
        {
          id: 'd1',
          title: 'Vencida',
          person: null,
          direction: 'owe',
          total: 100,
          due_date: '2020-01-01',
          note: null,
          created_at: '2020-01-01',
          paid: 10,
        },
      ],
    }));
    const [debt] = await listDebts();
    expect(debt.status).toBe('overdue');
    expect(debt.remaining).toBe(90);
  });

  it('getDebtTotals no multiplica el total por los abonos', async () => {
    const execute = fakeDb(() => ({
      rows: [
        { direction: 'owe', total: 300, remaining: 200 },
        { direction: 'owed', total: 100, remaining: 100 },
      ],
    }));
    const totals = await getDebtTotals();
    expect(execute.mock.calls[0][0]).toContain('GROUP BY debt_id');
    expect(totals).toMatchObject({
      oweTotal: 300,
      oweRemaining: 200,
      owedTotal: 100,
      owedRemaining: 100,
    });
  });

  it('addDebtPayment solo inserta en debt_payments', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    await addDebtPayment({ debtId: 'd1', amount: 25000 });
    const [sql] = execute.mock.calls[0];
    expect(sql).toContain('INSERT INTO debt_payments');
    expect(sql).not.toContain('expenses');
  });

  it('deleteDebt borra la deuda', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    await deleteDebt('d1');
    expect(execute).toHaveBeenCalledWith('DELETE FROM debts WHERE id = ?', [
      'd1',
    ]);
  });
});
