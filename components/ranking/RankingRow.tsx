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

function getTone(loboClass: "bronze" | "silver" | "gold") {
  if (loboClass === "gold") {
    return {
      borderColor: "rgba(255,199,0,0.45)",
      backgroundColor: "rgba(255,199,0,0.08)",
    };
  }
  if (loboClass === "silver") {
    return {
      borderColor: "rgba(183,198,214,0.45)",
      backgroundColor: "rgba(183,198,214,0.08)",
    };
  }
  return {
    borderColor: "rgba(190,122,62,0.35)",
    backgroundColor: "rgba(190,122,62,0.07)",
  };
}

export default function RankingRow({
  position,
  userId,
  fullName,
  avatarUrl,
  loboClass,
  totalPoints,
  isMe,
}: Props) {
  const tone = getTone(loboClass);
  return (
    <View
      key={`${userId}-${position}`}
      style={{
        marginHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: isMe ? colors.borderStrong : tone.borderColor,
        backgroundColor: isMe ? colors.surfaceCard : tone.backgroundColor,
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
