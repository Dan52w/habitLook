import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Account } from '../../../db/repositories/accounts';
import { ExpenseCategory } from '../../../db/repositories/expenseCategories';
import {
  createExpense,
  createSplitExpense,
} from '../../../db/repositories/expenses';
import { localDateKey } from '../../../shared/utils/date';
import { cop, money } from '../utils/currency';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type Payment = { accountId: string; amount: string };

type Props = {
  accounts: Account[];
  categories: ExpenseCategory[];
  balances: Record<string, number>;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  onMovementCreated: () => Promise<void>;
  onAddCategory: (name: string) => Promise<string>;
};

const today = () => localDateKey();

export function MovementForm({
  accounts,
  categories,
  balances,
  selectedAccountId,
  onSelectAccount,
  onMovementCreated,
  onAddCategory,
}: Props) {
  const theme = useTheme();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(categories[0]?.id ?? '');
  const [movementDate, setMovementDate] = useState(today());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [split, setSplit] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Las categorías cargan de forma asíncrona: sincroniza la selección por defecto.
  useEffect(() => {
    if (!category && categories[0]) setCategory(categories[0].id);
  }, [categories, category]);

  const total = cop(amount);

  const updatePayment = (index: number, patch: Partial<Payment>) => {
    setPayments(items =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const newId = await onAddCategory(newCatName.trim());
    setNewCatName('');
    setCategory(newId);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!Number.isFinite(total) || total <= 0) {
        Alert.alert('Revisa el monto', 'Ingresa un monto mayor que cero.');
        return;
      }

      if (type === 'expense' && split) {
        const validPayments = payments
          .map(payment => ({
            accountId: payment.accountId,
            amount: cop(payment.amount),
          }))
          .filter(
            payment =>
              payment.accountId &&
              Number.isFinite(payment.amount) &&
              payment.amount > 0,
          );

        if (
          validPayments.reduce((sum, payment) => sum + payment.amount, 0) !==
          total
        ) {
          Alert.alert(
            'El pago no cuadra',
            'Las partes deben sumar exactamente el total del gasto.',
          );
          return;
        }

        const assigned = validPayments.reduce<Record<string, number>>(
          (res, p) => ({
            ...res,
            [p.accountId]: (res[p.accountId] ?? 0) + p.amount,
          }),
          {},
        );
        const insufficient = Object.entries(assigned).find(
          ([accId, pAmt]) => pAmt > (balances[accId] ?? 0),
        );
        if (insufficient) {
          Alert.alert(
            'Saldo insuficiente',
            'Una de las cuentas no tiene suficiente saldo para la parte asignada.',
          );
          return;
        }

        await createSplitExpense({
          amount: total,
          categoryId: category || undefined,
          note,
          date: movementDate,
          payments: validPayments,
        });
      } else {
        if (!selectedAccountId) {
          Alert.alert(
            'Añade una cuenta',
            'Primero agrega un banco, efectivo u otra cuenta para registrar el movimiento.',
          );
          return;
        }

        if (type === 'expense' && total > (balances[selectedAccountId] ?? 0)) {
          Alert.alert(
            'Saldo insuficiente',
            'No puedes gastar más de lo disponible en esta cuenta.',
          );
          return;
        }

        await createExpense({
          amount: total,
          type,
          accountId: selectedAccountId,
          categoryId: category || undefined,
          note,
          date: movementDate,
        });
      }

      setAmount('');
      setNote('');
      setSplit(false);
      setPayments(
        selectedAccountId ? [{ accountId: selectedAccountId, amount: '' }] : [],
      );
      await onMovementCreated();
    } catch (error) {
      Alert.alert(
        'No se pudo guardar',
        error instanceof Error
          ? error.message
          : 'Revisa los datos e inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const paymentDifference =
    total - payments.reduce((sum, p) => sum + (cop(p.amount) || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={[styles.section, { color: theme.colors.accentLight }]}>
        Registrar movimiento
      </Text>
      <View style={styles.typeRow}>
        {(['expense', 'income'] as const).map(val => {
          const isSelected = type === val;
          return (
            <Pressable
              key={val}
              onPress={() => {
                setType(val);
                if (val === 'income') setSplit(false);
              }}
              style={[
                styles.type,
                {
                  backgroundColor: isSelected
                    ? val === 'expense'
                      ? theme.isLight
                        ? '#FCEBED'
                        : '#351C24'
                      : theme.isLight
                      ? '#EBF9F1'
                      : '#1A3326'
                    : theme.colors.chip,
                  borderColor: isSelected
                    ? val === 'expense'
                      ? '#E85D75'
                      : '#64D9A0'
                    : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  {
                    color: isSelected
                      ? val === 'expense'
                        ? '#E85D75'
                        : '#2E9F68'
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {val === 'expense' ? 'Gasto' : 'Ingreso'}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
        placeholder="¿En qué fue? (opcional)"
        placeholderTextColor={theme.colors.muted}
      />

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Fecha
      </Text>
      <View style={styles.dateChoices}>
        <Pressable
          onPress={() => setMovementDate(today())}
          style={[
            styles.dateChoice,
            {
              backgroundColor:
                movementDate === today()
                  ? theme.colors.chipActive
                  : theme.colors.chip,
              borderColor:
                movementDate === today() ? theme.colors.accent : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              {
                color:
                  movementDate === today()
                    ? theme.isLight
                      ? '#22201C'
                      : '#F8F7FB'
                    : theme.colors.textSecondary,
                fontWeight: movementDate === today() ? '700' : '500',
              },
            ]}
          >
            Hoy
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            setMovementDate(localDateKey(yesterday));
          }}
          style={[
            styles.dateChoice,
            {
              backgroundColor:
                movementDate !== today()
                  ? theme.colors.chipActive
                  : theme.colors.chip,
              borderColor:
                movementDate !== today() ? theme.colors.accent : 'transparent',
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              {
                color:
                  movementDate !== today()
                    ? theme.isLight
                      ? '#22201C'
                      : '#F8F7FB'
                    : theme.colors.textSecondary,
                fontWeight: movementDate !== today() ? '700' : '500',
              },
            ]}
          >
            Ayer
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDatePickerOpen(true)}
          style={[
            styles.dateChoice,
            { backgroundColor: theme.colors.chip, borderColor: 'transparent' },
          ]}
        >
          <Text
            style={[styles.chipText, { color: theme.colors.textSecondary }]}
          >
            {movementDate}
          </Text>
        </Pressable>
      </View>

      {datePickerOpen && (
        <DateTimePicker
          value={new Date(`${movementDate}T12:00:00`)}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, value) => {
            setDatePickerOpen(false);
            if (value) setMovementDate(localDateKey(value));
          }}
        />
      )}

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Categoría
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {categories.map(item => {
          const isSelected = category === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.colors.chipActive
                    : theme.colors.chip,
                  borderColor: isSelected ? theme.colors.accent : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected
                      ? theme.isLight
                        ? '#22201C'
                        : '#F8F7FB'
                      : theme.colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.inlineCategory}>
        <TextInput
          value={newCatName}
          onChangeText={setNewCatName}
          placeholder="Nueva categoría"
          placeholderTextColor={theme.colors.muted}
          style={[
            styles.categoryInput,
            {
              backgroundColor: theme.colors.input,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
        />
        <Pressable
          onPress={handleAddCategory}
          style={[
            styles.smallButton,
            { backgroundColor: theme.isLight ? '#DDD4C4' : '#33384B' },
          ]}
        >
          <Text style={[styles.smallButtonText, { color: theme.colors.text }]}>
            Añadir
          </Text>
        </Pressable>
      </View>

      {type === 'expense' && accounts.length > 1 && (
        <Pressable
          onPress={() => {
            const next = !split;
            setSplit(next);
            if (next) {
              setPayments([
                {
                  accountId: selectedAccountId || accounts[0]?.id || '',
                  amount: '',
                },
                {
                  accountId:
                    accounts.find(item => item.id !== selectedAccountId)?.id ||
                    '',
                  amount: '',
                },
              ]);
            }
          }}
          style={[
            styles.splitToggle,
            {
              backgroundColor: theme.isLight
                ? theme.colors.surfaceMuted
                : '#1A1E2A',
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View>
            <Text style={[styles.splitTitle, { color: theme.colors.text }]}>
              Pago combinado
            </Text>
            <Text style={[styles.splitText, { color: theme.colors.muted }]}>
              Usar dos o más cuentas para este gasto.
            </Text>
          </View>
          <Text style={[styles.toggleMark, { color: theme.colors.accent }]}>
            {split ? '✓' : '+'}
          </Text>
        </Pressable>
      )}

      {split ? (
        <View
          style={[
            styles.splitBox,
            {
              backgroundColor: theme.isLight ? theme.colors.surface : '#181B25',
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
            ¿De dónde sale el dinero?
          </Text>
          {payments.map((payment, index) => (
            <View
              key={`${index}-${payment.accountId}`}
              style={[styles.payment, { borderColor: theme.colors.border }]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.paymentAccounts}
              >
                {accounts.map(item => {
                  const isActive = payment.accountId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        updatePayment(index, { accountId: item.id })
                      }
                      style={[
                        styles.paymentAccount,
                        {
                          backgroundColor: isActive
                            ? theme.colors.chipActive
                            : theme.colors.chip,
                          borderColor: isActive
                            ? theme.colors.accent
                            : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentAccountText,
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
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <TextInput
                value={payment.amount}
                onChangeText={val => updatePayment(index, { amount: val })}
                keyboardType="number-pad"
                placeholder="$ parte"
                placeholderTextColor={theme.colors.muted}
                style={[
                  styles.paymentAmount,
                  {
                    backgroundColor: theme.colors.input,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
              {payments.length > 2 && (
                <Pressable
                  onPress={() =>
                    setPayments(items =>
                      items.filter((_, idx) => idx !== index),
                    )
                  }
                >
                  <Text style={styles.remove}>×</Text>
                </Pressable>
              )}
            </View>
          ))}
          <View style={styles.splitFooter}>
            <Pressable
              onPress={() =>
                setPayments(items => [
                  ...items,
                  { accountId: accounts[0]?.id ?? '', amount: '' },
                ])
              }
            >
              <Text style={[styles.link, { color: theme.colors.accent }]}>
                + Otra parte
              </Text>
            </Pressable>
            <Text
              style={[
                styles.splitDifference,
                paymentDifference === 0 && styles.splitOk,
              ]}
            >
              {paymentDifference === 0
                ? 'Total completo'
                : `Faltan ${money(Math.max(0, paymentDifference))}`}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
            Cuenta
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {accounts.map(item => {
              const isSelected = selectedAccountId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectAccount(item.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.chipActive
                        : theme.colors.chip,
                      borderColor: isSelected
                        ? theme.colors.accent
                        : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected
                          ? theme.isLight
                            ? '#22201C'
                            : '#F8F7FB'
                          : theme.colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      <Pressable
        onPress={submit}
        disabled={submitting}
        style={[
          styles.submit,
          {
            backgroundColor: theme.colors.accent,
            opacity: submitting ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.submitText,
            { color: theme.isLight ? '#FFFDF8' : '#171421' },
          ]}
        >
          {submitting ? 'Guardando…' : 'Guardar movimiento'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  section: { fontSize: 14, fontWeight: '800', marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: 8 },
  type: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeText: { fontWeight: '700' },
  amount: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 23,
    fontWeight: '700',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    fontSize: 15,
  },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  dateChoices: { flexDirection: 'row', gap: 8 },
  dateChoice: {
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },
  inlineCategory: { flexDirection: 'row', gap: 8 },
  categoryInput: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  smallButton: {
    justifyContent: 'center',
    borderRadius: 11,
    paddingHorizontal: 14,
  },
  smallButtonText: { fontWeight: '700', fontSize: 12 },
  splitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
  },
  splitTitle: { fontWeight: '700' },
  splitText: { fontSize: 12, marginTop: 3 },
  toggleMark: { fontSize: 20, fontWeight: '800' },
  splitBox: { borderWidth: 1, borderRadius: 15, padding: 12, gap: 10 },
  payment: { gap: 8, borderBottomWidth: 1, paddingBottom: 10 },
  paymentAccounts: { gap: 6 },
  paymentAccount: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  paymentAccountText: { fontSize: 12 },
  paymentAmount: {
    height: 43,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  remove: { color: '#E85D75', fontSize: 23, alignSelf: 'flex-end' },
  splitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: { fontWeight: '700', fontSize: 12 },
  splitDifference: { color: '#E85D75', fontSize: 12, fontWeight: '700' },
  splitOk: { color: '#2E9F68' },
  submit: {
    borderRadius: 13,
    alignItems: 'center',
    padding: 14,
    marginTop: 2,
  },
  submitText: { fontWeight: '800', fontSize: 15 },
});
