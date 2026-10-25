import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '../../db/repositories/settings';

export type ThemeMode = 'dark' | 'light';

export const light = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceMuted: '#ECECEE',
  card: '#FFFFFF',
  chip: '#ECECEE',
  chipActive: '#DCEEEA',
  input: '#F1F1F3',
  text: '#1C1C1E',
  textSecondary: '#48484A',
  muted: '#6E6E73',
  border: '#E1E1E6',
  accent: '#0B7669',
  accentLight: '#238A7D',
};

export const dark = {
  background: '#0E0E0F',
  surface: '#191919',
  surfaceMuted: '#282828',
  card: '#191919',
  chip: '#252525',
  chipActive: '#2B3A37',
  input: '#202020',
  text: '#FAFAFA',
  textSecondary: '#C7C7CC',
  muted: '#A3A3A3',
  border: '#2A2A2A',
  accent: '#65D6C0',
  accentLight: '#A3E6D8',
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
    [mode, isLight, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
