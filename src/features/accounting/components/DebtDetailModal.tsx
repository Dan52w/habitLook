import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import {
  addDebtPayment,
  DebtPayment,
  DebtWithProgress,
  deleteDebt,
  listDebtPayments,
} from '../../../db/repositories/debts';
import { cop, money } from '../utils/currency';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';
import { dateFromKey } from '../../../shared/utils/date';

type Props = {
  debt: DebtWithProgress | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
};

function formatDue(dateKey: string) {
  return dateFromKey(dateKey).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function DebtDetailModal({ debt, onClose, onChanged }: Props) {
  const theme = useTheme();
  const isLight = theme.isLight;
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (debt) {
      listDebtPayments(debt.id).then(setPayments).catch(() => undefined);
      setAmount('');
      setNote('');
    }
  }, [debt]);

  if (!debt) {
    return null;
  }

  const ratio = debt.total > 0 ? debt.paid / debt.total : 0;
  const directionLabel = debt.direction === 'owe' ? 'Yo debo' : 'Me deben';

  const pay = async () => {
    const value = cop(amount);
    if (value <= 0) {
      Alert.alert('Monto inválido', 'Escribe un abono mayor a cero.');
      return;
    }
    if (value > debt.remaining) {
      Alert.alert(
        'Abono mayor al saldo',
        `Quedan ${money(debt.remaining)} por pagar.`,
      );
      return;
    }
    try {
      await addDebtPayment({
        debtId: debt.id,
        amount: value,
        note: note.trim() || null,
      });
      await onChanged();
      const updated = await listDebtPayments(debt.id);
      setPayments(updated);
      setAmount('');
      setNote('');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo registrar el abono.',
      );
    }
  };

  const remove = () => {
    Alert.alert('Eliminar deuda', `¿Eliminar “${debt.title}” y sus abonos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteDebt(debt.id);
          await onChanged();
          onClose();
        },
      },
    ]);
  };

  return (
    <AppModal
      visible={Boolean(debt)}
      title={debt.title}
      onClose={onClose}
    >
      <Text style={[styles.direction, isLight && lightStyles.muted]}>
        {directionLabel}
        {debt.person ? ` · ${debt.person}` : ''}
        {debt.due_date ? ` · vence ${formatDue(debt.due_date)}` : ''}
      </Text>

      <View style={styles.amounts}>
        <View>
          <Text style={[styles.amountLabel, isLight && lightStyles.muted]}>
            Pagado
          </Text>
          <Text style={[styles.amount, isLight && lightStyles.text]}>
            {money(debt.paid)}
          </Text>
        </View>
        <View style={styles.amountRight}>
          <Text style={[styles.amountLabel, isLight && lightStyles.muted]}>
            Queda
          </Text>
          <Text style={[styles.amount, isLight && lightStyles.text]}>
            {money(debt.remaining)}
          </Text>
        </View>
      </View>

      <View style={[styles.track, isLight && lightStyles.track]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(100, ratio * 100)}%`,
              backgroundColor: debt.status === 'paid' ? '#4ADE80' : '#A78BFA',
            },
          ]}
        />
      </View>
      <Text style={[styles.total, isLight && lightStyles.muted]}>
        Total: {money(debt.total)}
        {debt.status === 'paid' ? ' · ✓ Pagada' : ''}
        {debt.status === 'overdue' ? ' · ⚠️ Vencida' : ''}
      </Text>

      {debt.note ? (
        <Text style={[styles.note, isLight && lightStyles.muted]}>
          {debt.note}
        </Text>
      ) : null}

      {debt.status !== 'paid' && (
        <>
          <Text style={[styles.label, isLight && lightStyles.label]}>
            Registrar abono
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="Monto del abono"
            placeholderTextColor={isLight ? light.muted : '#75798B'}
            style={[styles.input, isLight && lightStyles.input]}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Nota · opcional"
            placeholderTextColor={isLight ? light.muted : '#75798B'}
            style={[styles.input, isLight && lightStyles.input]}
          />
          <Pressable style={styles.save} onPress={pay}>
            <Text style={styles.saveText}>Abonar</Text>
          </Pressable>
          <Text style={[styles.hint, isLight && lightStyles.muted]}>
            El abono solo actualiza esta deuda: no se cuenta como gasto ni
            mueve el saldo de tus cuentas.
          </Text>
        </>
      )}

      {payments.length > 0 && (
        <>
          <Text style={[styles.label, isLight && lightStyles.label]}>
            Abonos
          </Text>
          <View style={styles.payments}>
            {payments.map(p => (
              <View key={p.id} style={styles.paymentRow}>
                <Text style={[styles.paymentDate, isLight && lightStyles.muted]}>
                  {p.date}
                </Text>
                <Text style={[styles.paymentNote, isLight && lightStyles.text]}>
                  {p.note ?? 'Abono'}
                </Text>
                <Text style={[styles.paymentAmount, isLight && lightStyles.text]}>
                  {money(p.amount)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Pressable onPress={remove} style={styles.deleteWrap}>
        <Text style={styles.delete}>Eliminar deuda</Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  direction: { color: '#AEB2C0', fontSize: 13, fontWeight: '600' },
  amounts: { flexDirection: 'row', justifyContent: 'space-between' },
  amountRight: { alignItems: 'flex-end' },
  amountLabel: { color: '#858B9D', fontSize: 12 },
  amount: { color: '#F8F7FB', fontSize: 22, fontWeight: '800' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#232839',
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4 },
  total: { color: '#858B9D', fontSize: 13, fontWeight: '600' },
  note: { color: '#AEB2C0', fontSize: 14, lineHeight: 20 },
  label: {
    color: '#C9B6E8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#202433',
    color: '#F8F7FB',
    paddingHorizontal: 13,
    fontSize: 15,
  },
  save: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#A78BFA',
  },
  saveText: { color: '#171421', fontWeight: '800', fontSize: 15 },
  hint: { color: '#858B9D', fontSize: 12, lineHeight: 17 },
  payments: { gap: 10 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentDate: { color: '#858B9D', fontSize: 12, width: 86 },
  paymentNote: { color: '#EDEEF3', fontSize: 14, flex: 1 },
  paymentAmount: { color: '#F8F7FB', fontSize: 14, fontWeight: '700' },
  deleteWrap: { alignItems: 'center', marginTop: 6 },
  delete: { color: '#E895A4', fontSize: 13, fontWeight: '700' },
});

const lightStyles = StyleSheet.create({
  text: { color: light.text },
  muted: { color: light.muted },
  label: { color: light.accent },
  input: {
    backgroundColor: light.surface,
    color: light.text,
    borderWidth: 1,
    borderColor: light.border,
  },
  track: { backgroundColor: '#E9E2D2' },
});
