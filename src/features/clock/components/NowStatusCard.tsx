import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';

type Props = { activityName: string; color: string; onPress?: () => void };

export function NowStatusCard({ activityName, color, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        theme.isLight && lightStyles.card,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, theme.isLight && lightStyles.text]}>
        Ahora:{' '}
        <Text style={[styles.bold, theme.isLight && lightStyles.bold]}>
          {activityName}
        </Text>{' '}
        — toca para ver el detalle
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 10,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: '#C7C7CC', fontSize: 14, flexShrink: 1, lineHeight: 20 },
  bold: { color: '#FAFAFA', fontWeight: '700' },
});
const lightStyles = StyleSheet.create({
  card: { backgroundColor: light.surface },
  text: { color: light.muted },
  bold: { color: light.text },
});
