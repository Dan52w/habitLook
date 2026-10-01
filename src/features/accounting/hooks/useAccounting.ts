import { useCallback, useEffect, useMemo, useState } from 'react';
import { Account, getAllAccountBalances, listAccounts } from '../../../db/repositories/accounts';
import { ExpenseCategory, listExpenseCategories } from '../../../db/repositories/expenseCategories';
import { listExpensesWithDetails } from '../../../db/repositories/expenses';
import { listTransfersWithDetails } from '../../../db/repositories/transfers';
import { periodStart } from '../../../shared/utils/date';
import { useFocusEffect } from '@react-navigation/native';

export { periodStart };

export type ExpenseRow = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  note: string | null;
  date: string;
  category_name: string | null;
  category_id?: string | null;
  account_name: string | null;
  account_id?: string;
  split_summary: string | null;
};

export type TransferRow = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  from_name: string;
  to_name: string;
};

export function useAccounting() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [period, setPeriod] = useState<'week' | 'month'>('month');

  const load = useCallback(async () => {
    const [loadedAccounts, loadedCategories, loadedRows, loadedTransfers, allBalances] =
      await Promise.all([
        listAccounts(),
        listExpenseCategories(),
        listExpensesWithDetails(),
        listTransfersWithDetails(),
        getAllAccountBalances(),
      ]);

    setAccounts(loadedAccounts);
    setCategories(loadedCategories);
    setRows(loadedRows as ExpenseRow[]);
    setTransfers(loadedTransfers as TransferRow[]);
    setBalances(allBalances);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const startDate = useMemo(() => periodStart(period), [period]);

  const recentRows = useMemo(
    () => rows.filter(row => row.date >= startDate),
    [rows, startDate]
  );

  const recentTransfers = useMemo(
    () => transfers.filter(item => item.date >= startDate),
    [transfers, startDate]
  );

  const totals = useMemo(() => {
    return recentRows.reduce(
      (result, row) => {
        if (row.type === 'income') {
          result.income += Number(row.amount);
        } else {
          result.expense += Number(row.amount);
        }
        return result;
      },
      { income: 0, expense: 0 }
    );
  }, [recentRows]);

  return {
    accounts,
    balances,
    categories,
    rows,
    transfers,
    period,
    setPeriod,
    recentRows,
    recentTransfers,
    totals,
    load,
  };
}
