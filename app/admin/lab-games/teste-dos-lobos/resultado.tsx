import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ScrollView, View } from "react-native";
import StitchScreenFrame from "../../../../components/layout/StitchScreenFrame";
import WolfResultCard from "../../../../components/sections/games/wolf/WolfResultCard";
import { Text } from "../../../../components/ui/Text";
import { useWolfSfx } from "../../../../hooks/games/useWolfSfx";
import { buildWolfPercentileSnapshot } from "../../../../services/games/wolfEngine";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";

export default function AdminWolfResultScreen() {
  const sfx = useWolfSfx();
  const params = useLocalSearchParams<{
    hits?: string;
    xpAwarded?: string;
    xpBase?: string;
    xpPerformance?: string;
    xpParticipationBonus?: string;
    xpStreakBonus?: string;
    xpTodayTotal?: string;
    attemptsUsedToday?: string;
    attemptsPerDay?: string;
    bestAttemptHits?: string;
    streakDays?: string;
    grade?: string;
    inspiration?: string;
  }>();

  const hits = Number(params.hits ?? 0);
  const xpAwarded = Number(params.xpAwarded ?? 0);
  const xpBase = Number(params.xpBase ?? 0);
  const xpPerformance = Number(params.xpPerformance ?? 0);
  const xpParticipationBonus = Number(params.xpParticipationBonus ?? 0);
  const xpStreakBonus = Number(params.xpStreakBonus ?? 0);
  const xpTodayTotal = Number(params.xpTodayTotal ?? xpAwarded);
  const attemptsUsedToday = Number(params.attemptsUsedToday ?? 1);
  const attemptsPerDay = Number(params.attemptsPerDay ?? 4);
  const bestAttemptHits = Number(params.bestAttemptHits ?? hits);
  const streakDays = Number(params.streakDays ?? 0);
  const grade = params.grade ?? "8º Ano";
  const inspiration = params.inspiration ?? "A consistência fortalece a mente.";

  const percentileSnapshot = buildWolfPercentileSnapshot({
    percentile: 74,
    seriesLabel: grade,
    sampleSize: 34,
  });

  useEffect(() => {
    void sfx.preload();
    void sfx.play("result");
  }, [sfx]);

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["rgba(18,28,68,0.96)", "rgba(9,16,44,0.94)"]} style={heroStyle}>
          <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="semibold">
            ENCERRAMENTO DA MISSÃO
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: spacing.xxs }} weight="bold">
            Resultado • Teste dos Lobos
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
            Série validada nesta rodada: {grade}
          </Text>
        </LinearGradient>

        <View>
          <WolfResultCard
            hits={hits}
            xpAwarded={xpAwarded}
            xpBase={xpBase}
            xpPerformance={xpPerformance}
            xpParticipationBonus={xpParticipationBonus}
            xpStreakBonus={xpStreakBonus}
            xpTodayTotal={xpTodayTotal}
            attemptsUsedToday={attemptsUsedToday}
            attemptsPerDay={attemptsPerDay}
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

        <View>
          <View style={footnoteStyle}>
            <Text style={{ color: "rgba(255,255,255,0.78)", lineHeight: 20 }}>
              Competição anônima ativa: não exibimos nomes de adversários, apenas percentil por série.
            </Text>
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
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

