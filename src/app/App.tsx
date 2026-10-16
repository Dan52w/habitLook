import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Pressable,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../db/client';
import { getSetting } from '../db/repositories/settings';
import { RootTabs } from './navigation/RootTabs';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import {
  ensureNotificationPermission,
  rescheduleActivityReminders,
} from '../services/notifications';
import { observeNotificationActions } from '../services/notifications';
import {
  ThemeProvider,
  useTheme,
  light,
  dark,
} from '../shared/theme/ThemeProvider';
import { DialogProvider } from '../shared/context/DialogContext';
import { AccountingPeriodProvider } from '../features/accounting/context/PeriodContext';

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: dark.background,
    card: dark.background,
    border: dark.border,
    text: dark.text,
  },
};

const customLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: light.background,
    card: light.surface,
    border: light.border,
    text: light.text,
  },
};

function AppContent({
  showOnboarding,
  onOnboardingDone,
}: {
  showOnboarding: boolean;
  onOnboardingDone: () => void;
}) {
  const theme = useTheme();

  useEffect(() => {
    StatusBar.setBarStyle(theme.isLight ? 'dark-content' : 'light-content');
    if (
      Platform.OS === 'android' &&
      typeof (StatusBar as any).setBackgroundColor === 'function'
    ) {
      (StatusBar as any).setBackgroundColor(
        theme.isLight ? light.background : dark.background,
        true,
      );
    }
  }, [theme.isLight]);

  if (showOnboarding) {
    return (
      <>
        <StatusBar barStyle={theme.isLight ? 'dark-content' : 'light-content'} />
        <OnboardingScreen onDone={onOnboardingDone} />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle={theme.isLight ? 'dark-content' : 'light-content'} />
      <NavigationContainer
        theme={theme.isLight ? customLightTheme : customDarkTheme}
      >
        <RootTabs />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initializationError, setInitializationError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let unobserve = () => {};

    (async () => {
      try {
        await getDb();
      } catch (e) {
        console.error('Error inicializando base de datos:', e);
        setInitializationError(true);
        setReady(true);
        return;
      }

      // Onboarding de primera ejecución: se muestra una sola vez.
      // Si la lectura falla, no se bloquea al usuario (fail closed).
      try {
        const done = await getSetting('onboarding_done');
        setShowOnboarding(done !== '1');
      } catch {
        setShowOnboarding(false);
      }

      // Las notificaciones son "best effort": si fallan, la app sigue funcionando.
      try {
        await ensureNotificationPermission();
        await rescheduleActivityReminders();
        unobserve = observeNotificationActions();
      } catch (e) {
        console.warn('Notificaciones no disponibles:', e);
      }
      setReady(true);
    })();

    return () => {
      unobserve();
    };
  }, [retry]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B0D14',
        }}
      >
        <ActivityIndicator color="#9B8FBF" />
      </View>
    );
  }

  if (initializationError) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 28,
            backgroundColor: '#0B0D14',
            gap: 14,
          }}
        >
          <Text style={{ color: '#F8F7FB', fontSize: 20, fontWeight: '700' }}>
            No se pudo abrir tu bóveda local
          </Text>
          <Text style={{ color: '#AEB2C0', textAlign: 'center' }}>
            Tus datos no se han modificado. Intenta abrir la app de nuevo.
          </Text>
          <Pressable
            onPress={() => {
              setInitializationError(false);
              setReady(false);
              setRetry(value => value + 1);
            }}
            style={{
              backgroundColor: '#A78BFA',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 11,
            }}
          >
            <Text style={{ color: '#171421', fontWeight: '800' }}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DialogProvider>
          <AccountingPeriodProvider>
            <AppContent
              showOnboarding={showOnboarding}
              onOnboardingDone={() => setShowOnboarding(false)}
            />
          </AccountingPeriodProvider>
        </DialogProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
