import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import WolfGameHomeCard from "../../components/sections/games/wolf/WolfGameHomeCard";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { wolfAttemptsConfig } from "../../content/games/wolf-config";
import { fetchWolfAttemptGateRpc, fetchWolfWeeklyRankingStudentRpc, WolfAttemptGateSnapshot, WolfWeeklyRankingRow } from "../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import { canStartWolfAttempt } from "../../services/games/wolfEngine";

export default function LabGamesTabScreen() {
  const [loading, setLoading] = useState(true);
  const [gate, setGate] = useState<WolfAttemptGateSnapshot | null>(null);
  const [weeklyRankingRows, setWeeklyRankingRows] = useState<WolfWeeklyRankingRow[]>([]);
  const [weeklyRankingLoading, setWeeklyRankingLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadGate() {
      try {
        setLoading(true);
        const [snapshot, rankingRows] = await Promise.all([
          fetchWolfAttemptGateRpc(),
          fetchWolfWeeklyRankingStudentRpc(5).catch(() => []),
        ]);
        if (!mounted) return;
        setGate(snapshot);
        setWeeklyRankingRows(rankingRows);
      } catch {
        if (!mounted) return;
        setGate(null);
        setWeeklyRankingRows([]);
      } finally {
        if (mounted) {
          setLoading(false);
          setWeeklyRankingLoading(false);
        }
      }
    }
    void loadGate();
    return () => {
      mounted = false;
    };
  }, []);

  const attemptsPerDay = gate?.attempts_per_day_effective ?? wolfAttemptsConfig.attemptsPerDay;
  const attemptsUsedToday = gate?.attempts_used_today ?? 0;
  const latestAttemptFinishedAtIso = gate?.latest_attempt_finished_at ?? null;
  const cooldownMinutes = gate?.cooldown_minutes ?? wolfAttemptsConfig.cooldownMinutes;

  const attemptGate = useMemo(
    () =>
      canStartWolfAttempt({
        attemptsUsedToday,
        attemptsPerDay,
        cooldownMinutes,
        nowIso: new Date().toISOString(),
        latestAttemptFinishedAtIso,
      }),
    [attemptsUsedToday, attemptsPerDay, cooldownMinutes, latestAttemptFinishedAtIso],
  );
  const weeklyTopFiveRows = useMemo(() => weeklyRankingRows.filter((row) => row.is_public).slice(0, 5), [weeklyRankingRows]);
  const myPrivateRankRow = useMemo(
    () => weeklyRankingRows.find((row) => row.is_current_user && !row.is_public) ?? null,
    [weeklyRankingRows],
  );

  return (
    <StitchScreenFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        <StitchHeader title="Lab Games" />

        <View style={{ paddingHorizontal: spacing.md }}>
          <Text style={{ color: colors.white }}>
            Acesse os jogos publicados para alunos. Seu progresso e XP seguem as mesmas regras oficiais.
          </Text>
        </View>

        <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
          <View
            style={{
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: spacing.md,
            }}
          >
            <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="bold">
              TRILHA DO LOBO • RANKING DA SEMANA
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4 }}>
              Regras oficiais: top 5 com nome e demais posições sem identificação.
            </Text>
            {weeklyRankingLoading ? (
              <View style={{ marginTop: spacing.sm, alignItems: "center" }}>
                <ActivityIndicator color={colors.einsteinYellow} />
              </View>
            ) : (
              <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                {weeklyTopFiveRows.length === 0 ? (
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    Ainda sem pontuação registrada nesta semana.
                  </Text>
                ) : (
                  weeklyTopFiveRows.map((row) => (
                    <View
                      key={`tab-lab-rank-${row.rank}-${row.user_id}`}
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.borderSoft,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.xs,
                      }}
                    >
                      <Text style={{ color: colors.einsteinYellow }} weight="bold">#{row.rank}</Text>
                      <Text style={{ color: colors.white, flex: 1 }} numberOfLines={1} weight="semibold">
                        {row.full_name ?? "Aluno"}
                      </Text>
                      <Text style={{ color: colors.einsteinYellow }} weight="bold">
                        {row.weekly_xp.toLocaleString("pt-BR")} XP
                      </Text>
                    </View>
                  ))
                )}
                {myPrivateRankRow ? (
                  <View
                    style={{
                      marginTop: spacing.xs,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: "rgba(255,199,0,0.35)",
                      backgroundColor: "rgba(255,199,0,0.10)",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: typography.small.fontSize }} weight="semibold">
                      Sua posição (somente você vê)
                    </Text>
                    <Text style={{ color: colors.white, marginTop: 2 }} weight="bold">
                      #{myPrivateRankRow.rank} • {myPrivateRankRow.weekly_xp.toLocaleString("pt-BR")} XP
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => router.push("/lab-games/teste-dos-lobos/trilha")}
                  style={({ pressed }) => [
                    {
                      marginTop: spacing.xs,
                      minHeight: 44,
                      borderRadius: radii.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.einsteinYellow,
                    },
                    pressed ? { transform: [{ scale: 0.988 }] } : null,
                  ]}
                >
                  <Text style={{ color: colors.einsteinBlue }} weight="bold">Abrir Trilha do Lobo</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.md }}>
          {loading ? (
            <View
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={colors.einsteinYellow} />
              <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs }}>
                Carregando seu limite diário...
              </Text>
            </View>
          ) : (
            <WolfGameHomeCard
              attemptsRemaining={attemptGate.attemptsRemaining}
              streakDays={0}
              activeEvent={gate?.is_plan_pro ? "Perfil Pro ativo: até 8 rodadas por dia" : "Perfil Free: até 4 rodadas por dia"}
              estimatedDurationMinutes={3}
              startDisabled={!attemptGate.canStart}
              disabledReason={attemptGate.reason}
              onStart={() => router.push("/lab-games/teste-dos-lobos")}
            />
          )}
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
