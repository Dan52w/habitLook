import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';

export type AccountType = 'bank' | 'cash' | 'other';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  color: string | null;
  is_archived: number;
  created_at: string;
};

const ACCOUNT_COLORS = [
  '#A78BFA',
  '#64D9A0',
  '#7CC7FF',
  '#F5B86B',
  '#F08CA0',
  '#E895A4',
];

export async function listAccounts(
  includeArchived = false,
): Promise<Account[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT * FROM accounts ${
      includeArchived ? '' : 'WHERE is_archived = 0'
    } ORDER BY created_at ASC`,
  );
  return (result.rows ?? []) as Account[];
}

export async function createAccount(
  name: string,
  type: AccountType,
): Promise<Account> {
  const db = await getDb();
  const id = uuidv4();
  const existing = await listAccounts(true);
  const color = ACCOUNT_COLORS[existing.length % ACCOUNT_COLORS.length];
  await db.execute(
    'INSERT INTO accounts (id, name, type, color) VALUES (?, ?, ?, ?)',
    [id, name, type, color],
  );
  return {
    id,
    name,
    type,
    color,
    is_archived: 0,
    created_at: new Date().toISOString(),
  };
}

export async function updateAccount(
  id: string,
  name: string,
  type: AccountType,
): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE accounts SET name = ?, type = ? WHERE id = ?', [
    name,
    type,
    id,
  ]);
}

export async function deleteAccount(
  id: string,
): Promise<{ deleted: boolean; reason?: 'archived' }> {
  const db = await getDb();
  const usage = await db.execute(
    `SELECT
       (SELECT COUNT(*) FROM expenses WHERE account_id = ?) +
       (SELECT COUNT(*) FROM expense_splits WHERE account_id = ?) +
       (SELECT COUNT(*) FROM transfers WHERE from_account_id = ? OR to_account_id = ?) AS n`,
    [id, id, id, id],
  );
  const movements = Number(
    (usage.rows?.[0] as { n?: number } | undefined)?.n ?? 0,
  );
  if (movements > 0) {
    await db.execute('UPDATE accounts SET is_archived = 1 WHERE id = ?', [id]);
    return { deleted: false, reason: 'archived' };
  }
  await db.execute('DELETE FROM accounts WHERE id = ?', [id]);
  return { deleted: true };
}

export async function getAccountBalance(accountId: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM expenses WHERE type = 'income' AND account_id = ?), 0) AS income,
       COALESCE((SELECT SUM(amount) FROM expenses WHERE type = 'expense' AND account_id = ?), 0) AS expense,
       COALESCE((SELECT SUM(amount) FROM expense_splits WHERE account_id = ?), 0) AS splits,
       COALESCE((SELECT SUM(amount) FROM transfers WHERE to_account_id = ?), 0) AS transfers_in,
       COALESCE((SELECT SUM(amount) FROM transfers WHERE from_account_id = ?), 0) AS transfers_out`,
    [accountId, accountId, accountId, accountId, accountId],
  );
  const row = (result.rows?.[0] ?? {}) as Record<string, number>;
  return (
    Number(row.income ?? 0) -
    Number(row.expense ?? 0) -
    Number(row.splits ?? 0) +
    Number(row.transfers_in ?? 0) -
    Number(row.transfers_out ?? 0)
  );
}

export async function getAllAccountBalances(): Promise<Record<string, number>> {
  const accounts = await listAccounts(true);
  const balances: Record<string, number> = {};
  await Promise.all(
    accounts.map(async account => {
      balances[account.id] = await getAccountBalance(account.id);
    }),
  );
  return balances;
}
