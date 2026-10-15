import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';

type Props = { activityName: string; color: string; onPress?: () => void };

export function NowStatusCard({ activityName, color, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      style={[styles.card, theme.isLight && lightStyles.card]}
      onPress={onPress}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, theme.isLight && lightStyles.text]}>
        Ahora:{' '}
        <Text style={[styles.bold, theme.isLight && lightStyles.bold]}>
          {activityName}
        </Text>{' '}
        — toca para ver sugerencias
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181B25',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262C3E',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    gap: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: '#D1D5DB', fontSize: 14, flexShrink: 1 },
  bold: { color: '#FFFFFF', fontWeight: '600' },
});
const lightStyles = StyleSheet.create({
  card: { backgroundColor: light.surface },
  text: { color: light.muted },
  bold: { color: light.text },
});
