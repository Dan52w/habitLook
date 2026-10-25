import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const scale = useRef(new Animated.Value(focused ? 1.05 : 1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? 1.05 : 1,
      duration: reduceMotion ? 0 : 180,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [focused, reduceMotion, scale]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        style,
        styles.aiWrap,
        pressed && styles.tabPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel="Asistente IA"
    >
      <Animated.View
        style={[
          styles.aiCircle,
          {
            backgroundColor: focused
              ? theme.colors.text
              : theme.colors.surfaceMuted,
            borderColor: theme.colors.background,
          },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.aiGlyph, focused && styles.aiGlyphActive]}>✦</Text>
      </Animated.View>
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
  const insets = useSafeAreaInsets();
  // 58 pt es el área de controles. El inset se añade al alto total para que
  // los botones del sistema nunca cubran etiquetas o iconos en Android.
  const tabBarHeight = 58 + Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarItemStyle: { paddingTop: 4 },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
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
    paddingTop: 1,
  },
  tabPressed: { opacity: 0.72 },
  aiCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  aiGlyph: { color: '#A3A3A3', fontSize: 16, fontWeight: '700', lineHeight: 19 },
  aiGlyphActive: { color: '#0E0E0F' },
  aiLabel: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  aiLabelLight: { color: light.muted },
  aiLabelFocused: { color: '#FAFAFA' },
  aiLabelFocusedLight: { color: light.text },
});
