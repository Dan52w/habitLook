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
import { DebtSection } from './components/DebtSection';
import { FirstTimeTip, FirstTimeTipOnOpen, TipText } from '../../shared/components/FirstTimeTip';
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
    periodLabel,
    isCurrentPeriod,
    goPreviousPeriod,
    goNextPeriod,
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
              style={[styles.addAccount, theme.isLight && lightStyles.addAccount]}
            >
              <Text style={[styles.addAccountText, theme.isLight && lightStyles.addAccountText]}>
                + Cuenta
              </Text>
            </Pressable>
          }
        />

        <SummaryCard
          totals={totals}
          period={period}
          periodLabel={periodLabel}
          themed={themed}
        />

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

        <DebtSection />

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
          periodLabel={periodLabel}
          onPreviousPeriod={goPreviousPeriod}
          onNextPeriod={goNextPeriod}
          canGoNextPeriod={!isCurrentPeriod}
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

      <FirstTimeTipOnOpen
        open={transferModalVisible}
        tipKey="transferencias"
        icon="🔄"
        title="Mover dinero entre tus cuentas"
      >
        <TipText>
          Si pasas plata de tu banco a tu efectivo (o al revés), regístralo
          aquí.
        </TipText>
        <TipText>
          No es un gasto ni un ingreso: tu plata solo cambia de lugar, así
          que tus cuentas quedan al día.
        </TipText>
      </FirstTimeTipOnOpen>

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

      <FirstTimeTip tipKey="contabilidad" icon="💰" title="Tu dinero sin enredos">
        <TipText>
          Primero crea tus cuentas: tu banco, tu efectivo o lo que uses. Luego
          anota lo que entra y lo que sale.
        </TipText>
        <TipText>
          En “Deudas” anotas lo que debes o lo que te deben, aparte de tus
          gastos: pagar una deuda no es un gasto nuevo, es saldar algo que ya
          debías.
        </TipText>
        <TipText>Todo queda guardado solo en tu teléfono.</TipText>
      </FirstTimeTip>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0F' },
  content: { padding: 20, gap: 20, paddingBottom: 36 },
  addAccount: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addAccountText: { color: '#FAFAFA', fontSize: 12, fontWeight: '600' },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  card: { backgroundColor: light.surface },
  text: { color: light.text },
  muted: { color: light.muted },
  addAccount: { backgroundColor: light.text, borderColor: light.text },
  addAccountText: { color: '#FFFFFF' },
});
