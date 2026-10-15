import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Account } from '../../../db/repositories/accounts';
import { money } from '../utils/currency';
import { useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  accounts: Account[];
  balances: Record<string, number>;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  onEditAccount: (account: Account) => void;
  onOpenTransfer: () => void;
};

export function AccountList({
  accounts,
  balances,
  selectedAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onOpenTransfer,
}: Props) {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.sectionHead}>
        <Text style={[styles.section, { color: theme.colors.accentLight }]}>
          Tus cuentas
        </Text>
        <View style={styles.headActions}>
          {accounts.length > 1 && (
            <Pressable onPress={onOpenTransfer}>
              <Text style={[styles.link, { color: theme.colors.accent }]}>
                Transferir / retirar
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {accounts.length === 0 ? (
        <View style={[styles.emptyCard, { borderColor: theme.colors.border }]}>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Empieza por añadir un banco
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
            Registra el nombre de tu banco o billetera para usarlo en los
            movimientos.
          </Text>
          <Pressable
            onPress={onAddAccount}
            style={[
              styles.emptyAction,
              { backgroundColor: theme.colors.accent },
            ]}
          >
            <Text
              style={[
                styles.emptyActionText,
                { color: theme.isLight ? '#FFFDF8' : '#171421' },
              ]}
            >
              + Banco
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accounts}
        >
          {accounts.map(item => {
            const isSelected = selectedAccountId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelectAccount(item.id)}
                onLongPress={() => onEditAccount(item)}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: isSelected
                      ? theme.colors.accent
                      : theme.colors.border,
                  },
                  isSelected && styles.accountActive,
                ]}
              >
                <View style={styles.accountTop}>
                  <Text
                    style={[styles.accountKind, { color: theme.colors.muted }]}
                  >
                    {item.type === 'bank'
                      ? 'BANCO'
                      : item.type === 'cash'
                      ? 'EFECTIVO'
                      : 'OTRA CUENTA'}
                  </Text>
                  <Pressable
                    accessibilityLabel={`Editar cuenta ${item.name}`}
                    hitSlop={8}
                    onPress={() => onEditAccount(item)}
                  >
                    <Text
                      style={[
                        styles.accountEdit,
                        { color: theme.colors.accent },
                      ]}
                    >
                      ✎
                    </Text>
                  </Pressable>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.accountName, { color: theme.colors.text }]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.accountBalance,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {money(balances[item.id] ?? 0)}
                </Text>
                <Text
                  style={[styles.accountHint, { color: theme.colors.muted }]}
                >
                  Toca para seleccionar · ✎ editar
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  section: { fontSize: 14, fontWeight: '800' },
  headActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  link: { fontWeight: '700', fontSize: 12 },
  accounts: { gap: 9 },
  accountCard: {
    width: 156,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    gap: 5,
  },
  accountActive: { borderWidth: 1.5 },
  accountTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountKind: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  accountEdit: { fontSize: 14, fontWeight: '700', paddingHorizontal: 2 },
  accountName: { fontWeight: '700', fontSize: 14 },
  accountBalance: { fontWeight: '800', fontSize: 14 },
  accountHint: { fontSize: 9 },
  emptyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 7,
  },
  emptyTitle: { fontWeight: '700' },
  emptyText: { fontSize: 13, lineHeight: 18 },
  emptyAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
    marginTop: 3,
  },
  emptyActionText: { fontWeight: '800', fontSize: 12 },
});
