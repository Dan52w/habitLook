import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppModal } from './AppModal';
import {
  useFirstTimeTip,
  useFirstTimeTipOnOpen,
} from '../hooks/useFirstTimeTip';
import { useTheme } from '../theme/ThemeProvider';

type TipProps = {
  icon: string;
  title: string;
  children: React.ReactNode;
};

function TipBody({
  icon,
  title,
  children,
  visible,
  onDismiss,
}: TipProps & { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <AppModal visible={visible} title={title} onClose={onDismiss}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>{children}</View>
      <Pressable
        style={[styles.button, { backgroundColor: c.text }]}
        onPress={onDismiss}
      >
        <Text
          style={[
            styles.buttonText,
            { color: theme.isLight ? '#FFFFFF' : '#0E0E0F' },
          ]}
        >
          Entendido 👍
        </Text>
      </Pressable>
      <Text style={[styles.foot, { color: c.muted }]}>
        Este consejo solo aparece una vez. Puedes volver a verlos todos desde
        Perfil.
      </Text>
    </AppModal>
  );
}

/**
 * Consejo que aparece la primera vez que se abre una función (pestaña).
 * Lenguaje natural, sin tecnicismos. Al tocar "Entendido" no vuelve a salir.
 */
export function FirstTimeTip({
  tipKey,
  ...props
}: TipProps & { tipKey: string }) {
  const { visible, dismiss } = useFirstTimeTip(tipKey);
  return <TipBody {...props} visible={visible} onDismiss={dismiss} />;
}

/**
 * Misma idea, pero para funciones que se abren como ventana (Planificación,
 * Metas, Estadísticas, Transferencias): aparece encima la primera vez que
 * se abre esa ventana.
 */
export function FirstTimeTipOnOpen({
  open,
  tipKey,
  ...props
}: TipProps & { open: boolean; tipKey: string }) {
  const { visible, dismiss } = useFirstTimeTipOnOpen(open, tipKey);
  return <TipBody {...props} visible={visible} onDismiss={dismiss} />;
}

export function TipText({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center' },
  icon: { fontSize: 44 },
  body: { gap: 10 },
  text: { fontSize: 15, lineHeight: 22 },
  button: {
    alignItems: 'center',
    borderRadius: 13,
    padding: 15,
    marginTop: 4,
  },
  buttonText: { fontWeight: '800', fontSize: 15 },
  foot: { fontSize: 12, textAlign: 'center' },
});
