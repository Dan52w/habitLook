import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Pressable, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../db/client';
import { RootTabs } from './navigation/RootTabs';
import { rescheduleActivityReminders } from '../services/notifications';
import { observeNotificationActions } from '../services/notifications';

export default function App() {
  const [ready, setReady] = useState(false);
  const [initializationError, setInitializationError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    async function initApp() {
      try {
        await getDb();
        await rescheduleActivityReminders();
      } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        setInitializationError(true);
      } finally {
        // Garantiza que pase a la UI principal incluso si hubo un error en la BD
        setReady(true);
      }
    }

    initApp();
    return observeNotificationActions();
  }, [retry]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D14' }}>
        <ActivityIndicator color="#9B8FBF" />
      </View>
    );
  }

  if (initializationError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#0B0D14', gap: 14 }}><Text style={{ color: '#F8F7FB', fontSize: 20, fontWeight: '700' }}>No se pudo abrir tu bóveda local</Text><Text style={{ color: '#AEB2C0', textAlign: 'center' }}>Tus datos no se han modificado. Intenta abrir la app de nuevo.</Text><Pressable onPress={() => { setInitializationError(false); setReady(false); setRetry(value => value + 1); }} style={{ backgroundColor: '#A78BFA', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 }}><Text style={{ color: '#171421', fontWeight: '800' }}>Reintentar</Text></Pressable></View>;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
