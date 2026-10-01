import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';

type Props = { activityName: string; color: string; onPress?: () => void };

export function NowStatusCard({ activityName, color, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>
        Ahora: <Text style={styles.bold}>{activityName}</Text> — toca para ver sugerencias
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#181B25',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginHorizontal: 16, gap: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: '#D1D5DB', fontSize: 14, flexShrink: 1 },
  bold: { color: '#FFFFFF', fontWeight: '600' },
});