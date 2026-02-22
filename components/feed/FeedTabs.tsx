import React from "react";
import { View } from "react-native";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

export default function FeedTabs() {
  return (
    <View style={{ marginTop: spacing.xs, marginBottom: spacing.xs, flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
      <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.einsteinBlue }}>
        <Text style={{ color: "white", fontSize: typography.small.fontSize }} weight="semibold">
          Todos
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: radii.pill,
          backgroundColor: colors.surfacePanel,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          flexDirection: "row",
          gap: 4,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>🏆</Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: typography.small.fontSize }} weight="semibold">
          Destaques
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: radii.pill,
          backgroundColor: colors.surfacePanel,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          flexDirection: "row",
          gap: 4,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>📈</Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: typography.small.fontSize }} weight="semibold">
          Atividades
        </Text>
      </View>
      <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: "#22c55e" }} />
    </View>
  );
}
