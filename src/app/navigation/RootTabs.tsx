import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomTabBarButtonProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { ClockScreen } from '../../features/clock/ClockScreen';
import { AccountingScreen } from '../../features/accounting/AccountingScreen';
import { AiScreen } from '../../features/ai/AiScreen';
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

function AiTab() {
  return (
    <TabErrorBoundary tabName="IA">
      <AiScreen />
    </TabErrorBoundary>
  );
}

/** Botón central destacado para el asistente IA. */
function AiTabButton({ onPress, accessibilityState, style }: BottomTabBarButtonProps) {
  const theme = useTheme();
  const focused = accessibilityState?.selected ?? false;
  return (
    <Pressable
      onPress={onPress}
      style={[style, styles.aiWrap]}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel="Asistente IA"
    >
      <View
        style={[
          styles.aiCircle,
          theme.isLight && styles.aiCircleLight,
          focused && styles.aiCircleFocused,
        ]}
      >
        <Text style={styles.aiEmoji}>✨</Text>
      </View>
      <Text
        style={[
          styles.aiLabel,
          theme.isLight && styles.aiLabelLight,
          focused && theme.isLight && styles.aiLabelFocusedLight,
          focused && !theme.isLight && styles.aiLabelFocused,
        ]}
      >
        IA
      </Text>
    </Pressable>
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
        name="IA"
        component={AiTab}
        options={{
          tabBarLabel: 'IA',
          tabBarButton: props => <AiTabButton {...props} />,
        }}
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

const styles = StyleSheet.create({
  aiWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  aiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    borderWidth: 3,
    borderColor: '#0F1119',
    elevation: 6,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  aiCircleLight: {
    backgroundColor: '#75549E',
    borderColor: '#FFFDF8',
    shadowColor: '#75549E',
  },
  aiCircleFocused: {
    transform: [{ scale: 1.06 }],
  },
  aiEmoji: { fontSize: 26 },
  aiLabel: {
    color: '#8E94A5',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  aiLabelLight: { color: '#7E7669' },
  aiLabelFocused: { color: '#C4B5FD' },
  aiLabelFocusedLight: { color: '#75549E' },
});
