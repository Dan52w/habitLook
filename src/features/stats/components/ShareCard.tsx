import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WeeklyTimeStat } from '../../../db/repositories/weeklyStats';

export type ShareCardData = {
  weekLabel: string;
  completionPct: number;
  goalsCompleted: number;
  goalsTotal: number;
  totalHours: number;
  bestDay: string | null;
  bestDayCount: number;
  balance: number;
  topCategories: WeeklyTimeStat[];
};

/**
 * Tarjeta visual para compartir la semana como imagen.
 * Tamaño fijo y fondo oscuro propio para que se vea bien al compartir.
 */
export function ShareCard({ data }: { data: ShareCardData }) {
  const top = data.topCategories.slice(0, 3);
  const maxHours = Math.max(1, ...top.map(t => t.hours));
  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <Text style={styles.eyebrow}>HABITLOOK · MI SEMANA</Text>
      <Text style={styles.week}>{data.weekLabel}</Text>

      <View style={styles.hero}>
        <Text style={styles.pct}>{data.completionPct}%</Text>
        <Text style={styles.heroLabel}>
          de mis días de metas{'\n'}cumplidos
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {data.goalsCompleted}/{data.goalsTotal}
          </Text>
          <Text style={styles.statLabel}>metas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {data.totalHours % 1 ? data.totalHours.toFixed(1) : data.totalHours}h
          </Text>
          <Text style={styles.statLabel}>planificadas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {data.bestDay ? `🏆 ${data.bestDay.slice(0, 3)}.` : '—'}
          </Text>
          <Text style={styles.statLabel}>mejor día</Text>
        </View>
      </View>

      {top.length > 0 && (
        <View style={styles.cats}>
          {top.map(t => (
            <View key={t.categoryId} style={styles.catRow}>
              <Text style={styles.catName} numberOfLines={1}>
                {t.emoji ? `${t.emoji} ` : ''}
                {t.categoryName}
              </Text>
              <View style={styles.catTrack}>
                <View
                  style={[
                    styles.catFill,
                    {
                      backgroundColor: t.color,
                      width: `${(t.hours / maxHours) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.catHours}>
                {t.hours % 1 ? t.hours.toFixed(1) : t.hours}h
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.footer}>
        Balance: {data.balance >= 0 ? '+' : '−'}${Math.abs(
          Math.round(data.balance),
        ).toLocaleString('es-CO')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    borderRadius: 24,
    backgroundColor: '#0E0E0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
    gap: 14,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FAFAFA',
    opacity: 0.16,
  },
  eyebrow: {
    color: '#C7C7CC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  week: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'capitalize',
    marginTop: -10,
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pct: { color: '#FAFAFA', fontSize: 52, fontWeight: '800' },
  heroLabel: { color: '#C7C7CC', fontSize: 15, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: '#191919',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { color: '#FAFAFA', fontSize: 17, fontWeight: '800' },
  statLabel: { color: '#A3A3A3', fontSize: 11 },
  cats: { gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catName: { color: '#FAFAFA', fontSize: 13, fontWeight: '600', width: 110 },
  catTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#282828',
    overflow: 'hidden',
  },
  catFill: { height: 8, borderRadius: 4 },
  catHours: { color: '#A3A3A3', fontSize: 12, fontWeight: '700', width: 44, textAlign: 'right' },
  footer: { color: '#A3A3A3', fontSize: 12, fontWeight: '600' },
});
