import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../../../components/layout/StitchScreenFrame";
import WolfTrailProgressCard from "../../../../components/sections/games/wolf/WolfTrailProgressCard";
import StitchHeader from "../../../../components/ui/StitchHeader";
import { computeWolfTrailProgress } from "../../../../services/games/wolfEngine";
import { colors, radii, spacing } from "../../../../lib/theme/tokens";
import { Text } from "../../../../components/ui/Text";

export default function AdminWolfTrailScreen() {
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
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Trilha do Lobo" subtitle="Progressão híbrida por XP + consistência" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
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

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          <View
            style={{
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: "rgba(255,255,255,0.03)",
              padding: spacing.sm,
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.82)", lineHeight: 20 }}>
              Esta visualização já está preparada para refletir progresso real quando a persistência Supabase estiver ativa.
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          <Pressable
            onPress={() => router.replace("/admin/lab-games/teste-dos-lobos")}
            style={{
              minHeight: 44,
              borderRadius: radii.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.einsteinYellow,
            }}
          >
            <Text style={{ color: colors.einsteinBlue }} weight="bold">
              Voltar para teste
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}

