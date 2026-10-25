import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { money } from '../utils/currency';

type Props = {
  totals: { income: number; expense: number };
  period: 'week' | 'month';
  periodLabel?: string;
  themed?: { card?: object; text?: object; muted?: object };
};

export function SummaryCard({ totals, period, periodLabel, themed }: Props) {
  const periodText =
    periodLabel ?? (period === 'week' ? 'esta semana' : 'este mes');
  const balance = totals.income - totals.expense;

  return (
    <View style={[styles.summary, themed?.card]}>
      <View>
        <Text style={[styles.summaryLabel, themed?.muted]}>
          Balance · {periodText}
        </Text>
        <Text style={[styles.balance, themed?.text]}>{money(balance)}</Text>
      </View>
      <View style={styles.summaryRight}>
        <Text style={styles.income}>+ {money(totals.income)}</Text>
        <Text style={styles.expense}>− {money(totals.expense)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: '#191919',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: { color: '#A3A3A3', fontSize: 13 },
  balance: { color: '#FAFAFA', fontSize: 28, fontWeight: '700', marginTop: 5 },
  summaryRight: { alignItems: 'flex-end', gap: 5, justifyContent: 'center' },
  income: { color: '#65D6C0', fontWeight: '600' },
  expense: { color: '#F09AA9', fontWeight: '700' },
});
