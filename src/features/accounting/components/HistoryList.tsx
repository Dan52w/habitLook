import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ExpenseRow, TransferRow } from '../hooks/useAccounting';
import { deleteExpense } from '../../../db/repositories/expenses';
import { deleteTransfer } from '../../../db/repositories/transfers';
import { money } from '../utils/currency';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';
import { useAppDialog } from '../../../shared/context/DialogContext';

type Props = {
  recentRows: ExpenseRow[];
  recentTransfers: TransferRow[];
  period: 'week' | 'month';
  onPeriodChange: (p: 'week' | 'month') => void;
  onEditExpense: (row: ExpenseRow) => void;
  onRefresh: () => Promise<void>;
};

export function HistoryList({
  recentRows,
  recentTransfers,
  period,
  onPeriodChange,
  onEditExpense,
  onRefresh,
}: Props) {
  const theme = useTheme();
  const { showConfirm } = useAppDialog();

  const handleDeleteExpense = (id: string) => {
    showConfirm({
      title: 'Eliminar movimiento',
      message: 'Esta acción ajustará el saldo de la cuenta.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        await deleteExpense(id);
        await onRefresh();
      },
    });
  };

  const handleDeleteTransfer = (id: string) => {
    showConfirm({
      title: 'Eliminar transferencia',
      message: 'El dinero volverá al saldo anterior de ambas cuentas.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        await deleteTransfer(id);
        await onRefresh();
      },
    });
  };

  const hasItems = recentRows.length > 0 || recentTransfers.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.historyHead}>
        <Text style={[styles.section, theme.isLight && lightStyles.section]}>Resumen</Text>
        <View style={[styles.periods, theme.isLight && lightStyles.periods]}>
          {(['week', 'month'] as const).map(value => (
            <Pressable
              key={value}
              onPress={() => onPeriodChange(value)}
              style={[
                styles.period,
                period === value && styles.periodActive,
                theme.isLight && period === value && lightStyles.periodActive,
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  theme.isLight && lightStyles.periodText,
                  theme.isLight && period === value && lightStyles.periodTextActive,
                ]}
              >
                {value === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!hasItems ? (
        <Text style={[styles.empty, theme.isLight && lightStyles.empty]}>
          Aún no hay movimientos en este periodo.
        </Text>
      ) : (
        <>
          {recentRows.map(item => (
            <Pressable
              key={item.id}
              onPress={() => onEditExpense(item)}
              style={[styles.row, theme.isLight && lightStyles.row]}
            >
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, theme.isLight && lightStyles.rowName]}>
                  {item.note || item.category_name || 'Movimiento'}
                </Text>
                <Text style={[styles.rowMeta, theme.isLight && lightStyles.rowMeta]}>
                  {item.split_summary
                    ? `Pago combinado · ${item.split_summary}`
                    : `${item.category_name || 'Sin categoría'} · ${item.account_name || ''}`}
                </Text>
              </View>
              <Text
                style={[
                  styles.rowAmount,
                  item.type === 'income' ? styles.income : styles.expense,
                ]}
              >
                {item.type === 'income' ? '+' : '−'} {money(Number(item.amount))}
              </Text>
              <Pressable
                accessibilityLabel="Editar movimiento"
                hitSlop={8}
                onPress={() => onEditExpense(item)}
              >
                <Text style={styles.edit}>✎</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Eliminar movimiento"
                hitSlop={8}
                onPress={() => handleDeleteExpense(item.id)}
              >
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </Pressable>
          ))}

          {recentTransfers.map(item => (
            <View
              key={`transfer-${item.id}`}
              style={[styles.row, theme.isLight && lightStyles.row]}
            >
              <View style={styles.rowInfo}>
                <Text style={[styles.rowName, theme.isLight && lightStyles.rowName]}>
                  {item.note || 'Transferencia entre cuentas'}
                </Text>
                <Text style={[styles.rowMeta, theme.isLight && lightStyles.rowMeta]}>
                  {item.from_name} → {item.to_name}
                </Text>
              </View>
              <Text style={[styles.rowAmount, styles.transferAmount]}>
                ↔ {money(Number(item.amount))}
              </Text>
              <Pressable
                accessibilityLabel="Eliminar transferencia"
                hitSlop={8}
                onPress={() => handleDeleteTransfer(item.id)}
              >
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  section: { color: '#C9B6E8', fontSize: 14, fontWeight: '800' },
  periods: { flexDirection: 'row', gap: 4, backgroundColor: '#1B1F2C', borderRadius: 9, padding: 3 },
  period: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6 },
  periodActive: { backgroundColor: '#363B4F' },
  periodText: { color: '#D7D9E0', fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#181B25', borderRadius: 14, padding: 14 },
  rowInfo: { flex: 1 },
  rowName: { color: '#F2F3F6', fontWeight: '600', fontSize: 15 },
  rowMeta: { color: '#858B9B', fontSize: 12, marginTop: 4 },
  rowAmount: { fontWeight: '800', fontSize: 14 },
  income: { color: '#74D8A1' },
  expense: { color: '#F09AA9' },
  transferAmount: { color: '#B89BE3' },
  edit: { color: '#A78BFA', fontSize: 16, paddingHorizontal: 4 },
  remove: { color: '#E895A4', fontSize: 22, paddingHorizontal: 4 },
  empty: { color: '#858B9B', textAlign: 'center', paddingVertical: 18 },
});

const lightStyles = StyleSheet.create({
  section: { color: light.accent },
  periods: { backgroundColor: light.surfaceMuted },
  periodActive: { backgroundColor: '#E2DCD2' },
  periodText: { color: light.muted },
  periodTextActive: { color: light.text, fontWeight: '700' },
  row: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border },
  rowName: { color: light.text },
  rowMeta: { color: light.muted },
  empty: { color: light.muted },
});
