import React from "react";
import { View } from "react-native";
import RankingItem from "../sections/RankingItem";
import { colors, radii, shadows, spacing } from "../../lib/theme/tokens";

type Props = {
  position: number;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  loboClass: "bronze" | "silver" | "gold";
  avgPoints: number;
  olympiadsCount: number;
  isMe: boolean;
};

export default function RankingRow({
  position,
  userId,
  fullName,
  avatarUrl,
  loboClass,
  avgPoints,
  olympiadsCount,
  isMe,
}: Props) {
  return (
    <View
      key={`${userId}-${position}`}
      style={{
        marginHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: spacing.sm,
        ...shadows.soft,
      }}
    >
      <RankingItem
        position={position}
        fullName={fullName}
        avatarUrl={avatarUrl}
        loboClass={loboClass}
        avgPoints={avgPoints}
        olympiadsCount={olympiadsCount}
        rightLabel={avgPoints.toFixed(2)}
        isMe={isMe}
      />
    </View>
  );
}
