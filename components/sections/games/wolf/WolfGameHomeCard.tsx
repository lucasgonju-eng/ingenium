import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = {
  attemptsRemaining: number;
  streakDays: number;
  activeEvent: string | null;
  estimatedDurationMinutes: number;
  onStart: () => void;
  startDisabled?: boolean;
  disabledReason?: string | null;
};

export default function WolfGameHomeCard({
  attemptsRemaining,
  streakDays,
  activeEvent,
  estimatedDurationMinutes,
  onStart,
  startDisabled = false,
  disabledReason = null,
}: Props) {
  return (
    <LinearGradient
      colors={["rgba(21,30,70,0.98)", "rgba(12,19,52,0.96)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyle}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.4 }} weight="semibold">
            MISSÃO DIÁRIA • TRILHA DO LOBO
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: 4 }} weight="bold">
            Teste dos Lobos
          </Text>
        </View>
        <View style={heroBadgeStyle}>
          <Text style={{ color: colors.goldBase, fontSize: 18 }} weight="bold">
            ◈
          </Text>
        </View>
      </View>

      <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, lineHeight: typography.bodyMd.lineHeight }}>
        Desafio de 4 fases com progressão intelectual, precisão e consistência diária.
      </Text>

      <View style={statsGridStyle}>
        <MetricChip label="Duração" value={`${estimatedDurationMinutes} min`} />
        <MetricChip label="Fases" value="4 desafios" />
        <MetricChip label="Tentativas" value={`${attemptsRemaining} hoje`} />
        <MetricChip label="Streak" value={`${streakDays} dia(s)`} />
      </View>

      {activeEvent ? (
        <View style={eventBoxStyle}>
          <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="bold">
            EVENTO EM DESTAQUE
          </Text>
          <Text style={{ color: colors.textPrimary, marginTop: 4 }} weight="semibold">
            {activeEvent}
          </Text>
        </View>
      ) : null}

      <Pressable onPress={onStart} disabled={startDisabled} style={({ pressed }) => [startButtonStyle, startDisabled ? disabledStyle : null, pressed ? pressedStyle : null]}>
        <Text style={{ color: colors.einsteinBlue, fontSize: typography.bodyMd.fontSize }} weight="bold">
          Iniciar teste
        </Text>
      </Pressable>

      {disabledReason ? <Text style={{ color: colors.statusWarning, marginTop: spacing.xs, lineHeight: 18 }}>{disabledReason}</Text> : null}
    </LinearGradient>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricChipStyle}>
      <Text style={{ color: colors.textMuted, fontSize: typography.small.fontSize }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, marginTop: 2 }} weight="semibold">
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
  gap: spacing.sm,
  ...shadows.panelDepth,
};

const heroBadgeStyle = {
  width: 46,
  height: 46,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.10)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const statsGridStyle = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: spacing.xs,
};

const metricChipStyle = {
  flexGrow: 1,
  minWidth: "48%" as const,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.03)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
};

const eventBoxStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.12)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
};

const startButtonStyle = {
  minHeight: 50,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.goldBase,
  marginTop: spacing.xs,
  ...shadows.glowGold,
};

const disabledStyle = {
  opacity: 0.5,
};

const pressedStyle = {
  transform: [{ scale: 0.985 }],
};

