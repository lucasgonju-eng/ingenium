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
  totalPoints: number;
  isMe: boolean;
};

export default function RankingRow({
  position,
  userId,
  fullName,
  avatarUrl,
  loboClass,
  totalPoints,
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
        points={totalPoints}
        rightLabel={totalPoints.toLocaleString("pt-BR")}
        isMe={isMe}
      />
    </View>
  );
}
