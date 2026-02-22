import React from "react";
import { View } from "react-native";
import RankingItem from "./RankingItem";
import RankingTopPodium from "./RankingTopPodium";
import { Text } from "../ui/Text";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

type RankingRow = {
  user_id: string;
  position_in_olympiad: number;
  full_name: string | null;
  avatar_url: string | null;
  points_in_olympiad: number;
  lobo_class: "bronze" | "silver" | "gold" | null;
};

type Props = {
  top3: RankingRow[];
  rows: RankingRow[];
  myUserId: string | null;
};

export default function OlympiadRankingSection({ top3, rows, myUserId }: Props) {
  return (
    <View
      style={{
        marginTop: spacing.xl,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: sizes.compactCardPadding,
        ...shadows.soft,
      }}
    >
      <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
        Top do ranking
      </Text>

      <RankingTopPodium
        variant="olympiad"
        top3={top3.map((row) => ({
          position: row.position_in_olympiad,
          user_id: row.user_id,
          full_name: row.full_name,
          avatar_url: row.avatar_url,
          lobo_class: row.lobo_class,
          points: row.points_in_olympiad,
        }))}
      />

      {rows.length === 0 ? (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: typography.small.fontSize }}>
            Sem dados de ranking por enquanto.
          </Text>
        </View>
      ) : (
        rows.map((row) => (
          <View
            key={`${row.user_id}-${row.position_in_olympiad}`}
            style={{
              marginTop: spacing.sm,
              paddingVertical: spacing.md,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.08)",
            }}
          >
            <RankingItem
              position={row.position_in_olympiad}
              fullName={row.full_name}
              avatarUrl={row.avatar_url}
              loboClass={row.lobo_class}
              points={row.points_in_olympiad}
              compact
              isMe={row.user_id === myUserId}
            />
          </View>
        ))
      )}
    </View>
  );
}
