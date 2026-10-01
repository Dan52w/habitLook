import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '../../db/repositories/settings';

export type ThemeMode = 'dark' | 'light';

export const light = {
  background: '#F5F0E6',
  surface: '#FFFDF8',
  surfaceMuted: '#ECE5D8',
  card: '#FFFDF8',
  chip: '#E8E1D2',
  chipActive: '#D6C8E8',
  input: '#ECE5D8',
  text: '#22201C',
  textSecondary: '#565045',
  muted: '#7E7669',
  border: '#DCD4C4',
  accent: '#75549E',
  accentLight: '#9372BE',
};

export const dark = {
  background: '#0B0D14',
  surface: '#181B25',
  surfaceMuted: '#202433',
  card: '#181B25',
  chip: '#202433',
  chipActive: '#3B2E58',
  input: '#181B25',
  text: '#F8F7FB',
  textSecondary: '#D1D5DB',
  muted: '#8E94A5',
  border: '#292E3D',
  accent: '#A78BFA',
  accentLight: '#C9B6E8',
};

type ThemeContextType = {
  mode: ThemeMode;
  isLight: boolean;
  colors: typeof dark;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  isLight: false,
  colors: dark,
  setMode: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemMode = useColorScheme() === 'light' ? 'light' : 'dark';
  const [choice, setChoice] = useState<ThemeMode | null>(null);

  useEffect(() => {
    getSetting('theme_mode').then(value => {
      if (value === 'light' || value === 'dark') setChoice(value);
    });
  }, []);

  const mode = choice ?? systemMode;
  const isLight = mode === 'light';
  const colors = isLight ? light : dark;

  const value = useMemo(
    () => ({
      mode,
      isLight,
      colors,
      setMode: (next: ThemeMode) => {
        setChoice(next);
        setSetting('theme_mode', next).catch(() => undefined);
      },
    }),
    [mode, isLight, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
