import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { Account } from '../../../db/repositories/accounts';
import { createTransfer } from '../../../db/repositories/transfers';
import { localDateKey } from '../../../shared/utils/date';
import { cop } from '../utils/currency';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const today = () => localDateKey();

export function TransferModal({ visible, accounts, onClose, onSaved }: Props) {
  const theme = useTheme();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setFrom(accounts[0]?.id ?? '');
      setTo(accounts[1]?.id ?? '');
    }
  }, [visible, accounts]);

  const save = async () => {
    const value = cop(amount);
    if (!from || !to || from === to || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Revisa la transferencia', 'Elige dos cuentas distintas y un monto válido.');
      return;
    }

    try {
      await createTransfer({
        fromAccountId: from,
        toAccountId: to,
        amount: value,
        note,
        date: today(),
      });
      setAmount('');
      setNote('');
      await onSaved();
    } catch (error) {
      Alert.alert(
        'No se pudo transferir',
        error instanceof Error ? error.message : 'Revisa el saldo disponible.'
      );
    }
  };

  return (
    <AppModal visible={visible} title="Transferir o retirar" onClose={onClose}>
      <Text style={[styles.modalHelp, { color: theme.colors.muted }]}>
        Para retirar efectivo, elige tu banco como origen y Efectivo como destino. No se contabiliza como gasto.
      </Text>

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>Desde</Text>
      <View style={styles.chips}>
        {accounts.map(item => {
          const isActive = from === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setFrom(item.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.colors.chipActive : theme.colors.chip,
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
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>Hacia</Text>
      <View style={styles.chips}>
        {accounts.map(item => {
          const isActive = to === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTo(item.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? theme.colors.chipActive : theme.colors.chip,
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
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder="$ monto"
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.amount,
          {
            backgroundColor: theme.colors.input,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
      />

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Nota (opcional)"
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.input,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
      />

      <Pressable
        onPress={save}
        style={[styles.submit, { backgroundColor: theme.colors.accent }]}
      >
        <Text style={[styles.submitText, { color: theme.isLight ? '#FFFDF8' : '#171421' }]}>
          Guardar transferencia
        </Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalHelp: { lineHeight: 19, marginBottom: 2, fontSize: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  chip: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1 },
  chipText: { fontSize: 13 },
  amount: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 23,
    fontWeight: '700',
    marginVertical: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginBottom: 6,
    fontSize: 15,
  },
  submit: {
    borderRadius: 13,
    alignItems: 'center',
    padding: 14,
    marginTop: 6,
  },
  submitText: { fontWeight: '800', fontSize: 15 },
});
