import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Account } from '../../db/repositories/accounts';
import { createExpenseCategory } from '../../db/repositories/expenseCategories';
import { light, useTheme } from '../../shared/theme/ThemeProvider';
import { ExpenseRow, useAccounting } from './hooks/useAccounting';
import { SummaryCard } from './components/SummaryCard';
import { AccountList } from './components/AccountList';
import { MovementForm } from './components/MovementForm';
import { HistoryList } from './components/HistoryList';
import { AccountModal } from './components/AccountModal';
import { TransferModal } from './components/TransferModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { SectionHeader } from '../../shared/components/SectionHeader';

export function AccountingScreen() {
  const theme = useTheme();
  const themed = theme.isLight ? lightStyles : undefined;

  const {
    accounts,
    balances,
    categories,
    period,
    setPeriod,
    recentRows,
    recentTransfers,
    totals,
    load,
  } = useAccounting();

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);

  // Inicializa la cuenta seleccionada cuando cargan las cuentas sin re-ejecutar load()
  useEffect(() => {
    if (
      (!selectedAccountId || !accounts.some(a => a.id === selectedAccountId)) &&
      accounts.length > 0
    ) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleAddCategory = async (name: string): Promise<string> => {
    const id = await createExpenseCategory(name);
    await load();
    return id;
  };

  return (
    <SafeAreaView style={[styles.container, themed?.container]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader
          eyebrow="CONTABILIDAD"
          title="Tu dinero, claro y simple"
          action={
            <Pressable
              onPress={() => {
                setEditingAccount(null);
                setAccountModalVisible(true);
              }}
              style={styles.addAccount}
            >
              <Text style={styles.addAccountText}>+ Banco</Text>
            </Pressable>
          }
        />

        <SummaryCard totals={totals} period={period} themed={themed} />

        <AccountList
          accounts={accounts}
          balances={balances}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onAddAccount={() => {
            setEditingAccount(null);
            setAccountModalVisible(true);
          }}
          onEditAccount={acc => {
            setEditingAccount(acc);
            setAccountModalVisible(true);
          }}
          onOpenTransfer={() => setTransferModalVisible(true)}
        />

        <MovementForm
          accounts={accounts}
          categories={categories}
          balances={balances}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onMovementCreated={load}
          onAddCategory={handleAddCategory}
        />

        <HistoryList
          recentRows={recentRows}
          recentTransfers={recentTransfers}
          period={period}
          onPeriodChange={setPeriod}
          onEditExpense={setEditingExpense}
          onRefresh={load}
        />
      </ScrollView>

      <AccountModal
        visible={accountModalVisible}
        editingAccount={editingAccount}
        onClose={() => {
          setAccountModalVisible(false);
          setEditingAccount(null);
        }}
        onSaved={async () => {
          await load();
          setAccountModalVisible(false);
          setEditingAccount(null);
        }}
      />

      <TransferModal
        visible={transferModalVisible}
        accounts={accounts}
        onClose={() => setTransferModalVisible(false)}
        onSaved={async () => {
          await load();
          setTransferModalVisible(false);
        }}
      />

      <EditExpenseModal
        visible={Boolean(editingExpense)}
        expense={editingExpense}
        accounts={accounts}
        categories={categories}
        onClose={() => setEditingExpense(null)}
        onSaved={async () => {
          await load();
          setEditingExpense(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' },
  content: { padding: 20, gap: 14, paddingBottom: 36 },
  addAccount: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#725A9B',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addAccountText: { color: '#D9C9F3', fontSize: 12, fontWeight: '800' },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  card: { backgroundColor: light.surface },
  text: { color: light.text },
  muted: { color: light.muted },
});
