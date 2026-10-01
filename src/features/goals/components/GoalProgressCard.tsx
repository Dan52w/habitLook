import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';

type Props = { title: string; progressLabel: string; progressRatio: number; color: string; onPress?: () => void; onUndo?: () => void; onDelete?: () => void };

export function GoalProgressCard({ title, progressLabel, progressRatio, color, onPress, onUndo, onDelete }: Props) {
  const pct = Math.max(0, Math.min(1, progressRatio)) * 100;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.actions}><Text style={styles.label}>{progressLabel}</Text>{onUndo && <Pressable accessibilityLabel={`Deshacer avance de ${title}`} onPress={onUndo} hitSlop={10}><Text style={styles.undo}>↶</Text></Pressable>}{onDelete && <Pressable accessibilityLabel={`Eliminar ${title}`} onPress={onDelete} hitSlop={10}><Text style={styles.delete}>×</Text></Pressable>}</View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#181B25', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#9CA3AF', fontSize: 13 },
  delete: { color: '#E895A4', fontSize: 22, lineHeight: 22 },
  undo: { color: '#C9B6E8', fontSize: 20, lineHeight: 22 },
  track: { height: 8, borderRadius: 4, backgroundColor: '#2A2D3A', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
