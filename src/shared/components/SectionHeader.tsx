import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { light, useTheme } from '../theme/ThemeProvider';

type Props = {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
};

/**
 * Encabezado consistente para las pestañas: eyebrow en acento + título.
 * `action` se ubica a la derecha (ej. botón "+ Nueva").
 */
export function SectionHeader({ eyebrow, title, action }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.heading}>
      <View style={styles.titles}>
        <Text style={[styles.eyebrow, theme.isLight && lightStyles.eyebrow]}>
          {eyebrow}
        </Text>
        <Text style={[styles.title, theme.isLight && lightStyles.title]}>
          {title}
        </Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 2,
  },
  titles: { flex: 1 },
  eyebrow: {
    color: '#A3A3A3',
    fontSize: 12,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  title: {
    color: '#FAFAFA',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 31,
    marginTop: 4,
    letterSpacing: -0.55,
  },
  action: { paddingTop: 2 },
});

const lightStyles = StyleSheet.create({
  eyebrow: { color: light.muted },
  title: { color: light.text },
});
