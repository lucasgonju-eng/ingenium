import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";
import type { WolfQuestion } from "../../../../types/games/wolf";

const phaseMeta = {
  reflexo: { icon: "✦", label: "Reflexo", accent: colors.phaseReflexo },
  logica: { icon: "◈", label: "Lógica", accent: colors.phaseLogica },
  conhecimento: { icon: "◎", label: "Conhecimento", accent: colors.phaseConhecimento },
  lideranca: { icon: "⛨", label: "Liderança", accent: colors.phaseLideranca },
} as const;

type Props = {
  question: WolfQuestion;
  index: number;
  total: number;
  secondsLeft: number;
  maxSeconds: number;
  selectedOptionIndex: number | null;
  onReady: () => void;
  onSelect: (index: number) => void;
};

export default function WolfQuestionCard({
  question,
  index,
  total,
  secondsLeft,
  maxSeconds,
  selectedOptionIndex,
  onReady,
  onSelect,
}: Props) {
  useEffect(() => {
    onReady();
  }, [question.id, onReady]);

  const safeMaxSeconds = Math.max(1, maxSeconds);
  const timerPct = Math.max(0, Math.min(100, (secondsLeft / safeMaxSeconds) * 100));
  const meta = phaseMeta[question.category];
  const isCritical = timerPct <= 20;
  const isAttention = timerPct > 20 && timerPct <= 45;
  const timerColor = isCritical ? "#F98B8B" : isAttention ? "#FFD978" : colors.goldBase;

  return (
    <LinearGradient colors={["rgba(22,32,74,0.98)", "rgba(12,18,52,0.96)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyle}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.xs }}>
        <View style={[phaseBadgeStyle, { borderColor: `${meta.accent}88`, backgroundColor: `${meta.accent}22` }]}>
          <Text style={{ color: meta.accent, fontSize: typography.small.fontSize }} weight="bold">
            {meta.icon}
          </Text>
          <Text style={{ color: meta.accent }} weight="semibold">
            {meta.label}
          </Text>
        </View>
        <Text style={{ color: colors.textMuted }} weight="semibold">
          {index}/{total}
        </Text>
      </View>

      <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
        <Text style={{ color: colors.textTechnical, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="semibold">
          FASE {index} • DESAFIO DE ALTO NÍVEL
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: typography.titleLg.fontSize, lineHeight: Math.round(typography.titleLg.fontSize * 1.35) }} weight="bold">
          {question.prompt}
        </Text>
      </View>

      <View style={timerWrapStyle}>
        <View style={timerTrackStyle}>
          <View style={[timerFillStyle, { width: `${timerPct}%`, backgroundColor: timerColor, shadowColor: timerColor }]} />
        </View>
        <Text style={{ color: isCritical ? colors.statusDanger : colors.textMuted, marginTop: 6, fontSize: typography.small.fontSize }}>
          Tempo restante: {secondsLeft}s
        </Text>
      </View>

      <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
        {question.options.map((option, idx) => {
          const selected = selectedOptionIndex === idx;
          const disabled = selectedOptionIndex !== null;
          return (
            <Pressable
              key={`${question.id}-opt-${idx}`}
              onPress={() => onSelect(idx)}
              disabled={disabled}
              style={({ pressed }) => [
                optionButtonStyle,
                selected ? optionSelectedStyle : null,
                disabled && !selected ? optionDisabledStyle : null,
                pressed && !disabled ? optionPressedStyle : null,
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <View style={[optionMarkerStyle, selected ? optionMarkerSelectedStyle : null]}>
                  <Text style={{ color: selected ? colors.einsteinBlue : colors.textMuted, fontSize: typography.small.fontSize }} weight="bold">
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={{ color: selected ? colors.goldSoft : colors.textPrimary, flex: 1 }} weight="semibold">
                  {option}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const cardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: spacing.md,
  ...shadows.panelDepth,
};

const phaseBadgeStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: spacing.xs,
  borderRadius: radii.pill,
  borderWidth: 1,
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
};

const timerWrapStyle = {
  marginTop: spacing.md,
};

const timerTrackStyle = {
  height: 10,
  borderRadius: radii.pill,
  backgroundColor: "rgba(255,255,255,0.10)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  overflow: "hidden" as const,
};

const timerFillStyle = {
  height: "100%" as const,
  borderRadius: radii.pill,
  shadowOpacity: 0.4,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 0 },
};

const optionButtonStyle = {
  minHeight: 56,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: "rgba(255,255,255,0.04)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  justifyContent: "center" as const,
};

const optionSelectedStyle = {
  borderColor: colors.borderGoldStrong,
  backgroundColor: "rgba(255,199,0,0.15)",
};

const optionDisabledStyle = {
  opacity: 0.62,
};

const optionPressedStyle = {
  transform: [{ scale: 0.988 }],
  backgroundColor: "rgba(255,255,255,0.08)",
};

const optionMarkerStyle = {
  width: 26,
  height: 26,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.2)",
  backgroundColor: "rgba(255,255,255,0.05)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const optionMarkerSelectedStyle = {
  borderColor: colors.borderGoldStrong,
  backgroundColor: colors.goldSoft,
};

