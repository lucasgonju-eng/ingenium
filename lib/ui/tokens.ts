export const colors = {
  // Brand core
  einsteinBlue: "#000066",
  einsteinYellow: "#FFC700",
  linkBlue: "#3B82F6",
  white: "#FFFFFF",
  black: "#000000",

  // Background layers
  bgStart: "#070816",
  bgMid: "#101735",
  bgEnd: "#050613",
  bgCanvas: "#04061A",
  bgDepth: "#0A1238",
  bgOverlay: "rgba(5,9,32,0.72)",

  // Surface system
  surfacePanel: "#111636",
  surfaceCard: "#16204A",
  surfacePanelRaised: "#151E46",
  surfacePanelInteractive: "#1A2552",
  surfaceGlass: "rgba(19,31,74,0.72)",
  surfaceGlow: "rgba(255,199,0,0.10)",

  // Border system
  borderSoft: "rgba(255,255,255,0.045)",
  borderDefault: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,199,0,0.35)",
  borderGoldSoft: "rgba(255,199,0,0.25)",
  borderGoldStrong: "rgba(255,199,0,0.58)",

  // Text system
  textPrimary: "rgba(255,255,255,0.96)",
  textSecondary: "rgba(236,240,255,0.82)",
  textMuted: "rgba(202,210,240,0.62)",
  textTechnical: "rgba(173,188,236,0.76)",

  // Gold accents
  goldBase: "#FFC700",
  goldSoft: "#FFD95A",
  goldGlow: "rgba(255,199,0,0.28)",
  goldGlowStrong: "rgba(255,199,0,0.45)",

  // Status
  statusSuccess: "#8BE7AF",
  statusWarning: "#FFD978",
  statusDanger: "#F6A6A6",
  statusDangerBg: "rgba(127,29,29,0.35)",

  // Phase accents (subtle)
  phaseReflexo: "#7BC8FF",
  phaseLogica: "#C5B4FF",
  phaseConhecimento: "#8FE5CF",
  phaseLideranca: "#FFC874",
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const typography = {
  fontFamily: {
    base: "Poppins",
  },
  displayLg: {
    fontSize: 30,
    fontWeight: "700" as const,
    lineHeight: Math.round(30 * 1.08),
    letterSpacing: 0.2,
  },
  headingLg: {
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: Math.round(24 * 1.12),
    letterSpacing: 0.2,
  },
  titleLg: {
    fontSize: 22,
    fontWeight: "700" as const,
    lineHeight: Math.round(22 * 1.15),
    letterSpacing: 0.2,
  },
  titleMd: {
    fontSize: 18,
    fontWeight: "700" as const,
    lineHeight: Math.round(18 * 1.15),
    letterSpacing: 0.2,
  },
  bodyMd: {
    fontSize: 15,
    fontWeight: "500" as const,
    lineHeight: Math.round(15 * 1.4),
    letterSpacing: 0.1,
  },
  bodySm: {
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: Math.round(13 * 1.35),
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    opacity: 0.65,
    lineHeight: Math.round(13 * 1.2),
  },
  metricLg: {
    fontSize: 24,
    fontWeight: "800" as const,
    lineHeight: Math.round(24 * 1.05),
    letterSpacing: 0.2,
  },
  metric: {
    fontSize: 16,
    fontWeight: "800" as const,
    lineHeight: Math.round(16 * 1.15),
  },
  small: {
    fontSize: 12,
    fontWeight: "500" as const,
    opacity: 0.7,
    lineHeight: Math.round(12 * 1.2),
  },
};

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 22,
  xxl: 28,
  pill: 999,
};

export const sizes = {
  inputHeight: 44,
  buttonHeight: 48,
  cardPadding: 20,
  compactCardPadding: 16,
};

export const shadows = {
  hero: {
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  soft: {
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  panelDepth: {
    elevation: 8,
    shadowColor: "#020617",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  glowGold: {
    elevation: 6,
    shadowColor: "#FFC700",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
};
