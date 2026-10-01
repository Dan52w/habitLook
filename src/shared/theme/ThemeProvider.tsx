import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '../../db/repositories/settiengs';

export type ThemeMode = 'dark' | 'light';
type Theme = { mode: ThemeMode; isLight: boolean; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<Theme>({ mode: 'dark', isLight: false, setMode: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemMode = useColorScheme() === 'light' ? 'light' : 'dark';
  const [choice, setChoice] = useState<ThemeMode | null>(null);
  useEffect(() => { getSetting('theme_mode').then(value => { if (value === 'light' || value === 'dark') setChoice(value); }); }, []);
  const mode = choice ?? systemMode;
  const value = useMemo(() => ({ mode, isLight: mode === 'light', setMode: (next: ThemeMode) => { setChoice(next); setSetting('theme_mode', next).catch(() => undefined); } }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const light = { background: '#F5F0E6', surface: '#FFFDF8', surfaceMuted: '#EEE7DA', text: '#292620', muted: '#6F685E', border: '#D9D0C1' };
