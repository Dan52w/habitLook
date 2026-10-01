import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { getAccountBalance } from './accounts';

export async function createTransfer(input: { fromAccountId: string; toAccountId: string; amount: number; note?: string; date: string }): Promise<void> {
  if (input.fromAccountId === input.toAccountId) throw new Error('Las cuentas deben ser distintas.');
  const roundedAmount = Math.round(input.amount);
  if (roundedAmount > await getAccountBalance(input.fromAccountId)) throw new Error('Saldo insuficiente en la cuenta de origen.');
  const db = await getDb();
  await db.execute(
    'INSERT INTO transfers (id, from_account_id, to_account_id, amount, note, date) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), input.fromAccountId, input.toAccountId, roundedAmount, input.note ?? null, input.date],
  );
}

export async function listTransfersWithDetails() {
  const db = await getDb();
  const result = await db.execute(`SELECT t.*, source.name AS from_name, destination.name AS to_name FROM transfers t JOIN accounts source ON source.id = t.from_account_id JOIN accounts destination ON destination.id = t.to_account_id ORDER BY t.date DESC, t.created_at DESC`);
  return result.rows ?? [];
}

export async function deleteTransfer(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM transfers WHERE id = ?', [id]);
}
