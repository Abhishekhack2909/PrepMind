// Design tokens extracted from Stitch designs
// Single source of truth for all colors, spacing, typography

export const Colors = {
  primary: '#006399',
  secondary: '#632ce5',
  surface: '#f8f9ff',
  surfaceContainer: '#e6eeff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dee9fc',
  surfaceContainerHighest: '#d9e3f6',
  surfaceContainerLowest: '#ffffff',
  surfaceBright: '#f8f9ff',
  surfaceDim: '#d0dbed',
  surfaceVariant: '#d9e3f6',
  onSurface: '#121c2a',
  onSurfaceVariant: '#3f4851',
  outline: '#6f7882',
  outlineVariant: '#bec7d3',
  onPrimary: '#ffffff',
  primaryContainer: '#1da1f2',
  onPrimaryContainer: '#003554',
  secondaryContainer: '#7c4dff',
  onSecondaryContainer: '#fcf6ff',
  inverseSurface: '#27313f',
  inversePrimary: '#95ccff',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  background: '#f8f9ff',
  onBackground: '#121c2a',
} as const;

export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;
