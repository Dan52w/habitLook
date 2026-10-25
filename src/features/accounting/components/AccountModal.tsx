import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import {
  Account,
  createAccount,
  deleteAccount,
  updateAccount,
} from '../../../db/repositories/accounts';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  visible: boolean;
  editingAccount?: Account | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function AccountModal({
  visible,
  editingAccount,
  onClose,
  onSaved,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('bank');

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
    } else {
      setName('');
      setType('bank');
    }
  }, [editingAccount, visible]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(
        'Nombre requerido',
        'Por favor ingresa un nombre para la cuenta o banco.',
      );
      return;
    }
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, name.trim(), type);
      } else {
        await createAccount(name.trim(), type);
      }
      setName('');
      await onSaved();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la cuenta.',
      );
    }
  };

  const remove = () => {
    if (!editingAccount) return;
    Alert.alert(
      'Eliminar cuenta',
      `¿Deseas eliminar la cuenta “${editingAccount.name}”? Si tiene movimientos asociados, se archivará automáticamente para conservar el historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar o archivar',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAccount(editingAccount.id);
              if (!result.deleted && result.reason === 'archived') {
                Alert.alert(
                  'Cuenta archivada',
                  'La cuenta tenía movimientos registrados, por lo que fue archivada para mantener la integridad de los saldos.',
                );
              }
              await onSaved();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'No se pudo eliminar la cuenta.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <AppModal
      visible={visible}
      title={
        editingAccount
          ? editingAccount.type === 'bank'
            ? 'Editar banco'
            : 'Editar cuenta'
          : 'Agregar banco o cuenta'
      }
      onClose={onClose}
    >
      <Text style={[styles.modalHelp, { color: theme.colors.muted }]}>
        {editingAccount
          ? 'Modifica el nombre o tipo de tu cuenta o banco.'
          : 'Crea un banco, efectivo u otra cuenta para registrar movimientos y transferencias.'}
      </Text>

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Tipo de cuenta
      </Text>
      <View style={styles.chips}>
        {(['bank', 'cash', 'other'] as const).map(value => {
          const isActive = type === value;
          return (
            <Pressable
              key={value}
              onPress={() => setType(value)}
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
                {value === 'bank'
                  ? 'Banco'
                  : value === 'cash'
                  ? 'Efectivo'
                  : 'Otra'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
        Nombre
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={type === 'cash' ? 'Ej. Billetera' : 'Ej. Bancolombia'}
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.input,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        autoFocus={visible}
      />

      <Pressable
        onPress={save}
        style={[styles.submit, { backgroundColor: theme.colors.text }]}
      >
        <Text
          style={[
            styles.submitText,
            { color: theme.isLight ? '#FFFFFF' : '#0E0E0F' },
          ]}
        >
          {editingAccount ? 'Guardar cambios' : 'Guardar cuenta'}
        </Text>
      </Pressable>

      {editingAccount && (
        <Pressable onPress={remove} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Eliminar o archivar cuenta</Text>
        </Pressable>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalHelp: { lineHeight: 19, marginBottom: 4, fontSize: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginTop: 4,
    marginBottom: 8,
    fontSize: 15,
  },
  submit: {
    borderRadius: 13,
    alignItems: 'center',
    padding: 14,
    marginTop: 6,
  },
  submitText: { fontWeight: '800', fontSize: 15 },
  deleteButton: { alignItems: 'center', padding: 12, marginTop: 4 },
  deleteText: { color: '#E85D75', fontWeight: '700', fontSize: 13 },
});
