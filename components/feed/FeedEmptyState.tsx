import React from "react";
import { View } from "react-native";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

export default function FeedEmptyState() {
  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: sizes.cardPadding,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
        Nenhum post ainda
      </Text>
      <Text
        style={{
          color: "rgba(255,255,255,0.65)",
          fontSize: typography.subtitle.fontSize,
          textAlign: "center",
          marginTop: spacing.xs,
        }}
      >
        Seja o primeiro a compartilhar uma conquista da sua liga.
      </Text>
    </View>
  );
}
