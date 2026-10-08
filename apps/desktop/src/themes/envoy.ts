// Derived from a base theme so upstream layout/terminal tokens keep applying.
// Separate file keeps presets.ts merges against upstream trivial.
import type { DesktopTheme, DesktopThemeColors } from './types'

const INDIGO = '#6d7cff'
const INDIGO_LIGHT = '#4f5bd5'

const light: Partial<DesktopThemeColors> = {
  primary: INDIGO_LIGHT,
  ring: INDIGO_LIGHT,
  midground: INDIGO_LIGHT,
  composerRing: INDIGO_LIGHT,
  secondary: '#e4e7ff',
  accent: '#eceeff',
  userBubble: '#e4e7ff'
}

const dark: Partial<DesktopThemeColors> = {
  background: '#0f1115',
  foreground: '#e8ecf2',
  card: '#161a21',
  cardForeground: '#e8ecf2',
  muted: '#1b2029',
  mutedForeground: '#8a93a3',
  popover: '#161a21',
  popoverForeground: '#e8ecf2',
  primary: INDIGO,
  primaryForeground: '#0f1115',
  secondary: '#222845',
  secondaryForeground: '#e8ecf2',
  accent: '#1a1f3a',
  accentForeground: '#e8ecf2',
  border: '#262c36',
  input: '#0f1115',
  ring: INDIGO,
  midground: INDIGO,
  midgroundForeground: '#0f1115',
  composerRing: INDIGO,
  destructive: '#ff5d6c',
  sidebarBackground: '#0c0e12',
  sidebarBorder: '#262c36',
  userBubble: '#171c3a',
  userBubbleBorder: '#262c36'
}

export function buildEnvoyTheme(base: DesktopTheme): DesktopTheme {
  return {
    ...base,
    name: 'envoy',
    label: 'Envoy',
    description: 'Nous chrome, Nexus Envoy blue-black and indigo',
    colors: { ...base.colors, ...light },
    darkColors: { ...(base.darkColors ?? base.colors), ...dark }
  }
}
