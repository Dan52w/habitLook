import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppModal } from '../../../shared/components/AppModal';
import { Account } from '../../../db/repositories/accounts';
import { ExpenseCategory } from '../../../db/repositories/expenseCategories';
import {
  deleteExpense,
  updateExpense,
} from '../../../db/repositories/expenses';
import { ExpenseRow } from '../hooks/useAccounting';
import { cop } from '../utils/currency';
import { localDateKey } from '../../../shared/utils/date';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  visible: boolean;
  expense: ExpenseRow | null;
  accounts: Account[];
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function EditExpenseModal({
  visible,
  expense,
  accounts,
  categories,
  onClose,
  onSaved,
}: Props) {
  const theme = useTheme();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setNote(expense.note || '');
      setAccountId(expense.account_id || accounts[0]?.id || '');
      setCategoryId(expense.category_id || '');
      setDate(expense.date);
    }
  }, [expense, accounts]);

  const save = async () => {
    if (!expense) return;
    const value = cop(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Revisa el monto', 'Ingresa un monto válido.');
      return;
    }
    if (!accountId) {
      Alert.alert(
        'Elige una cuenta',
        'Debes seleccionar una cuenta para el movimiento.',
      );
      return;
    }

    try {
      await updateExpense({
        id: expense.id,
        amount: value,
        type: expense.type,
        accountId,
        categoryId: categoryId || undefined,
        note,
        date,
      });
      await onSaved();
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error
          ? error.message
          : 'Revisa los datos e inténtalo de nuevo.',
      );
    }
  };

  const remove = () => {
    if (!expense) return;
    Alert.alert(
      'Eliminar movimiento',
      'Esta acción eliminará el movimiento y ajustará el saldo de la cuenta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(expense.id);
            await onSaved();
          },
        },
      ],
    );
  };

  return (
    <AppModal visible={visible} title="Editar movimiento" onClose={onClose}>
      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Monto
      </Text>
      <TextInput
        style={[
          styles.amount,
          {
            backgroundColor: theme.colors.input,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder="$ 0"
        placeholderTextColor={theme.colors.muted}
      />

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Descripción
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.input,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        value={note}
        onChangeText={setNote}
        placeholder="¿En qué fue?"
        placeholderTextColor={theme.colors.muted}
      />

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Fecha
      </Text>
      <Pressable
        onPress={() => setDatePickerOpen(true)}
        style={[
          styles.dateSelector,
          {
            backgroundColor: theme.colors.input,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.dateText, { color: theme.colors.text }]}>
          {date || 'Seleccionar fecha'}
        </Text>
      </Pressable>
      {datePickerOpen && (
        <DateTimePicker
          value={date ? new Date(`${date}T12:00:00`) : new Date()}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, val) => {
            setDatePickerOpen(false);
            if (val) setDate(localDateKey(val));
          }}
        />
      )}

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Cuenta
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {accounts.map(acc => {
          const isActive = accountId === acc.id;
          return (
            <Pressable
              key={acc.id}
              onPress={() => setAccountId(acc.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? theme.colors.chipActive
                    : theme.colors.chip,
                  borderColor: isActive ? theme.colors.accent : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isActive
                      ? theme.isLight
                        ? '#22201C'
                        : '#F8F7FB'
                      : theme.colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {acc.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Categoría
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Pressable
          onPress={() => setCategoryId('')}
          style={[
            styles.chip,
            {
              backgroundColor: !categoryId
                ? theme.colors.chipActive
                : theme.colors.chip,
              borderColor: !categoryId ? theme.colors.accent : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              {
                color: !categoryId
                  ? theme.isLight
                    ? '#22201C'
                    : '#F8F7FB'
                  : theme.colors.textSecondary,
                fontWeight: !categoryId ? '700' : '500',
              },
            ]}
          >
            Sin categoría
          </Text>
        </Pressable>
        {categories.map(cat => {
          const isActive = categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategoryId(cat.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? theme.colors.chipActive
                    : theme.colors.chip,
                  borderColor: isActive ? theme.colors.accent : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isActive
                      ? theme.isLight
                        ? '#22201C'
                        : '#F8F7FB'
                      : theme.colors.textSecondary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={save}
        style={[styles.submit, { backgroundColor: theme.colors.accent }]}
      >
        <Text
          style={[
            styles.submitText,
            { color: theme.isLight ? '#FFFDF8' : '#171421' },
          ]}
        >
          Guardar cambios
        </Text>
      </Pressable>

      <Pressable onPress={remove} style={styles.deleteButton}>
        <Text style={styles.deleteText}>Eliminar movimiento</Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  amount: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 23,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginTop: 4,
    fontSize: 15,
  },
  dateSelector: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    justifyContent: 'center',
    marginTop: 4,
  },
  dateText: { fontSize: 14 },
  chips: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },
  submit: {
    borderRadius: 13,
    alignItems: 'center',
    padding: 14,
    marginTop: 12,
  },
  submitText: { fontWeight: '800', fontSize: 15 },
  deleteButton: { alignItems: 'center', padding: 12, marginTop: 4 },
  deleteText: { color: '#E85D75', fontWeight: '700', fontSize: 13 },
});
