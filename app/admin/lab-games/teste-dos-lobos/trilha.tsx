import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../../../components/layout/StitchScreenFrame";
import WolfTrailProgressCard from "../../../../components/sections/games/wolf/WolfTrailProgressCard";
import { computeWolfTrailProgress } from "../../../../services/games/wolfEngine";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../../components/ui/Text";

export function WolfTrailScreen({ studentMode = false }: { studentMode?: boolean }) {
  const params = useLocalSearchParams<{ xp?: string; tests?: string; avg?: string }>();
  const xp = Number(params.xp ?? 0);
  const tests = Number(params.tests ?? 0);
  const avg = Number(params.avg ?? 0);

  const progress = computeWolfTrailProgress({
    accumulatedXp: xp,
    completedTests: tests,
    averageHits: avg,
  });

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["rgba(18,28,68,0.96)", "rgba(9,16,44,0.94)"]} style={heroStyle}>
          <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="semibold">
            EVOLUÇÃO CONTÍNUA
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: spacing.xxs }} weight="bold">
            Trilha do Lobo
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
            Caminho de progressão por XP, consistência e desempenho.
          </Text>
        </LinearGradient>

        <View>
          <WolfTrailProgressCard
            currentLevel={progress.currentLevel}
            nextLevel={progress.nextLevel}
            progressPct={progress.progressPct}
            accumulatedXp={xp}
            completedTests={tests}
            averageHits={avg}
            remaining={progress.remaining}
          />
        </View>

        <View>
          <View style={footnoteStyle}>
            <Text style={{ color: colors.textSecondary, lineHeight: typography.bodyMd.lineHeight }}>
              Camada de teste interno: a interface já está preparada para refletir progresso real quando a persistência estiver ativa.
            </Text>
          </View>
        </View>

        <View>
          <Pressable
            onPress={() => router.replace(studentMode ? "/lab-games/teste-dos-lobos" : "/admin/lab-games/teste-dos-lobos")}
            style={({ pressed }) => [backButtonStyle, pressed ? { transform: [{ scale: 0.988 }] } : null]}
          >
            <Text style={{ color: colors.einsteinBlue, fontSize: typography.bodyMd.fontSize }} weight="bold">
              Voltar para teste
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}

export default function AdminWolfTrailScreen() {
  return <WolfTrailScreen />;
}

const heroStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: spacing.md,
  marginTop: spacing.xs,
};

const footnoteStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

const backButtonStyle = {
  minHeight: 48,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.goldBase,
  shadowColor: colors.goldBase,
  shadowOpacity: 0.22,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  elevation: 5,
};

