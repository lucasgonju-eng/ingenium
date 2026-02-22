import React from "react";
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
  const bg = variant === "transparent" ? "transparent" : "rgba(255,255,255,0.02)";
  const defaultRightSlot =
    variant === "feed" ? (
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Text style={{ color: colors.einsteinYellow, fontSize: 14 }}>👤</Text>
      </View>
    ) : null;

  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingTop: variant === "feed" ? spacing.xs : spacing.sm,
        paddingBottom: variant === "feed" ? spacing.xs : spacing.sm,
        backgroundColor: bg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 40, alignItems: "flex-start", justifyContent: "center" }}>
          {variant === "feed" ? (
            leftSlot ?? (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{ color: colors.einsteinYellow, fontSize: 14 }}>IE</Text>
              </View>
            )
          ) : (
            <Pressable
              onPress={onBack}
              disabled={!onBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.pill,
                backgroundColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
                opacity: onBack ? 1 : 0,
              }}
            >
              <Text style={{ color: colors.white, fontSize: 20 }}>←</Text>
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs }}>
          <Text
            style={{ color: colors.white, fontSize: typography.titleMd.fontSize, textAlign: "center" }}
            weight="bold"
            numberOfLines={variant === "feed" ? 1 : 2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{ color: "rgba(255,255,255,0.70)", fontSize: typography.small.fontSize, marginTop: -2 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.pill,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {rightSlot ?? defaultRightSlot}
        </View>
      </View>
    </View>
  );
}
