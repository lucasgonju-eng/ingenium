import React from "react";
import { Text as RNText, TextProps } from "react-native";
import { colors, typography } from "../../lib/theme/tokens";

type Props = TextProps & {
  tone?: "default" | "muted" | "brand" | "accent" | "light" | "secondary" | "technical";
  weight?: "regular" | "semibold" | "bold";
};

export function Text({ style, tone = "default", weight = "regular", ...props }: Props) {
  const color =
    tone === "light" ? colors.textPrimary :
    tone === "secondary" ? colors.textSecondary :
    tone === "technical" ? colors.textTechnical :
    tone === "brand" ? colors.einsteinBlue :
    tone === "accent" ? colors.einsteinYellow :
    tone === "muted" ? "rgba(0,0,0,0.6)" :
    colors.black;

  const fontWeight =
    weight === "bold" ? "700" :
    weight === "semibold" ? "600" : "400";

  return (
    <RNText
      {...props}
      style={[
        { color, fontFamily: typography.fontFamily.base, fontWeight },
        style,
      ]}
    />
  );
}
