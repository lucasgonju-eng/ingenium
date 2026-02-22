export const colors = {
  einsteinBlue: "#000066",
  einsteinYellow: "#FFC700",
  linkBlue: "#3B82F6",
  white: "#FFFFFF",
  black: "#000000",
  bgStart: "#070816",
  bgMid: "#101735",
  bgEnd: "#050613",
  surfacePanel: "#111636",
  surfaceCard: "#16204A",
  borderSoft: "rgba(255,255,255,0.045)",
  borderStrong: "rgba(255,199,0,0.35)",
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const typography = {
  fontFamily: {
    base: "Poppins",
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
  subtitle: {
    fontSize: 13,
    fontWeight: "500" as const,
    opacity: 0.65,
    lineHeight: Math.round(13 * 1.2),
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
};
