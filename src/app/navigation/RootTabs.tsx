import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClockScreen } from '../../features/clock/ClockScreen';
import { AccountingScreen } from '../../features/accounting/AccountingScreen';
import { NotesScreen } from '../../features/notes/NotesScreen';
import { ProfileScreen } from '../../features/profile/ProfileScreen';
import { ClockTabIcon, WalletTabIcon, NotesTabIcon, ProfileTabIcon } from '../../shared/components/icons/TabIcons';

const Tab = createBottomTabNavigator();

export function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9B8FBF',
        tabBarInactiveTintColor: '#5B5F6B',
        tabBarStyle: { backgroundColor: '#0F1119', borderTopColor: '#1F2230' },
      }}
    >
      <Tab.Screen name="Inicio" component={ClockScreen} options={{ tabBarIcon: ({ color }) => <ClockTabIcon color={color} /> }} />
      <Tab.Screen name="Contabilidad" component={AccountingScreen} options={{ tabBarIcon: ({ color }) => <WalletTabIcon color={color} /> }} />
      <Tab.Screen name="Notas" component={NotesScreen} options={{ tabBarIcon: ({ color }) => <NotesTabIcon color={color} /> }} />
      <Tab.Screen name="Perfil" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <ProfileTabIcon color={color} /> }} />
    </Tab.Navigator>
  );
}