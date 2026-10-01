import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { money } from '../utils/currency';

type Props = {
  totals: { income: number; expense: number };
  period: 'week' | 'month';
  themed?: { card?: object; text?: object; muted?: object };
};

export function SummaryCard({ totals, period, themed }: Props) {
  const periodLabel = period === 'week' ? 'esta semana' : 'este mes';
  const balance = totals.income - totals.expense;

  return (
    <View style={[styles.summary, themed?.card]}>
      <View>
        <Text style={[styles.summaryLabel, themed?.muted]}>Balance {periodLabel}</Text>
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
    backgroundColor: '#1B1F2C',
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: { color: '#9EA4B6', fontSize: 13 },
  balance: { color: '#F8F7FB', fontSize: 23, fontWeight: '800', marginTop: 4 },
  summaryRight: { alignItems: 'flex-end', gap: 5, justifyContent: 'center' },
  income: { color: '#74D8A1', fontWeight: '700' },
  expense: { color: '#F09AA9', fontWeight: '700' },
});
