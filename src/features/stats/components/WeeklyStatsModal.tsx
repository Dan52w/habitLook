import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { AppModal } from '../../../shared/components/AppModal';
import { EmptyState } from '../../../shared/components/EmptyState';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';
import { useWeeklyStats } from '../hooks/useWeeklyStats';
import { WeeklyGoalStat } from '../../../db/repositories/weeklyStats';
import { ShareCard } from './ShareCard';

type Props = { visible: boolean; onClose: () => void };

const formatMoney = (value: number) =>
  `$${Math.abs(Math.round(value)).toLocaleString('es-CO')}`;

function Bar({ ratio, color }: { ratio: number; color: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.barTrack,
        theme.isLight ? lightStyles.barTrack : undefined,
      ]}
    >
      <View
        style={[
          styles.barFill,
          { backgroundColor: color, width: `${Math.min(100, ratio * 100)}%` },
        ]}
      />
    </View>
  );
}

function Tile({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  const theme = useTheme();
  const isLight = theme.isLight;
  return (
    <View style={[styles.tile, isLight && lightStyles.tile]}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={[styles.tileValue, isLight && lightStyles.tileValue]}>
        {value}
      </Text>
      <Text style={[styles.tileLabel, isLight && lightStyles.tileLabel]}>
        {label}
      </Text>
    </View>
  );
}

function GoalRow({ goal }: { goal: WeeklyGoalStat }) {
  const theme = useTheme();
  const isLight = theme.isLight;
  const isWeekly = goal.period === 'weekly';
  const isOnce = goal.period === 'daily' && goal.target_date;
  const ratio = isWeekly
    ? goal.target_value > 0
      ? goal.totalValue / goal.target_value
      : 0
    : goal.daysCompleted / (isOnce ? 1 : 7);
  const unit = goal.target_type === 'duration' ? 'min' : 'veces';
  const detail = isWeekly
    ? goal.weekCompleted
      ? '✓ Cumplida'
      : `${Math.round(goal.totalValue)} de ${goal.target_value} ${unit}`
    : isOnce
      ? goal.daysCompleted > 0
        ? '✓ Cumplida'
        : 'Pendiente'
      : `${goal.daysCompleted}/7 días`;
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text
          style={[styles.rowTitle, isLight && lightStyles.text]}
          numberOfLines={1}
        >
          {goal.title}
        </Text>
        <Text style={[styles.rowDetail, isLight && lightStyles.muted]}>
          {detail}
        </Text>
      </View>
      <Bar ratio={ratio} color={goal.weekCompleted ? '#65D6C0' : '#FAFAFA'} />
    </View>
  );
}

export function WeeklyStatsModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const isLight = theme.isLight;
  const [weekOffset, setWeekOffset] = useState(0);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const stats = useWeeklyStats(weekOffset);

  useEffect(() => {
    if (visible) setWeekOffset(0);
  }, [visible]);

  const balancePositive = stats.expenses.balance >= 0;

  const shareWeek = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 0.9,
      });
      await Share.open({
        url: uri,
        type: 'image/png',
        message: `Mi semana en HabitLook 📊 ${stats.label}`,
        failOnCancel: false,
      });
    } catch (error) {
      console.warn('No se pudo compartir:', error);
      Alert.alert(
        'No se pudo compartir',
        'Inténtalo de nuevo en un momento.',
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      title="Estadísticas semanales"
      onClose={onClose}
    >
      <View style={styles.weekNav}>
        <Pressable
          style={[styles.navButton, isLight && lightStyles.navButton]}
          onPress={() => setWeekOffset(o => o - 1)}
        >
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={[styles.weekLabel, isLight && lightStyles.text]}>
          {stats.label}
        </Text>
        <Pressable
          style={[styles.navButton, isLight && lightStyles.navButton]}
          onPress={() => setWeekOffset(o => (o < 0 ? o + 1 : o))}
          disabled={weekOffset >= 0}
        >
          <Text
            style={[
              styles.navArrow,
              weekOffset >= 0 && styles.navArrowDisabled,
            ]}
          >
            ›
          </Text>
        </Pressable>
      </View>

      {stats.loading ? (
        <Text style={[styles.loading, isLight && lightStyles.muted]}>
          Calculando tu semana…
        </Text>
      ) : stats.goalsTotal === 0 && stats.timeStats.length === 0 ? (
        <EmptyState
          icon="📊"
          title="Sin datos esta semana"
          message="Cuando uses la app (metas, plan del día, gastos) verás aquí tu resumen semanal."
        />
      ) : (
        <>
          <View style={[styles.hero, isLight && lightStyles.hero]}>
            <Text style={styles.heroPct}>{stats.completionPct}%</Text>
            <View style={styles.heroBody}>
              <Text style={[styles.heroTitle, isLight && lightStyles.text]}>
                de tus días de metas{'\n'}cumplidos
              </Text>
              <Bar ratio={stats.completionPct / 100} color="#FAFAFA" />
            </View>
          </View>

          <View style={styles.tiles}>
            <Tile
              icon="⏱️"
              value={`${stats.totalHours % 1 ? stats.totalHours.toFixed(1) : stats.totalHours} h`}
              label="planificadas"
            />
            <Tile
              icon="💰"
              value={`${balancePositive ? '+' : '−'}${formatMoney(
                stats.expenses.balance,
              )}`}
              label="balance"
            />
            <Tile
              icon="📝"
              value={String(stats.notesCount)}
              label={stats.notesCount === 1 ? 'nota' : 'notas'}
            />
            <Tile
              icon="🏆"
              value={stats.bestDay ?? '—'}
              label={
                stats.bestDay
                  ? `${stats.bestDayCount} metas cumplidas`
                  : 'mejor día'
              }
            />
          </View>

          {stats.goalStats.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, isLight && lightStyles.text]}>
                Metas de la semana
              </Text>
              <View style={styles.rows}>
                {stats.goalStats.map(goal => (
                  <GoalRow key={goal.goalId} goal={goal} />
                ))}
              </View>
            </View>
          )}

          {stats.timeStats.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, isLight && lightStyles.text]}>
                Tiempo por categoría
              </Text>
              <View style={styles.rows}>
                {stats.timeStats.map(t => (
                  <View key={t.categoryId} style={styles.row}>
                    <View style={styles.rowHeader}>
                      <Text
                        style={[styles.rowTitle, isLight && lightStyles.text]}
                        numberOfLines={1}
                      >
                        {t.emoji ? `${t.emoji} ` : ''}
                        {t.categoryName}
                      </Text>
                      <Text
                        style={[styles.rowDetail, isLight && lightStyles.muted]}
                      >
                        {t.hours % 1 ? t.hours.toFixed(1) : t.hours} h
                      </Text>
                    </View>
                    <Bar
                      ratio={
                        stats.totalHours > 0 ? t.hours / stats.totalHours : 0
                      }
                      color={t.color}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View>
            <Text style={[styles.sectionTitle, isLight && lightStyles.text]}>
              Para compartir
            </Text>
            <View style={styles.previewWrap} collapsable={false} ref={cardRef}>
              <ShareCard
                data={{
                  weekLabel: stats.label,
                  completionPct: stats.completionPct,
                  goalsCompleted: stats.goalsCompleted,
                  goalsTotal: stats.goalsTotal,
                  totalHours: stats.totalHours,
                  bestDay: stats.bestDay,
                  bestDayCount: stats.bestDayCount,
                  balance: stats.expenses.balance,
                  topCategories: stats.timeStats,
                }}
              />
            </View>
            <Pressable
              style={[
                styles.shareButton,
                isLight && lightStyles.shareButton,
                sharing && styles.shareDisabled,
              ]}
              onPress={shareWeek}
              disabled={sharing}
            >
              <Text style={[styles.shareText, isLight && lightStyles.shareText]}>
                {sharing ? 'Preparando imagen…' : '📤 Compartir mi semana'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { color: '#FAFAFA', fontSize: 26, fontWeight: '700' },
  navArrowDisabled: { color: '#555555' },
  weekLabel: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  loading: { color: '#A3A3A3', textAlign: 'center', marginVertical: 30 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#191919',
    borderRadius: 18,
    padding: 18,
  },
  heroPct: { color: '#FAFAFA', fontSize: 40, fontWeight: '800' },
  heroBody: { flex: 1, gap: 8 },
  heroTitle: { color: '#C7C7CC', fontSize: 14, lineHeight: 19 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#191919',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  tileIcon: { fontSize: 20 },
  tileValue: { color: '#FAFAFA', fontSize: 19, fontWeight: '800' },
  tileLabel: { color: '#A3A3A3', fontSize: 12 },
  sectionTitle: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  rows: { gap: 12 },
  row: { gap: 6 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  rowTitle: { color: '#FAFAFA', fontSize: 14, fontWeight: '600', flex: 1 },
  rowDetail: { color: '#A3A3A3', fontSize: 12, fontWeight: '700' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#282828',
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  previewWrap: { alignItems: 'center' },
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 13,
    padding: 15,
    marginTop: 10,
  },
  shareDisabled: { opacity: 0.6 },
  shareText: { color: '#0E0E0F', fontWeight: '800', fontSize: 15 },
});

const lightStyles = StyleSheet.create({
  text: { color: light.text },
  muted: { color: light.muted },
  hero: { backgroundColor: light.surface },
  tile: { backgroundColor: light.surface },
  tileValue: { color: light.text },
  tileLabel: { color: light.muted },
  barTrack: { backgroundColor: light.surfaceMuted },
  navButton: { backgroundColor: light.surfaceMuted },
  shareButton: { backgroundColor: light.text },
  shareText: { color: '#FFFFFF' },
});
