import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  THEME_STORAGE_KEY,
  type ThemeColors,
  type ThemePreference,
  resolveEffectiveScheme,
  getColorsForScheme,
} from '../constants/config';

export type ThemeState = {
  preference: ThemePreference;
  systemColorScheme: 'light' | 'dark' | null;
  resolvedScheme: 'light' | 'dark';
  colors: ThemeColors;
  setPreference: (p: ThemePreference) => void;
  setSystemColorScheme: (s: 'light' | 'dark' | null | undefined) => void;
};

function computeTheme(
  preference: ThemePreference,
  system: 'light' | 'dark' | null
): { resolvedScheme: 'light' | 'dark'; colors: ThemeColors } {
  const resolvedScheme = resolveEffectiveScheme(preference, system);
  return {
    resolvedScheme,
    colors: getColorsForScheme(resolvedScheme),
  };
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'light' as ThemePreference,
      systemColorScheme: null as 'light' | 'dark' | null,
      resolvedScheme: 'light' as const,
      colors: getColorsForScheme('light'),

      setPreference: (preference) => {
        const { systemColorScheme } = get();
        set({
          preference,
          ...computeTheme(preference, systemColorScheme),
        });
      },

      setSystemColorScheme: (system) => {
        const scheme = system ?? null;
        set((state) => ({
          systemColorScheme: scheme,
          ...computeTheme(state.preference, scheme),
        }));
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ preference: state.preference }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<Pick<ThemeState, 'preference'>> | undefined)?.preference ?? 'light';
        const { systemColorScheme } = current as ThemeState;
        return {
          ...(current as ThemeState),
          preference: p,
          ...computeTheme(p, systemColorScheme ?? null),
        };
      },
    }
  )
);
