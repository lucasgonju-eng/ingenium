import React from "react";
import { View } from "react-native";
import type { PlanFeature } from "../content/planos";
import { colors, spacing, typography } from "../lib/theme/tokens";
import { Text } from "./ui/Text";

type Props = {
  item: PlanFeature;
  highlighted?: boolean;
};

export default function FeatureItem({ item, highlighted = false }: Props) {
  const icon = item.included ? "✓" : "✕";
  const iconColor = item.included ? (highlighted ? colors.einsteinYellow : "#35c980") : "#ff4d4f";
  const textColor = item.included
    ? highlighted || item.emphasis
      ? colors.white
      : "rgba(255,255,255,0.88)"
    : "rgba(255,255,255,0.45)";

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.xs }}>
      <Text style={{ color: iconColor, fontSize: 16, lineHeight: 20 }}>{icon}</Text>
      <Text
        style={{
          flex: 1,
          color: textColor,
          fontSize: 14,
          lineHeight: 20,
          fontWeight: highlighted || item.emphasis ? "600" : "400",
          textDecorationLine: item.included ? "none" : "line-through",
        }}
      >
        {item.label}
      </Text>
    </View>
  );
}
