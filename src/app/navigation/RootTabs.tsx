import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClockScreen } from '../../features/clock/ClockScreen';
import { AccountingScreen } from '../../features/accounting/AccountingScreen';
import { NotesScreen } from '../../features/notes/NotesScreen';
import { ProfileScreen } from '../../features/profile/ProfileScreen';
import {
  ClockTabIcon,
  WalletTabIcon,
  NotesTabIcon,
  ProfileTabIcon,
} from '../../shared/components/icons/TabIcons';
import { light, useTheme } from '../../shared/theme/ThemeProvider';
import { TabErrorBoundary } from '../../shared/components/TabErrorBoundary';

const Tab = createBottomTabNavigator();

function ClockTab() {
  return (
    <TabErrorBoundary tabName="Inicio">
      <ClockScreen />
    </TabErrorBoundary>
  );
}

function AccountingTab() {
  return (
    <TabErrorBoundary tabName="Contabilidad">
      <AccountingScreen />
    </TabErrorBoundary>
  );
}

function NotesTab() {
  return (
    <TabErrorBoundary tabName="Notas">
      <NotesScreen />
    </TabErrorBoundary>
  );
}

function ProfileTab() {
  return (
    <TabErrorBoundary tabName="Perfil">
      <ProfileScreen />
    </TabErrorBoundary>
  );
}

export function RootTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.isLight ? light.accent : '#C4B5FD',
        tabBarInactiveTintColor: theme.isLight ? light.muted : '#5B5F6B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 3 },
        tabBarStyle: {
          backgroundColor: theme.isLight ? light.surface : '#0F1119',
          borderTopWidth: 1,
          borderTopColor: theme.isLight ? light.border : '#1F2230',
          height: 68,
          paddingTop: 10,
          paddingBottom: 12,
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={ClockTab}
        options={{ tabBarIcon: ({ color }) => <ClockTabIcon color={color} /> }}
      />
      <Tab.Screen
        name="Contabilidad"
        component={AccountingTab}
        options={{ tabBarIcon: ({ color }) => <WalletTabIcon color={color} /> }}
      />
      <Tab.Screen
        name="Notas"
        component={NotesTab}
        options={{ tabBarIcon: ({ color }) => <NotesTabIcon color={color} /> }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileTab}
        options={{
          tabBarIcon: ({ color }) => <ProfileTabIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
