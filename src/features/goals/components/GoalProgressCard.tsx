import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { light, useTheme } from '../../../shared/theme/ThemeProvider';

type Props = {
  title: string;
  progressLabel: string;
  progressRatio: number;
  color: string;
  streak?: number;
  reminderTime?: string | null;
  onPress?: () => void;
  onUndo?: () => void;
  onDelete?: () => void;
  onReminderPress?: () => void;
};

export function GoalProgressCard({
  title,
  progressLabel,
  progressRatio,
  color,
  streak = 0,
  reminderTime,
  onPress,
  onUndo,
  onDelete,
  onReminderPress,
}: Props) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, progressRatio)) * 100;
  const fillProgress = useRef(new Animated.Value(pct / 100)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      fillProgress.setValue(pct / 100);
      return;
    }
    Animated.timing(fillProgress, {
      toValue: pct / 100,
      duration: 220,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [fillProgress, pct, reduceMotion]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        theme.isLight && lightStyles.card,
        pressed && styles.pressed,
      ]}
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
          {onReminderPress && (
            <Pressable
              accessibilityLabel={`Recordatorio de ${title}`}
              onPress={e => {
                e.stopPropagation();
                onReminderPress();
              }}
              hitSlop={10}
            >
              <Text
                style={[
                  styles.reminder,
                  theme.isLight && lightStyles.reminder,
                  !reminderTime && styles.reminderOff,
                ]}
              >
                {reminderTime ? `⏰ ${reminderTime}` : '⏰ Sin aviso'}
              </Text>
            </Pressable>
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
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              transform: [{ scaleX: fillProgress }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#191919',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.992 }] },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWrap: { flex: 1, marginRight: 10 },
  title: { color: '#FAFAFA', fontSize: 16, fontWeight: '700', letterSpacing: -0.15 },
  streak: { color: '#F5B86B', fontSize: 12, fontWeight: '700', marginTop: 2 },
  reminder: { color: '#65D6C0', fontSize: 12, fontWeight: '600', marginTop: 4 },
  reminderOff: { color: '#A3A3A3' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#A3A3A3', fontSize: 13 },
  delete: { color: '#F28B9A', fontSize: 22, lineHeight: 22 },
  undo: { color: '#C7C7CC', fontSize: 20, lineHeight: 22 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#303030',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    transformOrigin: 'left center',
  },
});
const lightStyles = StyleSheet.create({
  card: { backgroundColor: light.surface },
  text: { color: light.text },
  muted: { color: light.muted },
  track: { backgroundColor: light.surfaceMuted },
  streak: { color: '#B97A1F' },
  reminder: { color: light.accent },
});
