export const colors = {
  bg: "#121212",
  surface: "#1a1a1a",
  surfaceRaised: "#242424",
  surfaceInset: "#0a0a0a",
  surfaceSuccess: "#163226",
  surfaceWarning: "#2a2210",
  surfaceDanger: "#2a1616",
  border: "#333333",
  borderSubtle: "#2b2b2b",
  borderControl: "#827d77",
  borderFocus: "#e8b33d",
  text: "#f5f0e8",
  textSecondary: "#cfc9c1",
  textMuted: "#a8a29e",
  textDim: "#8f8983",
  textOnAccent: "#0a0a0a",
  accent: "#e8b33d",
  accentSoft: "#f2c25c",
  success: "#69c69b",
  warning: "#e8b33d",
  danger: "#c45c5c",
  dangerText: "#f09090",
  info: "#cfc9c1",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: "700" as const, color: colors.text },
  title: { fontSize: 20, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  bodyMuted: { fontSize: 15, color: colors.textMuted },
  caption: { fontSize: 12, color: colors.textMuted },
  mono: { fontSize: 13, fontFamily: "JetBrains Mono", color: colors.text },
  monoDim: { fontSize: 12, fontFamily: "JetBrains Mono", color: colors.textDim },
} as const;
