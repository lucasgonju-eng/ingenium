import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View } from "react-native";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "./Text";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  variant?: "default" | "transparent" | "feed";
};

export default function StitchHeader({
  title,
  subtitle,
  onBack,
  leftSlot,
  rightSlot,
  variant = "default",
}: Props) {
  const isFeed = variant === "feed";
  const isTransparent = variant === "transparent";
  const defaultRightSlot = null;

  return (
    <LinearGradient
      colors={
        isTransparent
          ? ["transparent", "transparent"]
          : isFeed
            ? ["rgba(17,22,54,0.82)", "rgba(10,16,44,0.52)"]
            : ["rgba(17,22,54,0.88)", "rgba(10,16,44,0.72)"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          borderRadius: radii.xl,
          borderWidth: isTransparent ? 0 : 1,
          borderColor: "rgba(255,255,255,0.10)",
          overflow: "hidden",
        },
        isTransparent ? null : headerShadowStyle,
      ]}
    >
      <View
        style={{
          paddingHorizontal: spacing.sm,
          paddingTop: isFeed ? spacing.sm : spacing.md,
          paddingBottom: isFeed ? spacing.sm : spacing.md,
          gap: spacing.xxs,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ width: 44, alignItems: "flex-start", justifyContent: "center" }}>
            {isFeed ? (
              leftSlot ?? (
                <View style={feedBadgeStyle}>
                  <Text style={{ color: colors.goldBase, fontSize: typography.small.fontSize }} weight="bold">
                    IE
                  </Text>
                </View>
              )
            ) : (
              <Pressable
                onPress={onBack}
                disabled={!onBack}
                hitSlop={8}
                style={({ pressed }) => [backButtonStyle, !onBack ? { opacity: 0 } : null, pressed ? { transform: [{ scale: 0.97 }] } : null]}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 18 }}>←</Text>
              </Pressable>
            )}
          </View>

          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: isFeed ? typography.titleMd.fontSize : typography.titleLg.fontSize,
                lineHeight: isFeed ? typography.titleMd.lineHeight : typography.titleLg.lineHeight,
                textAlign: "center",
              }}
              weight="bold"
              numberOfLines={isFeed ? 1 : 2}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: typography.small.fontSize,
                  marginTop: 2,
                  textAlign: "center",
                }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              width: 44,
              minHeight: 40,
              borderRadius: radii.pill,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {rightSlot ?? defaultRightSlot}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const headerShadowStyle = {
  shadowColor: "#020617",
  shadowOpacity: 0.25,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 7,
};

const backButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.16)",
  backgroundColor: "rgba(255,255,255,0.08)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const feedBadgeStyle = {
  width: 38,
  height: 38,
  borderRadius: radii.pill,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.08)",
};
