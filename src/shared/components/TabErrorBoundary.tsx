import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { light, useTheme } from '../theme/ThemeProvider';

type Props = {
  children: React.ReactNode;
  tabName: string;
};

type State = { hasError: boolean };

/**
 * Aísla los errores de render de cada pestaña: si una pestaña falla,
 * muestra una pantalla de recuperación en vez de tumbar toda la app.
 */
export class TabErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`[HabitLook] Error en la pestaña ${this.props.tabName}:`, error);
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.retry} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, theme.isLight && lightStyles.container]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, theme.isLight && lightStyles.title]}>
        Algo salió mal aquí
      </Text>
      <Text style={[styles.message, theme.isLight && lightStyles.message]}>
        Esta sección tuvo un problema inesperado. Tus datos están a salvo.
      </Text>
      <Pressable
        style={[styles.button, theme.isLight && lightStyles.button]}
        onPress={onRetry}
      >
        <Text
          style={[styles.buttonText, theme.isLight && lightStyles.buttonText]}
        >
          Reintentar
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { color: '#F8F7FB', fontSize: 18, fontWeight: '700' },
  message: {
    color: '#8E94A5',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#A78BFA',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 18,
  },
  buttonText: { color: '#171421', fontWeight: '800', fontSize: 14 },
});

const lightStyles = StyleSheet.create({
  container: { backgroundColor: light.background },
  title: { color: light.text },
  message: { color: light.muted },
  button: { backgroundColor: light.accent },
  buttonText: { color: '#FFFFFF' },
});
