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

const DarkPalette: typeof LightPalette = {
  // Primary stays vibrant so brand pops on dark
  primary: '#3D8BFF',
  primaryDark: '#0066FF',
  primaryLight: '#60A5FA',
  primaryGhost: 'rgba(61, 139, 255, 0.14)',
  primaryGlow: 'rgba(61, 139, 255, 0.35)',

  accent: '#A78BFA',
  accentDark: '#7C3AED',
  accentLight: '#C4B5FD',
  accentGhost: 'rgba(167, 139, 250, 0.14)',
  accentGlow: 'rgba(167, 139, 250, 0.30)',

  gradientStart: '#3D8BFF',
  gradientEnd: '#A78BFA',

  // Surfaces — deep neutrals with a hint of blue
  surface: '#0B0F1A',
  surfaceCard: '#141A2A',
  surfaceElevated: '#1B2236',
  surfaceContainer: '#182036',
  surfaceContainerLow: '#141A2A',
  surfaceContainerHigh: '#212B45',
  surfaceContainerHighest: '#2A3552',
  surfaceContainerLowest: '#0B0F1A',
  surfaceBright: '#1B2236',
  surfaceDim: '#0B0F1A',
  surfaceVariant: '#212B45',

  onSurface: '#F8FAFC',
  onSurfaceVariant: '#CBD5E1',
  onSurfaceMuted: '#94A3B8',

  outline: '#334155',
  outlineVariant: '#293145',
  outlineFaint: 'rgba(148, 163, 184, 0.15)',

  onPrimary: '#0B0F1A',
  primaryContainer: '#1E3A8A',
  onPrimaryContainer: '#DBEAFE',
  secondaryContainer: '#4C1D95',
  onSecondaryContainer: '#EDE9FE',
  inverseSurface: '#F1F5F9',
  inversePrimary: '#0066FF',

  error: '#F87171',
  errorContainer: 'rgba(239, 68, 68, 0.18)',
  success: '#34D399',
  successContainer: 'rgba(16, 185, 129, 0.18)',
  warning: '#FBBF24',
  warningContainer: 'rgba(245, 158, 11, 0.18)',
  info: '#60A5FA',
  infoContainer: 'rgba(59, 130, 246, 0.18)',

  background: '#0B0F1A',
  onBackground: '#F8FAFC',

  streakAmber: '#FBBF24',
  streakAmberGlow: 'rgba(251, 191, 36, 0.24)',
  superPurple: '#A78BFA',
  superPurpleGlow: 'rgba(167, 139, 250, 0.28)',
};

// Mutable Colors singleton. Screens keep `import { Colors } from '@/constants/theme'`.
// We mutate this object in place so all references stay valid, and force a root
// remount when the mode changes so StyleSheet.create() re-runs with new values.
export const Colors: typeof LightPalette = { ...LightPalette };

let currentMode: ColorMode = 'light';

export function getColorMode(): ColorMode {
  return currentMode;
}

export function setColorMode(mode: ColorMode) {
  currentMode = mode;
  const src = mode === 'dark' ? DarkPalette : LightPalette;
  for (const k of Object.keys(src) as Array<keyof typeof LightPalette>) {
    (Colors as any)[k] = src[k];
  }
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
