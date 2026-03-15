import React from "react";
import { Pressable, View } from "react-native";
import type { PlanItem } from "../content/planos";
import FeatureItem from "./FeatureItem";
import { Text } from "./ui/Text";
import { colors, radii, spacing, typography } from "../lib/theme/tokens";

type Props = {
  plan: PlanItem;
  onPress?: (plan: PlanItem) => void;
  ctaLabel?: string;
  disabled?: boolean;
};

export default function PlanCard({ plan, onPress, ctaLabel, disabled = false }: Props) {
  const isPro = plan.highlighted;

  return (
    <View
      style={{
        borderRadius: radii.lg,
        padding: spacing.md,
        borderWidth: isPro ? 2 : 1,
        borderColor: isPro ? colors.einsteinYellow : colors.borderSoft,
        backgroundColor: isPro ? colors.surfaceCard : colors.surfacePanel,
      }}
    >
      {plan.badge ? (
        <View
          style={{
            alignSelf: "center",
            marginBottom: spacing.xs,
            borderRadius: radii.pill,
            backgroundColor: colors.einsteinYellow,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: colors.einsteinBlue, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }} weight="bold">
            {plan.badge}
          </Text>
        </View>
      ) : null}

      <Text
        style={{
          color: isPro ? colors.einsteinYellow : "rgba(255,255,255,0.75)",
          fontSize: typography.small.fontSize,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
        weight="bold"
      >
        {plan.title}
      </Text>
      <View style={{ marginTop: 2, flexDirection: "row", alignItems: "flex-end" }}>
        <Text style={{ color: colors.white, fontSize: 38, lineHeight: 42 }} weight="bold">
          {plan.price}
        </Text>
        {plan.period ? (
          <Text style={{ marginLeft: 4, marginBottom: 2, color: "rgba(255,255,255,0.6)", fontSize: 18 }}>
            {plan.period}
          </Text>
        ) : null}
      </View>
      {plan.subtitle ? (
        <Text style={{ marginTop: 2, color: "rgba(255,255,255,0.55)", fontSize: typography.small.fontSize, fontStyle: "italic" }}>
          {plan.subtitle}
        </Text>
      ) : null}

      <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
        {plan.features.map((feature) => (
          <FeatureItem key={`${plan.id}-${feature.label}`} item={feature} highlighted={isPro} />
        ))}
      </View>

      <Pressable
        disabled={disabled}
        onPress={() => onPress?.(plan)}
        style={{
          marginTop: spacing.md,
          height: 46,
          borderRadius: radii.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isPro ? colors.einsteinYellow : "transparent",
          borderWidth: isPro ? 0 : 1,
          borderColor: colors.einsteinYellow,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <Text style={{ color: isPro ? colors.einsteinBlue : colors.einsteinYellow }} weight="bold">
          {ctaLabel ?? plan.cta}
        </Text>
      </Pressable>
    </View>
  );
}
