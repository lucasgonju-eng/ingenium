import React from "react";
import { View } from "react-native";
import { Text } from "../ui/Text";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

type MyRank = {
  position: number;
  points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  none_count: number;
} | null;

type Props = {
  myRank: MyRank;
};

export default function OlympiadMyPositionCard({ myRank }: Props) {
  return (
    <View
      style={{
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: sizes.compactCardPadding,
        ...shadows.soft,
      }}
    >
      <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
        Minha posição
      </Text>
      {myRank ? (
        <>
          <Text style={{ color: "white", marginTop: spacing.xs, fontSize: typography.metric.fontSize }} weight="bold">
            #{myRank.position} • {myRank.points} pts
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
            Gold {myRank.gold_count} • Silver {myRank.silver_count} • Bronze {myRank.bronze_count} • None{" "}
            {myRank.none_count}
          </Text>
        </>
      ) : (
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
          Você ainda não tem resultado registrado nessa olimpíada.
        </Text>
      )}
    </View>
  );
}
