import { getDb } from '../src/db/client';
import {
  createGoal,
  listGoalsWithReminders,
  updateGoalReminder,
} from '../src/db/repositories/goals';
import {
  createNote,
  getNoteReminderNotes,
  updateNote,
} from '../src/db/repositories/notes';

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

describe('goal reminders (repo)', () => {
  it('createGoal devuelve el id y guarda reminder_time', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    const id = await createGoal({
      categoryId: 'c1',
      title: 'Leer',
      targetType: 'count',
      targetValue: 1,
      period: 'daily',
      reminderTime: '20:00',
    });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('reminder_time');
    expect(params).toContain('20:00');
  });

  it('updateGoalReminder actualiza la hora', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    await updateGoalReminder('g1', '08:30');
    expect(execute).toHaveBeenCalledWith(
      'UPDATE goals SET reminder_time = ? WHERE id = ?',
      ['08:30', 'g1'],
    );
  });

  it('updateGoalReminder permite quitar el recordatorio', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    await updateGoalReminder('g1', null);
    expect(execute).toHaveBeenCalledWith(
      'UPDATE goals SET reminder_time = ? WHERE id = ?',
      [null, 'g1'],
    );
  });

  it('listGoalsWithReminders solo trae metas con hora', async () => {
    const execute = fakeDb(() => ({
      rows: [
        {
          id: 'g1',
          title: 'Leer',
          target_type: 'count',
          target_value: 1,
          reminder_time: '20:00',
        },
      ],
    }));
    const goals = await listGoalsWithReminders();
    expect(execute.mock.calls[0][0]).toContain(
      'WHERE reminder_time IS NOT NULL',
    );
    expect(goals).toEqual([
      {
        id: 'g1',
        title: 'Leer',
        target_type: 'count',
        target_value: 1,
        reminder_time: '20:00',
      },
    ]);
  });
});

describe('note reminders (repo)', () => {
  it('createNote devuelve el id y guarda reminder_at', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    const id = await createNote(
      'Llevar agua',
      undefined,
      undefined,
      '2026-10-17',
      '2026-10-17T08:00',
    );
    expect(typeof id).toBe('string');
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('reminder_at');
    expect(params).toContain('2026-10-17T08:00');
  });

  it('updateNote puede cambiar el recordatorio sin tocar el texto', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    await updateNote('n1', 'texto', '2026-10-18T09:00');
    expect(execute).toHaveBeenCalledWith(
      'UPDATE notes SET text = ?, reminder_at = ? WHERE id = ?',
      ['texto', '2026-10-18T09:00', 'n1'],
    );
  });

  it('updateNote sin reminderAt no toca la columna', async () => {
    const execute = fakeDb(() => ({ rows: [] }));
    await updateNote('n1', 'texto');
    expect(execute).toHaveBeenCalledWith(
      'UPDATE notes SET text = ? WHERE id = ?',
      ['texto', 'n1'],
    );
  });

  it('getNoteReminderNotes filtra por reminder_at no nulo', async () => {
    const execute = fakeDb(() => ({
      rows: [{ id: 'n1', reminder_at: '2026-10-18T09:00' }],
    }));
    const notes = await getNoteReminderNotes();
    expect(execute.mock.calls[0][0]).toContain(
      'WHERE n.reminder_at IS NOT NULL',
    );
    expect(notes).toHaveLength(1);
  });
});
