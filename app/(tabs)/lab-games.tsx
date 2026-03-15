import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import WolfGameHomeCard from "../../components/sections/games/wolf/WolfGameHomeCard";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { wolfAttemptsConfig } from "../../content/games/wolf-config";
import { fetchWolfAttemptGateRpc, WolfAttemptGateSnapshot } from "../../lib/supabase/queries";
import { colors, radii, spacing } from "../../lib/theme/tokens";
import { canStartWolfAttempt } from "../../services/games/wolfEngine";

export default function LabGamesTabScreen() {
  const [loading, setLoading] = useState(true);
  const [gate, setGate] = useState<WolfAttemptGateSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadGate() {
      try {
        setLoading(true);
        const snapshot = await fetchWolfAttemptGateRpc();
        if (!mounted) return;
        setGate(snapshot);
      } catch {
        if (!mounted) return;
        setGate(null);
      } finally {
        if (mounted) setLoading(false);
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
