import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal } from './AppModal';
import { useFirstTimeTip } from '../hooks/useFirstTimeTip';
import { light, useTheme } from '../theme/ThemeProvider';

type Props = {
  tipKey: string;
  icon: string;
  title: string;
  children: React.ReactNode;
};

/**
 * Consejo que aparece la primera vez que se abre una función.
 * Lenguaje natural, sin tecnicismos. Al tocar "Entendido" no vuelve a salir.
 */
export function FirstTimeTip({ tipKey, icon, title, children }: Props) {
  const theme = useTheme();
  const isLight = theme.isLight;
  const { visible, dismiss } = useFirstTimeTip(tipKey);

  return (
    <AppModal visible={visible} title={title} onClose={dismiss}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>{children}</View>
      <Pressable style={styles.button} onPress={dismiss}>
        <Text style={styles.buttonText}>Entendido 👍</Text>
      </Pressable>
      <Text style={[styles.foot, isLight && lightStyles.foot]}>
        Este consejo solo aparece una vez. Puedes volver a verlos todos desde
        Perfil.
      </Text>
    </AppModal>
  );
}

export function TipText({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={[styles.text, theme.isLight && lightStyles.text]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center' },
  icon: { fontSize: 44 },
  body: { gap: 10 },
  text: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },
  button: {
    alignItems: 'center',
    backgroundColor: '#A78BFA',
    borderRadius: 13,
    padding: 15,
    marginTop: 4,
  },
  buttonText: { color: '#171421', fontWeight: '800', fontSize: 15 },
  foot: { color: '#74798A', fontSize: 12, textAlign: 'center' },
});

const lightStyles = StyleSheet.create({
  text: { color: light.text },
  foot: { color: light.muted },
});
