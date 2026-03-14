import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import StitchScreenFrame from "../../../../components/layout/StitchScreenFrame";
import WolfResultCard from "../../../../components/sections/games/wolf/WolfResultCard";
import StitchHeader from "../../../../components/ui/StitchHeader";
import { Text } from "../../../../components/ui/Text";
import { buildWolfPercentileSnapshot } from "../../../../services/games/wolfEngine";
import { colors, radii, spacing } from "../../../../lib/theme/tokens";

export default function AdminWolfResultScreen() {
  const params = useLocalSearchParams<{
    hits?: string;
    xpAwarded?: string;
    bestAttemptHits?: string;
    streakDays?: string;
    grade?: string;
    inspiration?: string;
  }>();

  const hits = Number(params.hits ?? 0);
  const xpAwarded = Number(params.xpAwarded ?? 0);
  const bestAttemptHits = Number(params.bestAttemptHits ?? hits);
  const streakDays = Number(params.streakDays ?? 0);
  const grade = params.grade ?? "8º Ano";
  const inspiration = params.inspiration ?? "A consistência fortalece a mente.";

  const percentileSnapshot = buildWolfPercentileSnapshot({
    percentile: 74,
    seriesLabel: grade,
    sampleSize: 34,
  });

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Resultado" subtitle="Teste dos Lobos • modo admin" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          <WolfResultCard
            hits={hits}
            xpAwarded={xpAwarded}
            bestAttemptHits={bestAttemptHits}
            streakDays={streakDays}
            percentileMessage={percentileSnapshot.message}
            inspirationalMessage={inspiration}
            onOpenTrail={() => {
              router.push({
                pathname: "/admin/lab-games/teste-dos-lobos/trilha",
                params: {
                  xp: String(420),
                  tests: String(18),
                  avg: String(2.9),
                },
              });
            }}
            onPlayAgain={() => {
              router.replace({
                pathname: "/admin/lab-games/teste-dos-lobos",
                params: { grade },
              });
            }}
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
            <Text style={{ color: "rgba(255,255,255,0.78)", lineHeight: 20 }}>
              Competição anônima ativa: não exibimos nomes de adversários, apenas percentil por série.
            </Text>
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}

