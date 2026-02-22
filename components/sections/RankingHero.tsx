import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../ui/Text";
import { colors, radii, shadows, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  onRefresh: () => void;
};

export default function RankingHero({ onRefresh }: Props) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: typography.subtitle.fontSize }}>Ranking ao vivo</Text>
          <Text style={{ color: "white", fontSize: typography.titleLg.fontSize }} weight="bold">
            Leaderboard Geral
          </Text>
        </View>
        <Pressable
          onPress={onRefresh}
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: radii.pill,
            backgroundColor: colors.einsteinBlue,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="semibold">
            Atualizar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
