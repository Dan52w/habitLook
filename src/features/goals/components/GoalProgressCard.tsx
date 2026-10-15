import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  title: string;
  progressLabel: string;
  progressRatio: number;
  color: string;
  streak?: number;
  onPress?: () => void;
  onUndo?: () => void;
  onDelete?: () => void;
};

export function GoalProgressCard({
  title,
  progressLabel,
  progressRatio,
  color,
  streak = 0,
  onPress,
  onUndo,
  onDelete,
}: Props) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progressRatio)) * 100;
  return (
    <Pressable
      style={[styles.card, theme.isLight && lightStyles.card]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, theme.isLight && lightStyles.text]}>
            {title}
          </Text>
          {streak >= 1 && (
            <Text style={[styles.streak, theme.isLight && lightStyles.streak]}>
              🔥 {streak} {streak === 1 ? 'día' : 'días'}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <Text style={[styles.label, theme.isLight && lightStyles.muted]}>
            {progressLabel}
          </Text>
          {onUndo && (
            <Pressable
              accessibilityLabel={`Deshacer avance de ${title}`}
              onPress={e => {
                e.stopPropagation();
                onUndo();
              }}
              hitSlop={10}
            >
              <Text style={styles.undo}>↶</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              accessibilityLabel={`Eliminar ${title}`}
              onPress={e => {
                e.stopPropagation();
                onDelete();
              }}
              hitSlop={10}
            >
              <Text style={styles.delete}>×</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={[styles.track, theme.isLight && lightStyles.track]}>
        <View
          style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#181B25',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262C3E',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWrap: { flex: 1, marginRight: 10 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  streak: { color: '#F5B86B', fontSize: 12, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#9CA3AF', fontSize: 13 },
  delete: { color: '#E895A4', fontSize: 22, lineHeight: 22 },
  undo: { color: '#C9B6E8', fontSize: 20, lineHeight: 22 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2D3A',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
});
const lightStyles = StyleSheet.create({
  card: { backgroundColor: light.surface },
  text: { color: light.text },
  muted: { color: light.muted },
  track: { backgroundColor: light.surfaceMuted },
  streak: { color: '#B97A1F' },
});
