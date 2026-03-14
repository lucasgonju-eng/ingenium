import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = {
  currentLevel: string;
  nextLevel: string | null;
  progressPct: number;
  accumulatedXp: number;
  completedTests: number;
  averageHits: number;
  remaining: {
    xp: number;
    tests: number;
    averageHits: number;
  };
};

export default function WolfTrailProgressCard({
  currentLevel,
  nextLevel,
  progressPct,
  accumulatedXp,
  completedTests,
  averageHits,
  remaining,
}: Props) {
  const safePct = Math.max(0, Math.min(100, progressPct));

  return (
    <LinearGradient colors={["rgba(21,31,72,0.98)", "rgba(11,19,50,0.98)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="semibold">
            TRILHA DO LOBO
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: 4 }} weight="bold">
            {currentLevel}
          </Text>
        </View>
        <View style={progressMedalStyle}>
          <Text style={{ color: colors.einsteinBlue, fontSize: typography.metric.fontSize }} weight="bold">
            {safePct}%
          </Text>
        </View>
      </View>

      <View style={progressTrackStyle}>
        <View style={[progressFillStyle, { width: `${safePct}%` }]} />
      </View>
      <Text style={{ color: colors.textMuted, marginTop: 6 }}>{safePct}% da evolução para o próximo nível.</Text>

      <View style={metricsRowStyle}>
        <MetricPill label="XP" value={`${accumulatedXp}`} />
        <MetricPill label="Testes" value={`${completedTests}`} />
        <MetricPill label="Média" value={`${averageHits.toFixed(2)}/4`} />
      </View>

      <View style={roadmapStyle}>
        <RoadmapNode title={currentLevel} state="done" description="Nível atual consolidado" />
        {nextLevel ? (
          <RoadmapNode
            title={nextLevel}
            state="current"
            description={`Faltam ${remaining.xp} XP, ${remaining.tests} teste(s) e ${remaining.averageHits} de média`}
          />
        ) : (
          <RoadmapNode title="Mestre da Trilha" state="done" description="Topo da jornada alcançado." />
        )}
      </View>

      <View style={nextBoxStyle}>
        {nextLevel ? (
          <>
            <Text style={{ color: colors.goldSoft }} weight="semibold">
              Próximo nível: {nextLevel}
            </Text>
            <Text style={rowText}>XP restante: {remaining.xp}</Text>
            <Text style={rowText}>Testes restantes: {remaining.tests}</Text>
            <Text style={rowText}>Média restante: {remaining.averageHits}</Text>
          </>
        ) : (
          <Text style={{ color: colors.goldSoft }} weight="semibold">
            Você já alcançou o topo da Trilha do Lobo.
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricPillStyle}>
      <Text style={{ color: colors.textMuted, fontSize: typography.small.fontSize }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, marginTop: 2 }} weight="bold">
        {value}
      </Text>
    </View>
  );
}

function RoadmapNode({
  title,
  description,
  state,
}: {
  title: string;
  description: string;
  state: "done" | "current";
}) {
  return (
    <View style={roadmapNodeStyle}>
      <View style={[roadmapDotStyle, state === "current" ? roadmapDotCurrentStyle : roadmapDotDoneStyle]} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: state === "current" ? colors.goldSoft : colors.textPrimary }} weight="semibold">
          {title}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 2 }}>{description}</Text>
      </View>
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

const progressMedalStyle = {
  minWidth: 78,
  minHeight: 48,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: colors.borderGoldStrong,
  backgroundColor: colors.goldBase,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: spacing.sm,
};

const progressTrackStyle = {
  marginTop: spacing.sm,
  height: 10,
  borderRadius: radii.pill,
  backgroundColor: "rgba(255,255,255,0.12)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  overflow: "hidden" as const,
};

const progressFillStyle = {
  height: "100%" as const,
  backgroundColor: colors.goldBase,
  shadowColor: colors.goldBase,
  shadowOpacity: 0.35,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 0 },
};

const metricsRowStyle = {
  marginTop: spacing.sm,
  flexDirection: "row" as const,
  gap: spacing.xs,
};

const metricPillStyle = {
  flex: 1,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.04)",
  paddingHorizontal: spacing.xs,
  paddingVertical: spacing.xs,
};

const roadmapStyle = {
  marginTop: spacing.md,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
  gap: spacing.sm,
};

const roadmapNodeStyle = {
  flexDirection: "row" as const,
  alignItems: "flex-start" as const,
  gap: spacing.xs,
};

const roadmapDotStyle = {
  marginTop: 4,
  width: 12,
  height: 12,
  borderRadius: radii.pill,
  borderWidth: 1,
};

const roadmapDotDoneStyle = {
  borderColor: "rgba(255,255,255,0.20)",
  backgroundColor: "rgba(255,255,255,0.24)",
};

const roadmapDotCurrentStyle = {
  borderColor: colors.borderGoldStrong,
  backgroundColor: colors.goldBase,
};

const nextBoxStyle = {
  marginTop: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.10)",
  padding: spacing.sm,
  gap: 6,
};

const rowText = {
  color: colors.textSecondary,
};

