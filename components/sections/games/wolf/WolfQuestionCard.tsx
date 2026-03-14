import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";
import type { WolfQuestion } from "../../../../types/games/wolf";

const phaseMeta = {
  reflexo: { icon: "⚡", label: "Reflexo" },
  logica: { icon: "🧩", label: "Lógica" },
  conhecimento: { icon: "🌍", label: "Conhecimento" },
  lideranca: { icon: "🛡️", label: "Liderança" },
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

  return (
    <View style={cardStyle}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.xs }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: "rgba(255,199,0,0.40)",
            backgroundColor: "rgba(255,199,0,0.10)",
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: colors.einsteinYellow }}>{meta.icon}</Text>
          <Text style={{ color: colors.einsteinYellow }} weight="semibold">
            {meta.label}
          </Text>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.75)" }} weight="semibold">
          {index}/{total}
        </Text>
      </View>

      <View style={{ marginTop: spacing.sm }}>
        <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize, lineHeight: 26 }} weight="bold">
          {question.prompt}
        </Text>
      </View>

      <View
        style={{
          marginTop: spacing.sm,
          height: 8,
          borderRadius: radii.pill,
          backgroundColor: "rgba(255,255,255,0.14)",
          overflow: "hidden",
        }}
      >
        <View style={{ height: "100%", width: `${timerPct}%`, backgroundColor: colors.einsteinYellow }} />
      </View>
      <Text style={{ color: "rgba(255,255,255,0.70)", marginTop: 6, fontSize: 12 }}>Tempo restante: {secondsLeft}s</Text>

      <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
        {question.options.map((option, idx) => {
          const selected = selectedOptionIndex === idx;
          return (
            <Pressable
              key={`${question.id}-opt-${idx}`}
              onPress={() => onSelect(idx)}
              disabled={selectedOptionIndex !== null}
              style={{
                minHeight: 50,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: selected ? "rgba(255,199,0,0.65)" : colors.borderSoft,
                backgroundColor: selected ? "rgba(255,199,0,0.16)" : "rgba(255,255,255,0.04)",
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.sm,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: selected ? colors.einsteinYellow : colors.white }} weight="semibold">
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

