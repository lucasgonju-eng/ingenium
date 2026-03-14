import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../../components/layout/StitchScreenFrame";
import WolfGameHomeCard from "../../../components/sections/games/wolf/WolfGameHomeCard";
import WolfQuestionCard from "../../../components/sections/games/wolf/WolfQuestionCard";
import StitchHeader from "../../../components/ui/StitchHeader";
import { Text } from "../../../components/ui/Text";
import { wolfAttemptsConfig, wolfInspirationalMessages, wolfTimersByBand } from "../../../content/games/wolf-config";
import { useWolfSession } from "../../../hooks/games/useWolfSession";
import { canStartWolfAttempt } from "../../../services/games/wolfEngine";
import { supabase } from "../../../lib/supabase/client";
import { fetchMyAccessRole } from "../../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import type { WolfGrade } from "../../../types/games/wolf";

const DEFAULT_GRADE: WolfGrade = "8º Ano";

export default function AdminWolfGameScreen() {
  const params = useLocalSearchParams<{ grade?: string }>();
  const [guardLoading, setGuardLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [attemptsUsedToday, setAttemptsUsedToday] = useState(0);
  const [bestAttemptHits, setBestAttemptHits] = useState(0);
  const [streakDays, setStreakDays] = useState(4);

  const grade = (params.grade as WolfGrade | undefined) ?? DEFAULT_GRADE;
  const session = useWolfSession({
    grade,
    streakDays,
    xpAlreadyAwardedToday: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function guard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/admin/login");
          return;
        }
        const role = await fetchMyAccessRole();
        if (!mounted) return;
        if (role !== "admin") {
          setAllowed(false);
          return;
        }
        setAllowed(true);
      } catch {
        if (mounted) setAllowed(false);
      } finally {
        if (mounted) setGuardLoading(false);
      }
    }
    void guard();
    return () => {
      mounted = false;
    };
  }, []);

  const attemptGate = useMemo(
    () =>
      canStartWolfAttempt({
        attemptsUsedToday,
        attemptsPerDay: wolfAttemptsConfig.attemptsPerDay,
        cooldownMinutes: wolfAttemptsConfig.cooldownMinutes,
        nowIso: new Date().toISOString(),
        latestAttemptFinishedAtIso: null,
      }),
    [attemptsUsedToday],
  );

  const currentMaxSeconds = useMemo(() => {
    if (!session.currentQuestion) return 0;
    return wolfTimersByBand[session.currentQuestion.band][session.currentQuestion.category];
  }, [session.currentQuestion]);

  useEffect(() => {
    if (session.stage !== "completed") return;
    const finalHits = session.hits;
    setBestAttemptHits((prev) => Math.max(prev, finalHits));
    setAttemptsUsedToday((prev) => prev + 1);
    setStreakDays((prev) => prev + 1);

    const message = wolfInspirationalMessages[finalHits % wolfInspirationalMessages.length] ?? wolfInspirationalMessages[0];

    router.replace({
      pathname: "/admin/lab-games/teste-dos-lobos/resultado",
      params: {
        hits: String(finalHits),
        xpAwarded: String(session.xpAwarded),
        bestAttemptHits: String(Math.max(bestAttemptHits, finalHits)),
        streakDays: String(streakDays + 1),
        grade,
        inspiration: message,
      },
    });
  }, [session.stage]);

  if (guardLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.einsteinYellow} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <StitchScreenFrame>
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <View style={blockedCardStyle}>
            <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
              Acesso restrito
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, lineHeight: 20 }}>
              Esta área de testes é exclusiva do administrador.
            </Text>
          </View>
        </View>
      </StitchScreenFrame>
    );
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Lab Games" subtitle="Teste interno • Teste dos Lobos" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm, gap: spacing.sm }}>
          {session.stage === "home" ? (
            <WolfGameHomeCard
              attemptsRemaining={attemptGate.attemptsRemaining}
              streakDays={streakDays}
              activeEvent="Semana da Lógica"
              estimatedDurationMinutes={3}
              startDisabled={!attemptGate.canStart}
              disabledReason={attemptGate.reason}
              onStart={() => {
                session.startSession();
              }}
            />
          ) : null}

          {session.stage === "countdown" ? (
            <View style={countdownCardStyle}>
              <Text style={{ color: "rgba(255,255,255,0.75)" }} weight="semibold">
                Preparar...
              </Text>
              <Text style={{ color: colors.einsteinYellow, fontSize: 72, marginTop: spacing.xs }} weight="bold">
                {session.countdown}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs }}>
                O tempo só começa quando a questão estiver pronta para leitura.
              </Text>
            </View>
          ) : null}

          {session.stage === "question" && session.currentQuestion ? (
            <WolfQuestionCard
              question={session.currentQuestion}
              index={session.phaseIndex + 1}
              total={session.questions.length}
              secondsLeft={session.secondsLeft}
              maxSeconds={currentMaxSeconds}
              selectedOptionIndex={session.selectedOptionIndex}
              onReady={session.markQuestionReady}
              onSelect={session.registerAnswer}
            />
          ) : null}

          {session.stage === "feedback" && session.currentQuestion ? (
            <View style={feedbackCardStyle}>
              <Text
                style={{
                  color:
                    session.selectedOptionIndex === session.currentQuestion.correctOptionIndex
                      ? colors.einsteinYellow
                      : "rgba(255,255,255,0.88)",
                  fontSize: typography.titleMd.fontSize,
                }}
                weight="bold"
              >
                {session.selectedOptionIndex === session.currentQuestion.correctOptionIndex ? "Resposta correta" : "Resposta registrada"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.80)", marginTop: spacing.xs, lineHeight: 20 }}>
                {session.currentQuestion.explanation}
              </Text>

              <Pressable onPress={session.goNext} style={nextButtonStyle}>
                <Text style={{ color: colors.einsteinBlue }} weight="bold">
                  {session.phaseIndex + 1 >= session.questions.length ? "Ver resultado" : "Próxima fase"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}

const blockedCardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

const countdownCardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: "rgba(255,199,0,0.44)",
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
  minHeight: 220,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const feedbackCardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

const nextButtonStyle = {
  marginTop: spacing.md,
  minHeight: 44,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.einsteinYellow,
};

