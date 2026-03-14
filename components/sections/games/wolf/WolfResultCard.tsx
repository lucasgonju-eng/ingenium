import { Pressable, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = {
  hits: number;
  xpAwarded: number;
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
  bestAttemptHits,
  streakDays,
  percentileMessage,
  inspirationalMessage,
  onOpenTrail,
  onPlayAgain,
}: Props) {
  return (
    <View style={cardStyle}>
      <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
        Resultado do dia
      </Text>

      <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
        <Text style={rowText}>Acertos: {hits}/4</Text>
        <Text style={rowText}>XP ganho: {xpAwarded}</Text>
        <Text style={rowText}>Melhor tentativa do dia: {bestAttemptHits}/4</Text>
        <Text style={rowText}>Streak atual: {streakDays} dia(s)</Text>
      </View>

      <View style={highlightBoxStyle}>
        <Text style={{ color: "rgba(255,255,255,0.86)", lineHeight: 20 }}>{percentileMessage}</Text>
      </View>

      <View style={highlightBoxStyle}>
        <Text style={{ color: colors.einsteinYellow }} weight="semibold">
          {inspirationalMessage}
        </Text>
      </View>

      <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
        <Pressable onPress={onOpenTrail} style={[btnStyle, { backgroundColor: colors.einsteinYellow }]}>
          <Text style={{ color: colors.einsteinBlue }} weight="bold">
            Ver Trilha do Lobo
          </Text>
        </Pressable>
        <Pressable
          onPress={onPlayAgain}
          style={[btnStyle, { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: colors.borderSoft }]}
        >
          <Text style={{ color: colors.white }} weight="semibold">
            Nova tentativa
          </Text>
        </Pressable>
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

const highlightBoxStyle = {
  marginTop: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.04)",
  padding: spacing.sm,
};

const rowText = {
  color: "rgba(255,255,255,0.86)",
};

const btnStyle = {
  flex: 1,
  minHeight: 44,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: spacing.xs,
};

