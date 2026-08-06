// Design tokens — vibrant, professional, clean
// Duo-tone system: Electric Blue primary + Violet accent
//
// Dark-mode support:
//   `Colors` starts in light mode. Call `setColorMode('dark' | 'light')`
//   BEFORE React renders anything (or force a root remount afterwards) —
//   because `StyleSheet.create` snapshots values at first call, so screens
//   that already rendered won't reflect a mid-flight switch without a
//   remount. The root layout handles the remount via a `key` prop.

export type ColorMode = 'light' | 'dark';

const LightPalette = {
  // Primary palette — vibrant electric blue
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryLight: '#3D8BFF',
  primaryGhost: 'rgba(0, 102, 255, 0.08)',
  primaryGlow: 'rgba(0, 102, 255, 0.25)',

  // Accent palette — rich violet
  accent: '#7C3AED',
  accentDark: '#6D28D9',
  accentLight: '#A78BFA',
  accentGhost: 'rgba(124, 58, 237, 0.08)',
  accentGlow: 'rgba(124, 58, 237, 0.20)',

  // Gradient endpoints (for manual gradient simulation via overlays)
  gradientStart: '#0066FF',
  gradientEnd: '#7C3AED',

  // Surfaces — clean, airy
  surface: '#F8FAFF',
  surfaceCard: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceContainer: '#EEF2FF',
  surfaceContainerLow: '#F1F5FF',
  surfaceContainerHigh: '#E0E7FF',
  surfaceContainerHighest: '#D9E3F6',
  surfaceContainerLowest: '#FFFFFF',
  surfaceBright: '#F8FAFF',
  surfaceDim: '#D0DBEE',
  surfaceVariant: '#E2E8F0',

  // On-surfaces
  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  onSurfaceMuted: '#94A3B8',

  // Outline
  outline: '#94A3B8',
  outlineVariant: '#E2E8F0',
  outlineFaint: 'rgba(148, 163, 184, 0.15)',

  // Status
  onPrimary: '#FFFFFF',
  primaryContainer: '#3D8BFF',
  onPrimaryContainer: '#001A40',
  secondaryContainer: '#A78BFA',
  onSecondaryContainer: '#F5F3FF',
  inverseSurface: '#1E293B',
  inversePrimary: '#93C5FD',

  // Feedback colors — vibrant
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  success: '#10B981',
  successContainer: '#D1FAE5',
  warning: '#F59E0B',
  warningContainer: '#FEF3C7',
  info: '#3B82F6',
  infoContainer: '#DBEAFE',

  // Special
  background: '#F8FAFF',
  onBackground: '#0F172A',

  // Streak / gamification
  streakAmber: '#F59E0B',
  streakAmberGlow: 'rgba(245, 158, 11, 0.20)',
  superPurple: '#7C3AED',
  superPurpleGlow: 'rgba(124, 58, 237, 0.25)',
};

// iOS-grade dark palette — neutral near-black surfaces layered with the Apple
// system gray scale (systemGray6 #1C1C1E → gray5 #2C2C2E → gray4 #3A3A3C → gray3
// #48484A), true system-color accents, and hairline separators. No blue tint on
// surfaces — that's what made it read "generic". Depth comes from layering, not
// heavy glows.
const DarkPalette: typeof LightPalette = {
  // Primary — iOS systemBlue (dark)
  primary: '#0A84FF',
  primaryDark: '#0060DF',
  primaryLight: '#409CFF',
  primaryGhost: 'rgba(10, 132, 255, 0.16)',
  primaryGlow: 'rgba(10, 132, 255, 0.28)',

  // Accent — iOS systemPurple (dark)
  accent: '#BF5AF2',
  accentDark: '#9A3FD0',
  accentLight: '#DA9CFF',
  accentGhost: 'rgba(191, 90, 242, 0.16)',
  accentGlow: 'rgba(191, 90, 242, 0.26)',

  gradientStart: '#0A84FF', //for gradient
  gradientEnd: '#BF5AF2',

  // Surfaces — pure neutral, Apple system gray scale
  surface: '#000000',
  surfaceCard: '#1C1C1E',           // systemGray6
  surfaceElevated: '#2C2C2E',       // systemGray5
  surfaceContainer: '#2C2C2E',      // systemGray5 — fills/chips on cards
  surfaceContainerLow: '#1C1C1E',
  surfaceContainerHigh: '#3A3A3C',  // systemGray4
  surfaceContainerHighest: '#48484A', // systemGray3
  surfaceContainerLowest: '#000000',
  surfaceBright: '#2C2C2E',
  surfaceDim: '#000000',
  surfaceVariant: '#2C2C2E',

  // Labels — iOS label opacities on white
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#AEAEB2',      // ~secondary label
  onSurfaceMuted: '#8E8E93',        // systemGray / tertiary label

  // Separators — iOS hairline
  outline: '#48484A',               // systemGray3
  outlineVariant: '#2C2C2E',        // systemGray5
  outlineFaint: 'rgba(84, 84, 88, 0.45)', // separator

  onPrimary: '#FFFFFF',
  primaryContainer: '#0A84FF',
  onPrimaryContainer: '#DBEAFE',
  secondaryContainer: '#BF5AF2',
  onSecondaryContainer: '#F3E8FF',
  inverseSurface: '#2C2C2E',        // elevated dark card (quote card keeps white text)
  inversePrimary: '#0A84FF',

  // Feedback — iOS system colors (dark)
  error: '#FF453A',
  errorContainer: 'rgba(255, 69, 58, 0.18)',
  success: '#30D158',
  successContainer: 'rgba(48, 209, 88, 0.18)',
  warning: '#FF9F0A',
  warningContainer: 'rgba(255, 159, 10, 0.18)',
  info: '#64D2FF',
  infoContainer: 'rgba(100, 210, 255, 0.18)',

  background: '#000000',
  onBackground: '#FFFFFF',

  streakAmber: '#FF9F0A',
  streakAmberGlow: 'rgba(255, 159, 10, 0.22)',
  superPurple: '#BF5AF2',
  superPurpleGlow: 'rgba(191, 90, 242, 0.26)',
};

// Mutable Colors singleton. Screens keep `import { Colors } from '@/constants/theme'`.
// We mutate this object in place so all references stay valid.
//
// Boot ordering matters: `StyleSheet.create()` in each screen captures Colors
// values at MODULE LOAD time. So we resolve the initial mode SYNCHRONOUSLY here
// — from React Native's `Appearance` API (which persists across a JS reload
// on the native side, even without any async storage). The user's stored pref
// is applied on top via `Appearance.setColorScheme()` before we reload.

let currentMode: ColorMode = 'light';

// Mutable singleton for inline `Colors.x` usages in JSX (re-read every render).
export const Colors: typeof LightPalette = { ...LightPalette };

function applyPalette(mode: ColorMode) {
  currentMode = mode;
  const src = mode === 'dark' ? DarkPalette : LightPalette;
  for (const k of Object.keys(src) as Array<keyof typeof LightPalette>) {
    (Colors as any)[k] = src[k];
  }
}

export function getColorMode(): ColorMode {
  return currentMode;
}

export function setColorMode(mode: ColorMode) {
  applyPalette(mode);
}

/**
 * Wrap a StyleSheet factory so it rebuilds per color mode AT RENDER TIME.
 *
 * Usage (module level, unchanged sub-components):
 *   const styles = themed((Colors) => StyleSheet.create({ ... Colors.x ... }));
 *
 * Returns a Proxy: every `styles.foo` access rebuilds/caches the sheet for the
 * CURRENT mode. So when the root remounts on a theme switch, screens re-render,
 * re-access `styles`, and get the right palette — no reload, no boot-timing race.
 */
export function themed<T extends object>(factory: (colors: typeof LightPalette) => T): T {
  const cache: Partial<Record<ColorMode, T>> = {};
  return new Proxy({} as T, {
    get(_t, prop) {
      const mode = currentMode;
      if (!cache[mode]) {
        cache[mode] = factory(mode === 'dark' ? DarkPalette : LightPalette);
      }
      return (cache[mode] as any)[prop];
    },
  });
}

export const Gradients = {
  // Gradient color arrays [start, end] — used with LinearGradient or manual overlays
  primary: ['#0066FF', '#0052CC'],
  accent: ['#7C3AED', '#6D28D9'],
  primaryToAccent: ['#0066FF', '#7C3AED'],
  accentToPrimary: ['#7C3AED', '#0066FF'],
  superBadge: ['#8B5CF6', '#6D28D9'],
  warmGlow: ['#F59E0B', '#EF4444'],
  successGlow: ['#10B981', '#059669'],
  darkCard: ['#1E293B', '#334155'],
  glass: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'],
} as const;

export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  gutter: 20,
  base: 8,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const Shadows = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 8,
  }),
  primaryGlow: {
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 8,
  },
  accentGlow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const Typography = {
  h1: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 32,
    lineHeight: 40,
    color: '#0F172A',
    fontWeight: '800' as const,
  },
  h2: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: '#0F172A',
    fontWeight: '700' as const,
  },
  h3: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: '#0F172A',
    fontWeight: '700' as const,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    color: '#0F172A',
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  bodyMedium: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    fontWeight: '500' as const,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#94A3B8',
  },
  overline: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    fontWeight: '700' as const,
  },
  button: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  buttonSmall: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
} as const;
