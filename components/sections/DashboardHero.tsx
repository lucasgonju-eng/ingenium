import React from "react";
import { Image, ImageSourcePropType, View } from "react-native";
import { Text } from "../ui/Text";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  loboClass: "bronze" | "silver" | "gold";
  label: string;
  accent: string;
  points: number;
  rankText: string;
  progressPct: number;
  progressNext: string;
  progressText: string;
  eligibilityText: string;
};

const WOLF_BY_CLASS: Record<"bronze" | "silver" | "gold", ImageSourcePropType> = {
  bronze: require("../../assets/wolf-bronze.png"),
  silver: require("../../assets/wolf-silver.png"),
  gold: require("../../assets/wolf-gold.png"),
};
const GOLD_LUX_TINT = "#C8A45D";

export default function DashboardHero({
  loboClass,
  label,
  accent,
  points,
  rankText,
  progressPct,
  progressNext,
  progressText,
  eligibilityText,
}: Props) {
  return (
    <View>
      <View
        style={{
          borderRadius: radii.xl,
          padding: sizes.cardPadding,
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          ...shadows.hero,
        }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              borderWidth: 2,
              borderColor: accent,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <Image
              source={WOLF_BY_CLASS[loboClass]}
              style={{ width: "100%", height: "100%", tintColor: loboClass === "gold" ? GOLD_LUX_TINT : undefined }}
              resizeMode="cover"
            />
          </View>
          <Text style={{ color: accent, fontSize: 20, marginTop: spacing.xs }} weight="bold">
            {label}
          </Text>
        </View>

        <View style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: typography.small.fontSize }}>XP Atual</Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: typography.small.fontSize }}>
              Próximo: {progressNext}
            </Text>
          </View>
          <View
            style={{
              marginTop: spacing.xs - 2,
              height: 8,
              borderRadius: radii.pill,
              backgroundColor: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <View style={{ width: `${progressPct}%`, height: "100%", backgroundColor: colors.einsteinBlue }} />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: spacing.xs - 2, fontSize: 12 }}>
            {progressText}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm - 2, marginTop: spacing.sm }}>
        <View
          style={{
            flex: 1,
            borderRadius: radii.lg,
            padding: sizes.compactCardPadding,
            backgroundColor: colors.surfacePanel,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: typography.small.fontSize }}>Total de Pontos</Text>
          <Text style={{ color: "white", fontSize: typography.metric.fontSize, marginTop: 4 }} weight="bold">
            {points}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            borderRadius: radii.lg,
            padding: sizes.compactCardPadding,
            backgroundColor: colors.surfacePanel,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: typography.small.fontSize }}>
            Ranking Geral
          </Text>
          <Text style={{ color: "white", fontSize: typography.metric.fontSize, marginTop: 4 }} weight="bold">
            {rankText}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: spacing.sm,
          borderRadius: radii.lg,
          padding: sizes.compactCardPadding,
          backgroundColor: colors.surfacePanel,
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.86)" }}>{eligibilityText}</Text>
      </View>
    </View>
  );
}
