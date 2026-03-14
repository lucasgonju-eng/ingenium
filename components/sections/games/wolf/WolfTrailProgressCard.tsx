import { View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
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
  return (
    <View style={cardStyle}>
      <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
        Trilha do Lobo
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4 }}>
        Nível atual: <Text style={{ color: colors.einsteinYellow }}>{currentLevel}</Text>
      </Text>

      <View
        style={{
          marginTop: spacing.sm,
          height: 10,
          borderRadius: radii.pill,
          backgroundColor: "rgba(255,255,255,0.12)",
          overflow: "hidden",
        }}
      >
        <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, progressPct))}%`, backgroundColor: colors.einsteinYellow }} />
      </View>
      <Text style={{ color: "rgba(255,255,255,0.70)", marginTop: 6 }}>{progressPct}% da evolução para o próximo nível.</Text>

      <View style={{ marginTop: spacing.sm, gap: 6 }}>
        <Text style={rowText}>XP acumulado: {accumulatedXp}</Text>
        <Text style={rowText}>Testes concluídos: {completedTests}</Text>
        <Text style={rowText}>Média de desempenho: {averageHits.toFixed(2)}/4</Text>
      </View>

      <View style={nextBoxStyle}>
        {nextLevel ? (
          <>
            <Text style={{ color: colors.einsteinYellow }} weight="semibold">
              Próximo nível: {nextLevel}
            </Text>
            <Text style={rowText}>XP restante: {remaining.xp}</Text>
            <Text style={rowText}>Testes restantes: {remaining.tests}</Text>
            <Text style={rowText}>Média restante: {remaining.averageHits}</Text>
          </>
        ) : (
          <Text style={{ color: colors.einsteinYellow }} weight="semibold">
            Você já alcançou o topo da Trilha do Lobo.
          </Text>
        )}
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

const nextBoxStyle = {
  marginTop: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.04)",
  padding: spacing.sm,
  gap: 6,
};

const rowText = {
  color: "rgba(255,255,255,0.84)",
};

