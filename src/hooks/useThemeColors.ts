import { useThemeStore } from '../store/themeStore';
import type { ThemeColors } from '../constants/config';

/** Resolved palette for the active theme (light/dark/system). */
export function useThemeColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}
