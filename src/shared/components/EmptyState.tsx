import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { light, useTheme } from '../theme/ThemeProvider';

type Props = {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Estado vacío consistente: icono, título, mensaje y acción opcional.
 * Pensado para primeras ejecuciones (sin metas, movimientos, notas…).
 */
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.container, theme.isLight && lightStyles.container]}>
      <View style={[styles.iconWrap, theme.isLight && lightStyles.iconWrap]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.title, theme.isLight && lightStyles.title]}>
        {title}
      </Text>
      <Text style={[styles.message, theme.isLight && lightStyles.message]}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.action, theme.isLight && lightStyles.action]}
        >
          <Text style={[styles.actionText, theme.isLight && lightStyles.actionText]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#12151F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2432',
    borderStyle: 'dashed',
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginVertical: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D2233',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 26 },
  title: {
    color: '#F2F3F6',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#8E94A5',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  action: {
    backgroundColor: '#A78BFA',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 14,
  },
  actionText: { color: '#171421', fontWeight: '800', fontSize: 14 },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.surface, borderColor: light.border },
  iconWrap: { backgroundColor: light.surfaceMuted },
  title: { color: light.text },
  message: { color: light.muted },
  action: { backgroundColor: light.accent },
  actionText: { color: '#FFFFFF' },
});
