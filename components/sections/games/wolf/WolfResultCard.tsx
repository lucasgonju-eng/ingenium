import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = {
  hits: number;
  xpAwarded: number;
  xpBase: number;
  xpPerformance: number;
  xpParticipationBonus: number;
  xpStreakBonus: number;
  xpTodayTotal: number;
  attemptsUsedToday: number;
  attemptsPerDay: number;
  bestAttemptHits: number;
  streakDays: number;
  percentileMessage: string;
  inspirationalMessage: string;
  onOpenTrail: () => void;
  onPlayAgain: () => void;
};

export default function WolfResultCard({
  hits,
  xpAwarded,
  xpBase,
  xpPerformance,
  xpParticipationBonus,
  xpStreakBonus,
  xpTodayTotal,
  attemptsUsedToday,
  attemptsPerDay,
  bestAttemptHits,
  streakDays,
  percentileMessage,
  inspirationalMessage,
  onOpenTrail,
  onPlayAgain,
}: Props) {
  const performanceLabel = hits >= 4 ? "Performance máxima" : hits >= 3 ? "Excelente execução" : hits >= 2 ? "Boa evolução" : "Rodada de aprendizado";

  return (
    <LinearGradient colors={["rgba(21,31,72,0.98)", "rgba(11,19,50,0.98)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyle}>
      <View style={heroRowStyle}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="semibold">
            RESULTADO DA RODADA
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: 4 }} weight="bold">
            {performanceLabel}
          </Text>
        </View>
        <View style={heroScoreBadgeStyle}>
          <Text style={{ color: colors.einsteinBlue, fontSize: typography.metricLg.fontSize }} weight="bold">
            {hits}/4
          </Text>
        </View>
      </View>

      <View style={metricsGridStyle}>
        <MetricCard label="XP ganho" value={`${xpAwarded}`} />
        <MetricCard label="XP base" value={`${xpBase}`} />
        <MetricCard label="Melhor do dia" value={`${bestAttemptHits}/4`} />
        <MetricCard label="Streak" value={`${streakDays} dias`} />
        <MetricCard label="Percentil" value={extractPercentile(percentileMessage)} />
      </View>

      <View style={xpSummaryBoxStyle}>
        <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.25 }} weight="bold">
          RESUMO CLARO DE XP
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: typography.bodyMd.lineHeight }}>
          Participação: +{xpParticipationBonus} XP · Desempenho: +{xpPerformance} XP · Streak: +{xpStreakBonus} XP
        </Text>
        <Text style={{ color: colors.textPrimary, marginTop: spacing.xs }} weight="bold">
          Total da rodada: +{xpAwarded} XP
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
          XP acumulado hoje: {xpTodayTotal} · Rodadas usadas: {attemptsUsedToday}/{attemptsPerDay}
        </Text>
      </View>

      <View style={highlightBoxStyle}>
        <Text style={{ color: colors.textSecondary, lineHeight: typography.bodyMd.lineHeight }}>{percentileMessage}</Text>
      </View>

      <View style={inspirationBoxStyle}>
        <Text style={{ color: colors.goldSoft }} weight="semibold">
          {inspirationalMessage}
        </Text>
      </View>

      <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
        <Pressable onPress={onOpenTrail} style={({ pressed }) => [primaryBtnStyle, pressed ? pressedStyle : null]}>
          <Text style={{ color: colors.einsteinBlue, fontSize: typography.bodyMd.fontSize }} weight="bold">
            Ver Trilha do Lobo
          </Text>
        </Pressable>

        <Pressable onPress={onPlayAgain} style={({ pressed }) => [secondaryBtnStyle, pressed ? pressedStyle : null]}>
          <Text style={{ color: colors.textPrimary }} weight="semibold">
            Nova tentativa
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function extractPercentile(message: string): string {
  const match = message.match(/(\d+)%/);
  if (!match) return "--";
  return `${match[1]}%`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricCardStyle}>
      <Text style={{ color: colors.textMuted, fontSize: typography.small.fontSize }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, marginTop: 2, fontSize: typography.metric.fontSize }} weight="bold">
        {value}
      </Text>
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: spacing.md,
  ...shadows.panelDepth,
};

const heroRowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: spacing.sm,
};

const heroScoreBadgeStyle = {
  minWidth: 84,
  minHeight: 84,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderGoldStrong,
  backgroundColor: colors.goldBase,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  ...shadows.glowGold,
};

const metricsGridStyle = {
  marginTop: spacing.md,
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: spacing.xs,
};

const metricCardStyle = {
  minWidth: "48%" as const,
  flexGrow: 1,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.04)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
};

const highlightBoxStyle = {
  marginTop: spacing.xs,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

const xpSummaryBoxStyle = {
  marginTop: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.08)",
  padding: spacing.sm,
};

const inspirationBoxStyle = {
  marginTop: spacing.xs,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.10)",
  padding: spacing.sm,
};

const primaryBtnStyle = {
  minHeight: 48,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.goldBase,
  ...shadows.glowGold,
};

const secondaryBtnStyle = {
  minHeight: 48,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
  borderColor: colors.borderDefault,
};

const pressedStyle = {
  transform: [{ scale: 0.988 }],
};

