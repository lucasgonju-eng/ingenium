import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import AvatarWithFallback from "../ui/AvatarWithFallback";
import { Text } from "../ui/Text";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type LoboClass = "bronze" | "silver" | "gold" | string | null | undefined;

type RankingItemProps = {
  position: number;
  fullName: string | null | undefined;
  avatarUrl?: string | null;
  loboClass?: LoboClass;
  points?: number | null;
  avgPoints?: number | null;
  olympiadsCount?: number | null;
  rightLabel?: string;
  onPress?: () => void;
  compact?: boolean;
  highlight?: boolean;
  isMe?: boolean;
};

function formatLobo(label?: LoboClass) {
  const value = (label ?? "").toString().toLowerCase();
  if (value === "gold") return "Lobo de Ouro";
  if (value === "silver") return "Lobo de Prata";
  if (value === "bronze") return "Lobo de Bronze";
  if (!value) return "-";
  return `Lobo ${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatAvg(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value.toFixed(2);
}

export default function RankingItem({
  position,
  fullName,
  avatarUrl,
  loboClass,
  points,
  avgPoints,
  olympiadsCount,
  rightLabel,
  onPress,
  compact = false,
  highlight,
  isMe = false,
}: RankingItemProps) {
  const isTop3 = position <= 3;
  const shouldHighlight = highlight ?? isTop3;
  const isMine = Boolean(isMe);
  const size = compact ? 34 : 40;

  const subtitle = useMemo(() => {
    if (avgPoints !== null && avgPoints !== undefined) {
      const avg = formatAvg(avgPoints);
      const count = olympiadsCount ?? 0;
      return `${formatLobo(loboClass)} • Média ${avg ?? "-"} • ${count} olimpíada(s)`;
    }

    if (points !== null && points !== undefined) {
      return `${formatLobo(loboClass)} • ${points} pts`;
    }

    return formatLobo(loboClass);
  }, [avgPoints, olympiadsCount, loboClass, points]);

  const rightText = useMemo(() => {
    if (rightLabel) return rightLabel;

    if (avgPoints !== null && avgPoints !== undefined) {
      const avg = formatAvg(avgPoints);
      return avg ? `${avg}` : "-";
    }

    if (points !== null && points !== undefined) return `${points}`;

    return "";
  }, [rightLabel, avgPoints, points]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: compact ? spacing.sm : spacing.md,
          paddingHorizontal: spacing.sm,
          borderRadius: radii.lg,
          backgroundColor: isMine ? "#FFC7001A" : colors.surfaceCard,
          opacity: pressed ? 0.9 : 1,
          borderWidth: isMine ? 1 : shouldHighlight ? 1 : 0,
          borderColor: isMine ? "#FFC70066" : shouldHighlight ? colors.einsteinYellow : "transparent",
        },
      ]}
    >
      <View style={{ width: 32, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 14, color: colors.white, fontWeight: "700" }}>{position}</Text>
      </View>

      <AvatarWithFallback fullName={fullName ?? "?"} avatarUrl={avatarUrl} size={size} />

      <View style={{ flex: 1, marginLeft: spacing.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.white,
              fontSize: compact ? 14 : typography.titleMd.fontSize - 3,
              fontWeight: typography.titleMd.fontWeight,
              flexShrink: 1,
            }}
          >
            {fullName ?? "Sem nome"}
          </Text>

          {isMine ? (
            <View
              style={{
                marginLeft: spacing.xs,
                paddingHorizontal: spacing.xs,
                paddingVertical: 2,
                borderRadius: radii.pill,
                backgroundColor: colors.einsteinBlue,
              }}
            >
              <Text style={{ color: colors.einsteinYellow, fontWeight: "800", fontSize: 11 }}>Voce</Text>
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={{
            color: "rgba(255,255,255,0.86)",
            opacity: typography.subtitle.opacity,
            fontSize: compact ? typography.small.fontSize : typography.subtitle.fontSize,
            marginTop: 2,
          }}
        >
          {subtitle}
        </Text>
      </View>

      {rightText ? (
        <View style={{ marginLeft: spacing.xs, alignItems: "flex-end" }}>
          <Text style={{ color: colors.einsteinYellow, fontWeight: typography.metric.fontWeight, fontSize: 14 }}>
            {rightText}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", opacity: typography.small.opacity, fontSize: 11, marginTop: 2 }}>
            {avgPoints !== null && avgPoints !== undefined ? "média" : "pts"}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
