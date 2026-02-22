import React, { useMemo } from "react";
import { View } from "react-native";
import AvatarWithFallback from "../ui/AvatarWithFallback";
import { Text } from "../ui/Text";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

type PodiumVariant = "olympiad" | "geral";

type PodiumEntry = {
  position: number;
  user_id?: string;
  full_name: string | null;
  avatar_url?: string | null;
  lobo_class?: string | null;
  points?: number | null;
  avg_points?: number | null;
  olympiads_count?: number | null;
};

type Props = {
  top3: PodiumEntry[];
  variant: PodiumVariant;
};

function formatLobo(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "gold") return "Lobo de Ouro";
  if (normalized === "silver") return "Lobo de Prata";
  if (normalized === "bronze") return "Lobo de Bronze";
  if (!normalized) return "-";
  return `Lobo ${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function fmtAvg(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

export default function RankingTopPodium({ top3, variant }: Props) {
  const byPos = useMemo(() => {
    const map = new Map<number, PodiumEntry>();
    for (const entry of top3) map.set(entry.position, entry);
    return {
      first: map.get(1),
      second: map.get(2),
      third: map.get(3),
    };
  }, [top3]);

  const PodiumCard = ({
    entry,
    size,
    label,
  }: {
    entry?: PodiumEntry;
    size: number;
    label: "1o" | "2o" | "3o";
  }) => {
    const isFirst = label === "1o";

    if (!entry) {
      return (
        <View
          style={{
            flex: 1,
            borderRadius: radii.md,
            backgroundColor: colors.surfacePanel,
            padding: spacing.sm,
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.6,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            minHeight: size + spacing.xl + spacing.sm,
            ...shadows.soft,
          }}
        >
          <Text style={{ color: colors.white, opacity: 0.6, fontWeight: "700" }}>{label}</Text>
          <Text style={{ color: colors.white, opacity: 0.5, marginTop: spacing.xs }}>-</Text>
        </View>
      );
    }

    const metric =
      variant === "olympiad"
        ? `${entry.points ?? 0} pts`
        : `Media ${fmtAvg(entry.avg_points)} • ${entry.olympiads_count ?? 0}`;

    const borderColor = label === "1o" ? "#FFC700" : "#00006622";

    return (
      <View
        style={{
          flex: 1,
          borderRadius: radii.lg,
          backgroundColor: isFirst ? "#FFC70024" : colors.surfacePanel,
          padding: sizes.cardPadding,
          paddingVertical: isFirst ? spacing.xl : sizes.cardPadding,
          alignItems: "center",
          borderWidth: 2,
          borderColor,
          minHeight: isFirst ? 200 : size + spacing.xl + spacing.sm,
          ...(isFirst ? shadows.hero : shadows.soft),
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.92)", fontWeight: "900" }}>{label}</Text>

        <View style={{ marginTop: spacing.sm }}>
          <AvatarWithFallback fullName={entry.full_name ?? "?"} avatarUrl={entry.avatar_url} size={size} />
        </View>

        <Text
          numberOfLines={1}
          style={{
            marginTop: spacing.sm,
            color: "rgba(255,255,255,0.92)",
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          {entry.full_name ?? "Sem nome"}
        </Text>

        <Text
          numberOfLines={1}
          style={{
            marginTop: 3,
            color: "rgba(255,255,255,0.70)",
            fontSize: typography.small.fontSize,
            textAlign: "center",
          }}
        >
          {formatLobo(entry.lobo_class)}
        </Text>

        <Text
          numberOfLines={1}
          style={{
            marginTop: spacing.xs,
            color: "rgba(255,255,255,0.92)",
            fontWeight: "800",
            fontSize: typography.small.fontSize,
          }}
        >
          {metric}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={{ color: colors.white, fontWeight: "900", fontSize: typography.metric.fontSize }}>
        Podio
      </Text>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
        <PodiumCard entry={byPos.second} size={42} label="2o" />
        <PodiumCard entry={byPos.first} size={42 + spacing.sm + spacing.xs} label="1o" />
        <PodiumCard entry={byPos.third} size={42} label="3o" />
      </View>
    </View>
  );
}
