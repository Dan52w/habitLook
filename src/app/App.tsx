import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../db/client';
import { RootTabs } from './navigation/RootTabs';
import { rescheduleActivityReminders } from '../services/notifications';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initApp() {
      try {
        await getDb();
        await rescheduleActivityReminders();
      } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
      } finally {
        // Garantiza que pase a la UI principal incluso si hubo un error en la BD
        setReady(true);
      }
    }

    initApp();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D14' }}>
        <ActivityIndicator color="#9B8FBF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
