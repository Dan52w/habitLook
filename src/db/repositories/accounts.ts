import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';

export type Account = {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'other';
  color: string | null;
  is_archived: number;
  created_at: string;
};

export async function createAccount(name: string, type: Account['type'], color?: string) {
  const db = await getDb();
  const id = uuidv4();
  await db.execute('INSERT INTO accounts (id, name, type, color) VALUES (?, ?, ?, ?)', [id, name, type, color ?? null]);
  return id;
}

export async function listAccounts(includeArchived = false): Promise<Account[]> {
  const db = await getDb();
  const query = includeArchived
    ? 'SELECT * FROM accounts ORDER BY created_at ASC'
    : 'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY created_at ASC';
  const result = await db.execute(query);
  return (result.rows ?? []) as Account[];
}

export async function getAccountBalance(accountId: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT
      COALESCE((SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) FROM expenses WHERE account_id = ?), 0)
      - COALESCE((SELECT SUM(amount) FROM expense_splits WHERE account_id = ?), 0)
      + COALESCE((SELECT SUM(amount) FROM transfers WHERE to_account_id = ?), 0)
      - COALESCE((SELECT SUM(amount) FROM transfers WHERE from_account_id = ?), 0) AS balance`,
    [accountId, accountId, accountId, accountId],
  );
  return (result.rows?.[0]?.balance ?? 0) as number;
}

export async function getAllAccountBalances(): Promise<Record<string, number>> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT
      a.id,
      COALESCE(e.direct_net, 0)
      - COALESCE(s.split_sum, 0)
      + COALESCE(t_in.transfer_in, 0)
      - COALESCE(t_out.transfer_out, 0) AS balance
    FROM accounts a
    LEFT JOIN (
      SELECT account_id, SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS direct_net
      FROM expenses WHERE account_id IS NOT NULL GROUP BY account_id
    ) e ON e.account_id = a.id
    LEFT JOIN (
      SELECT account_id, SUM(amount) AS split_sum
      FROM expense_splits GROUP BY account_id
    ) s ON s.account_id = a.id
    LEFT JOIN (
      SELECT to_account_id, SUM(amount) AS transfer_in
      FROM transfers GROUP BY to_account_id
    ) t_in ON t_in.to_account_id = a.id
    LEFT JOIN (
      SELECT from_account_id, SUM(amount) AS transfer_out
      FROM transfers GROUP BY from_account_id
    ) t_out ON t_out.from_account_id = a.id
  `);
  const record: Record<string, number> = {};
  for (const row of (result.rows ?? []) as any[]) {
    record[row.id] = Math.round(row.balance ?? 0);
  }
  return record;
}

export async function updateAccount(id: string, name: string, type: Account['type'], color?: string): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE accounts SET name = ?, type = ?, color = ? WHERE id = ?', [name.trim(), type, color ?? null, id]);
}

export async function deleteAccount(id: string): Promise<{ deleted: boolean; reason?: string }> {
  const db = await getDb();
  const check = await db.execute(`
    SELECT
      (SELECT COUNT(*) FROM expenses WHERE account_id = ?) +
      (SELECT COUNT(*) FROM expense_splits WHERE account_id = ?) +
      (SELECT COUNT(*) FROM transfers WHERE from_account_id = ? OR to_account_id = ?) AS total_count
  `, [id, id, id, id]);
  const count = Number(check.rows?.[0]?.total_count ?? 0);
  if (count > 0) {
    await db.execute('UPDATE accounts SET is_archived = 1 WHERE id = ?', [id]);
    return { deleted: false, reason: 'archived' };
  }
  await db.execute('DELETE FROM accounts WHERE id = ?', [id]);
  return { deleted: true };
}

export async function archiveAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE accounts SET is_archived = 1 WHERE id = ?', [id]);
}
