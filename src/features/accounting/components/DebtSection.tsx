import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DebtTotals,
  DebtWithProgress,
  getDebtTotals,
  listDebts,
} from '../../../db/repositories/debts';
import { money } from '../utils/currency';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { DebtModal } from './DebtModal';
import { DebtDetailModal } from './DebtDetailModal';

export function DebtSection() {
  const theme = useTheme();
  const c = theme.colors;
  const [debts, setDebts] = useState<DebtWithProgress[]>([]);
  const [totals, setTotals] = useState<DebtTotals>({
    oweTotal: 0,
    oweRemaining: 0,
    owedTotal: 0,
    owedRemaining: 0,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<DebtWithProgress | null>(null);

  const load = useCallback(async () => {
    try {
      const [items, sums] = await Promise.all([listDebts(), getDebtTotals()]);
      setDebts(items);
      setTotals(sums);
      return items;
    } catch (error) {
      console.warn('No se pudieron cargar las deudas:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDebtChanged = useCallback(async () => {
    const items = await load();
    // Mantiene el detalle abierto con los datos frescos.
    if (items) {
      setSelected(current =>
        current ? (items.find(d => d.id === current.id) ?? null) : null,
      );
    }
  }, [load]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.accentLight }]}>Deudas</Text>
        <Pressable onPress={() => setCreateOpen(true)}>
          <Text style={[styles.add, { color: c.accent }]}>+ Nueva</Text>
        </Pressable>
      </View>

      <Text style={[styles.explain, { color: c.muted }]}>
        Lo que debes y lo que te deben, aparte de tus gastos: una deuda no es
        un ingreso ni un egreso.
      </Text>

      <View style={styles.tiles}>
        <View style={[styles.tile, { backgroundColor: c.card }]}>
          <Text style={[styles.tileLabel, { color: c.muted }]}>Debes</Text>
          <Text style={[styles.tileValue, { color: c.text }]}>
            {money(totals.oweRemaining)}
          </Text>
          <Text style={[styles.tileSub, { color: c.muted }]}>
            de {money(totals.oweTotal)}
          </Text>
        </View>
        <View style={[styles.tile, { backgroundColor: c.card }]}>
          <Text style={[styles.tileLabel, { color: c.muted }]}>Te deben</Text>
          <Text style={[styles.tileValue, { color: c.text }]}>
            {money(totals.owedRemaining)}
          </Text>
          <Text style={[styles.tileSub, { color: c.muted }]}>
            de {money(totals.owedTotal)}
          </Text>
        </View>
      </View>

      {debts.length === 0 ? (
        <Text style={[styles.empty, { color: c.muted }]}>
          Sin deudas registradas. Cuando le debas a alguien (o te deban),
          regístralo aquí para no perderle la pista.
        </Text>
      ) : (
        <View style={styles.list}>
          {debts.map(debt => {
            const ratio = debt.total > 0 ? debt.paid / debt.total : 0;
            return (
              <Pressable
                key={debt.id}
                onPress={() => setSelected(debt)}
                style={[styles.card, { backgroundColor: c.card }]}
              >
                <View style={styles.row}>
                  <Text
                    style={[styles.name, { color: c.text }]}
                    numberOfLines={1}
                  >
                    {debt.direction === 'owe' ? '🔴 ' : '🟢 '}
                    {debt.title}
                  </Text>
                  <Text style={[styles.remaining, { color: c.text }]}>
                    {money(debt.remaining)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text
                    style={[styles.sub, { color: c.muted }]}
                    numberOfLines={1}
                  >
                    {debt.direction === 'owe' ? 'Yo debo' : 'Me deben'}
                    {debt.person ? ` · ${debt.person}` : ''}
                    {debt.status === 'paid'
                      ? ' · ✓ Pagada'
                      : debt.status === 'overdue'
                        ? ' · ⚠️ Vencida'
                        : debt.due_date
                          ? ` · vence ${debt.due_date}`
                          : ''}
                  </Text>
                  <Text style={[styles.sub, { color: c.muted }]}>
                    {money(debt.paid)} de {money(debt.total)}
                  </Text>
                </View>
                <View
                  style={[styles.track, { backgroundColor: c.surfaceMuted }]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.min(100, ratio * 100)}%`,
                        backgroundColor:
                          debt.status === 'paid' ? '#4ADE80' : c.accent,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <DebtModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={async () => {
          await load();
          setCreateOpen(false);
        }}
      />

      <DebtDetailModal
        debt={selected}
        onClose={() => setSelected(null)}
        onChanged={handleDebtChanged}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '800' },
  add: { fontWeight: '700' },
  explain: { fontSize: 12, lineHeight: 17 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 16, padding: 14, gap: 2 },
  tileLabel: { fontSize: 12, fontWeight: '700' },
  tileValue: { fontSize: 19, fontWeight: '800' },
  tileSub: { fontSize: 12 },
  empty: { fontSize: 13, lineHeight: 19 },
  list: { gap: 10 },
  card: { borderRadius: 16, padding: 14, gap: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  name: { fontSize: 14, fontWeight: '600', flex: 1 },
  remaining: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
