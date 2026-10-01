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
