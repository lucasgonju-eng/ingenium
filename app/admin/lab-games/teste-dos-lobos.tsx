import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../../components/layout/StitchScreenFrame";
import WolfGameHomeCard from "../../../components/sections/games/wolf/WolfGameHomeCard";
import WolfCelebration from "../../../components/sections/games/wolf/WolfCelebration";
import WolfQuestionCard from "../../../components/sections/games/wolf/WolfQuestionCard";
import { Text } from "../../../components/ui/Text";
import { wolfAttemptsConfig, wolfInspirationalMessages, wolfTimersByBand } from "../../../content/games/wolf-config";
import { useWolfSession } from "../../../hooks/games/useWolfSession";
import { useWolfSfx } from "../../../hooks/games/useWolfSfx";
import { buildWolfQuestionSetFromBankWithFallback } from "../../../services/games/wolfQuestionBankService";
import { canStartWolfAttempt } from "../../../services/games/wolfEngine";
import { supabase } from "../../../lib/supabase/client";
import { fetchMyAccessRole } from "../../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import type { WolfGrade, WolfPhaseCategory } from "../../../types/games/wolf";

const DEFAULT_GRADE: WolfGrade = "8º Ano";
type GradePreference = "random" | WolfGrade;
const WOLF_GRADES: WolfGrade[] = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"];

const PHASE_LABEL: Record<WolfPhaseCategory, string> = {
  reflexo: "Reflexo",
  logica: "Lógica",
  conhecimento: "Conhecimento",
  lideranca: "Liderança",
};
const USE_NATIVE_DRIVER = Platform.OS !== "web";

function coerceWolfGrade(raw: unknown, fallback: WolfGrade): WolfGrade {
  if (typeof raw !== "string") return fallback;
  const normalized = raw.trim();
  if (WOLF_GRADES.includes(normalized as WolfGrade)) return normalized as WolfGrade;
  return fallback;
}

function pickRandomGrade(): WolfGrade {
  const idx = Math.floor(Math.random() * WOLF_GRADES.length);
  return WOLF_GRADES[idx] ?? DEFAULT_GRADE;
}

export default function AdminWolfGameScreen() {
  const params = useLocalSearchParams<{ grade?: string }>();
  const [guardLoading, setGuardLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [attemptsUsedToday, setAttemptsUsedToday] = useState(0);
  const [bestAttemptHits, setBestAttemptHits] = useState(0);
  const [streakDays, setStreakDays] = useState(4);
  const [selectedGradePreference, setSelectedGradePreference] = useState<GradePreference>("random");
  const [comboStreak, setComboStreak] = useState(0);
  const [isPhaseTransitioning, setIsPhaseTransitioning] = useState(false);
  const [nextPhaseLabel, setNextPhaseLabel] = useState<string | null>(null);
  const sfx = useWolfSfx();
  const countdownPulse = useRef(new Animated.Value(1)).current;
  const feedbackEnter = useRef(new Animated.Value(0)).current;
  const comboPulse = useRef(new Animated.Value(1)).current;
  const transitionAnim = useRef(new Animated.Value(0)).current;

  const grade = coerceWolfGrade(params.grade, DEFAULT_GRADE);
  const session = useWolfSession({
    grade,
    streakDays,
    xpAlreadyAwardedToday: 0,
    buildQuestions: async (targetGrade) => {
      const runSessionKey = `wolf-${Date.now()}-${targetGrade}`;
      return buildWolfQuestionSetFromBankWithFallback({
        grade: targetGrade,
        sessionKey: runSessionKey,
      });
    },
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

  useEffect(() => {
    void sfx.preload();
  }, [sfx]);

  useEffect(() => {
    if (session.stage !== "countdown") {
      countdownPulse.stopAnimation();
      countdownPulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(countdownPulse, {
          toValue: 1.08,
          duration: 320,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(countdownPulse, {
          toValue: 1,
          duration: 320,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [session.stage, countdownPulse]);

  useEffect(() => {
    if (session.stage !== "feedback") {
      feedbackEnter.stopAnimation();
      feedbackEnter.setValue(0);
      return;
    }

    feedbackEnter.setValue(0);
    Animated.spring(feedbackEnter, {
      toValue: 1,
      friction: 7,
      tension: 120,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [session.stage, session.phaseIndex, feedbackEnter]);

  useEffect(() => {
    if (!session.answers.length) {
      setComboStreak(0);
      return;
    }
    const last = session.answers[session.answers.length - 1];
    if (!last) return;

    if (last.isCorrect) {
      setComboStreak((prev) => {
        const next = prev + 1;
        comboPulse.stopAnimation();
        comboPulse.setValue(0.86);
        Animated.spring(comboPulse, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start();

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        void sfx.play(next >= 2 ? "combo" : "success");
        return next;
      });
      return;
    }

    setComboStreak(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    void sfx.play("error");
  }, [session.answers, comboPulse, sfx]);

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
        grade: session.activeGrade,
        inspiration: message,
      },
    });
  }, [session.stage]);

  function handleGoNext() {
    const isLastQuestion = session.phaseIndex + 1 >= session.questions.length;
    if (isLastQuestion) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      session.goNext();
      return;
    }

    const upcoming = session.questions[session.phaseIndex + 1];
    if (!upcoming) {
      session.goNext();
      return;
    }

    setNextPhaseLabel(PHASE_LABEL[upcoming.category]);
    setIsPhaseTransitioning(true);
    void sfx.play("transition");
    transitionAnim.stopAnimation();
    transitionAnim.setValue(0);
    Animated.sequence([
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.delay(260),
      Animated.timing(transitionAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      setIsPhaseTransitioning(false);
      setNextPhaseLabel(null);
      session.goNext();
    });
  }

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
      <ScrollView contentContainerStyle={screenContentStyle} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["rgba(17,28,67,0.96)", "rgba(8,16,43,0.92)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={heroSectionStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.35 }} weight="semibold">
                LAB GAMES • ÁREA ESPECIAL
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: spacing.xxs }} weight="bold">
                Teste dos Lobos
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: typography.bodyMd.lineHeight }}>
                Ambiente premium de validação interna com banco de questões, progressão e desafios por série.
              </Text>
            </View>
            <View style={heroMonogramStyle}>
              <Text style={{ color: colors.goldBase, fontSize: 22 }} weight="bold">
                ◈
              </Text>
            </View>
          </View>

          <View style={heroChipRowStyle}>
            <View style={heroMetaChipStyle}>
              <Text style={heroMetaChipTextStyle} weight="semibold">
                Modo admin
              </Text>
            </View>
            <View style={heroMetaChipStyle}>
              <Text style={heroMetaChipTextStyle} weight="semibold">
                Fonte: {session.questionSource === "bank" ? "Banco" : session.questionSource === "mock" ? "Fallback" : "Preparando"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={contentStackStyle}>
          {session.stage === "home" && session.questionError ? (
            <View style={errorCardStyle}>
              <Text style={{ color: "#fecaca", fontSize: typography.small.fontSize }} weight="bold">
                Não foi possível preparar o teste
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>{session.questionError}</Text>
            </View>
          ) : null}

          {session.stage === "home" && session.questionLoading ? (
            <LinearGradient colors={["rgba(255,199,0,0.18)", "rgba(255,199,0,0.08)"]} style={loadingCardStyle}>
              <ActivityIndicator color={colors.einsteinYellow} />
              <Text style={{ color: colors.textPrimary, marginTop: spacing.xs }}>
                Carregando fases do banco para a série {session.activeGrade}...
              </Text>
            </LinearGradient>
          ) : null}

          {session.stage === "home" ? (
            <LinearGradient colors={["rgba(17,27,66,0.96)", "rgba(12,19,52,0.95)"]} style={seriesPickerCardStyle}>
              <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="bold">
                CONTROLE DE SÉRIE (ADMIN)
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                Selecione uma série fixa ou mantenha em aleatório para validar o grau de dificuldade completo.
              </Text>
              <View style={seriesPickerRowStyle}>
                <Pressable
                  onPress={() => setSelectedGradePreference("random")}
                  style={({ pressed }) => [
                    seriesChipStyle,
                    selectedGradePreference === "random" ? seriesChipActiveStyle : seriesChipInactiveStyle,
                    pressed ? chipPressedStyle : null,
                  ]}
                >
                  <Text style={selectedGradePreference === "random" ? seriesChipActiveTextStyle : seriesChipInactiveTextStyle} weight="bold">
                    Aleatória
                  </Text>
                </Pressable>
                {WOLF_GRADES.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setSelectedGradePreference(item)}
                    style={({ pressed }) => [
                      seriesChipStyle,
                      selectedGradePreference === item ? seriesChipActiveStyle : seriesChipInactiveStyle,
                      pressed ? chipPressedStyle : null,
                    ]}
                  >
                    <Text style={selectedGradePreference === item ? seriesChipActiveTextStyle : seriesChipInactiveTextStyle} weight="bold">
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </LinearGradient>
          ) : null}

          {session.stage === "home" ? (
            <WolfGameHomeCard
              attemptsRemaining={attemptGate.attemptsRemaining}
              streakDays={streakDays}
              activeEvent="Semana da Lógica Estruturada"
              estimatedDurationMinutes={3}
              startDisabled={!attemptGate.canStart || session.questionLoading}
              disabledReason={attemptGate.reason}
              onStart={() => {
                const runGrade = selectedGradePreference === "random" ? pickRandomGrade() : selectedGradePreference;
                void session.startSession({ grade: runGrade });
              }}
            />
          ) : null}

          {session.stage === "countdown" ? (
            <LinearGradient colors={["rgba(20,30,70,0.96)", "rgba(10,16,45,0.96)"]} style={countdownCardStyle}>
              <Text style={{ color: colors.textTechnical }} weight="semibold">
                Ritual de preparação mental
              </Text>
              <Animated.View style={[countdownOrbStyle, { transform: [{ scale: countdownPulse }] }]}>
                <Text style={{ color: colors.goldSoft, fontSize: 78 }} weight="bold">
                  {session.countdown}
                </Text>
              </Animated.View>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center", lineHeight: typography.bodyMd.lineHeight }}>
                Respire fundo. O cronômetro inicia quando a questão estiver pronta para leitura.
              </Text>
            </LinearGradient>
          ) : null}

          {session.stage === "question" && session.currentQuestion ? (
            <>
              <View style={adminMetaCardStyle}>
                <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.25 }} weight="bold">
                  CAMADA ADMIN • TESTE INTERNO
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                  Série da rodada: {session.activeGrade} • Série da questão do banco: {session.currentQuestion.grade}
                </Text>
                <Text style={{ color: colors.textMuted, marginTop: 2 }}>
                  Fase atual: {PHASE_LABEL[session.currentQuestion.category]} • Fonte: {session.questionSource === "bank" ? "Banco" : "Fallback mock"}
                </Text>
              </View>
              <Animated.View
                style={[
                  comboHudStyle,
                  comboStreak >= 2 ? comboHudActiveStyle : null,
                  { transform: [{ scale: comboPulse }] },
                ]}
              >
                <Text style={{ color: comboStreak >= 2 ? colors.goldSoft : colors.textTechnical, fontSize: typography.small.fontSize }} weight="semibold">
                  Combo de precisão
                </Text>
                <Text style={{ color: colors.textPrimary, marginTop: 2 }} weight="bold">
                  {comboStreak >= 2 ? `🔥 ${comboStreak} acertos seguidos` : "Construa sequência de acertos para entrar em ritmo"}
                </Text>
              </Animated.View>
              <WolfQuestionCard
                question={session.currentQuestion}
                index={session.phaseIndex + 1}
                total={session.questions.length}
                secondsLeft={session.secondsLeft}
                maxSeconds={currentMaxSeconds}
                selectedOptionIndex={session.selectedOptionIndex}
                onReady={session.markQuestionReady}
                onSelect={(idx) => {
                  void Haptics.selectionAsync().catch(() => {});
                  session.registerAnswer(idx);
                }}
              />
            </>
          ) : null}

          {session.stage === "feedback" && session.currentQuestion ? (
            <Animated.View
              style={{
                opacity: feedbackEnter,
                transform: [
                  {
                    translateY: feedbackEnter.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: feedbackEnter.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              }}
            >
              <LinearGradient colors={["rgba(20,30,70,0.98)", "rgba(11,18,50,0.98)"]} style={feedbackCardStyle}>
                {(() => {
                  const answeredCorrect = session.selectedOptionIndex === session.currentQuestion.correctOptionIndex;
                  const correctAnswer = session.currentQuestion.options[session.currentQuestion.correctOptionIndex];
                  return (
                    <>
                      <View style={[feedbackBadgeStyle, answeredCorrect ? feedbackBadgeCorrectStyle : feedbackBadgeNeutralStyle]}>
                        <Text style={{ color: answeredCorrect ? "#E4FDEB" : colors.textSecondary }} weight="semibold">
                          {answeredCorrect ? "Resposta validada com excelência" : "Resposta registrada"}
                        </Text>
                      </View>

                      <Text
                        style={{
                          color: answeredCorrect ? colors.statusSuccess : colors.textPrimary,
                          fontSize: typography.titleMd.fontSize,
                          marginTop: spacing.sm,
                        }}
                        weight="bold"
                      >
                        {answeredCorrect ? "Acerto confirmado" : "Boa tentativa, continue evoluindo"}
                      </Text>

                      <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: typography.bodyMd.lineHeight }}>
                        {session.currentQuestion.explanation}
                      </Text>

                      {answeredCorrect ? (
                        <WolfCelebration answerText={correctAnswer} />
                      ) : (
                        <View style={correctAnswerBoxStyle}>
                          <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize }} weight="semibold">
                            Resposta correta
                          </Text>
                          <Text style={{ color: colors.textPrimary, marginTop: 2 }} weight="bold">
                            {correctAnswer}
                          </Text>
                        </View>
                      )}
                    </>
                  );
                })()}

                <Pressable onPress={handleGoNext} disabled={isPhaseTransitioning} style={({ pressed }) => [nextButtonStyle, isPhaseTransitioning ? nextButtonDisabledStyle : null, pressed ? { transform: [{ scale: 0.988 }] } : null]}>
                  <Text style={{ color: colors.einsteinBlue, fontSize: typography.bodyMd.fontSize }} weight="bold">
                    {isPhaseTransitioning
                      ? "Abrindo próxima fase..."
                      : session.phaseIndex + 1 >= session.questions.length
                        ? "Ver resultado premium"
                        : "Seguir para próxima fase"}
                  </Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
      {isPhaseTransitioning && nextPhaseLabel ? (
        <Animated.View
          pointerEvents="none"
          style={[
            phaseTransitionOverlayStyle,
            {
              opacity: transitionAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              phaseTransitionCardStyle,
              {
                transform: [
                  {
                    scale: transitionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.35 }} weight="bold">
              PRÓXIMA FASE
            </Text>
            <Text style={{ color: colors.textPrimary, marginTop: spacing.xs, fontSize: typography.titleMd.fontSize }} weight="bold">
              {nextPhaseLabel}
            </Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </StitchScreenFrame>
  );
}

const blockedCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: colors.surfaceGlass,
  padding: spacing.md,
};

const screenContentStyle = {
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xxxl,
  gap: spacing.sm,
};

const contentStackStyle = {
  gap: spacing.sm,
};

const heroSectionStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: spacing.md,
  shadowColor: "#020617",
  shadowOpacity: 0.3,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 7,
};

const heroMonogramStyle = {
  width: 52,
  height: 52,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: colors.borderGoldStrong,
  backgroundColor: "rgba(255,199,0,0.12)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const heroChipRowStyle = {
  marginTop: spacing.sm,
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: spacing.xs,
};

const heroMetaChipStyle = {
  minHeight: 30,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.18)",
  backgroundColor: "rgba(255,255,255,0.05)",
  paddingHorizontal: spacing.sm,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const heroMetaChipTextStyle = {
  color: colors.textTechnical,
  fontSize: typography.small.fontSize,
};

const countdownCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  padding: spacing.lg,
  minHeight: 280,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const countdownOrbStyle = {
  minWidth: 170,
  minHeight: 170,
  marginTop: spacing.xs,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "rgba(255,199,0,0.45)",
  backgroundColor: "rgba(255,199,0,0.10)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: colors.goldBase,
  shadowOpacity: 0.25,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 },
};

const feedbackCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: spacing.md,
};

const loadingCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  padding: spacing.md,
  alignItems: "center" as const,
};

const errorCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: "rgba(248,113,113,0.46)",
  backgroundColor: colors.statusDangerBg,
  padding: spacing.md,
};

const seriesPickerCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: spacing.md,
};

const seriesPickerRowStyle = {
  marginTop: spacing.sm,
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: spacing.xs,
};

const seriesChipStyle = {
  borderRadius: 999,
  borderWidth: 1,
  minHeight: 44,
  paddingHorizontal: spacing.sm,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const seriesChipActiveStyle = {
  borderColor: colors.borderGoldStrong,
  backgroundColor: "rgba(255,199,0,0.20)",
};

const seriesChipInactiveStyle = {
  borderColor: "rgba(255,255,255,0.18)",
  backgroundColor: "rgba(255,255,255,0.05)",
};

const chipPressedStyle = {
  transform: [{ scale: 0.98 }],
};

const seriesChipActiveTextStyle = {
  color: colors.goldSoft,
  fontSize: typography.small.fontSize,
};

const seriesChipInactiveTextStyle = {
  color: colors.textPrimary,
  fontSize: typography.small.fontSize,
};

const adminMetaCardStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.10)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
};

const comboHudStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.18)",
  backgroundColor: "rgba(255,255,255,0.05)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
};

const comboHudActiveStyle = {
  borderColor: colors.borderGoldStrong,
  backgroundColor: "rgba(255,199,0,0.12)",
};

const feedbackBadgeStyle = {
  minHeight: 30,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.sm,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  alignSelf: "flex-start" as const,
  borderWidth: 1,
};

const feedbackBadgeCorrectStyle = {
  borderColor: "rgba(139,231,175,0.62)",
  backgroundColor: "rgba(34,197,94,0.16)",
};

const feedbackBadgeNeutralStyle = {
  borderColor: "rgba(255,255,255,0.20)",
  backgroundColor: "rgba(255,255,255,0.08)",
};

const correctAnswerBoxStyle = {
  marginTop: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.10)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
};

const nextButtonStyle = {
  marginTop: spacing.md,
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

const nextButtonDisabledStyle = {
  opacity: 0.78,
};

const phaseTransitionOverlayStyle = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: "rgba(2,6,23,0.44)",
};

const phaseTransitionCardStyle = {
  minWidth: 240,
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderGoldStrong,
  backgroundColor: "rgba(11,18,50,0.94)",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: colors.goldBase,
  shadowOpacity: 0.26,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
};

