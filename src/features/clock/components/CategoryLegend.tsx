import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type LegendItem = { categoryName: string; color: string; hours: number };
const duration = (hours: number) => { const minutes = Math.round(hours * 60); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`; };

export function CategoryLegend({ items }: { items: LegendItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.categoryName} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text numberOfLines={1} style={styles.text}>{item.categoryName} · {duration(item.hours)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: '#D1D5DB', fontSize: 13 },
});
