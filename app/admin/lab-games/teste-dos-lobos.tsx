import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import StitchScreenFrame from "../../../components/layout/StitchScreenFrame";
import WolfGameHomeCard from "../../../components/sections/games/wolf/WolfGameHomeCard";
import WolfCelebration from "../../../components/sections/games/wolf/WolfCelebration";
import WolfQuestionCard from "../../../components/sections/games/wolf/WolfQuestionCard";
import { Text } from "../../../components/ui/Text";
import { wolfAttemptsConfig, wolfInspirationalMessages } from "../../../content/games/wolf-config";
import { useWolfSession } from "../../../hooks/games/useWolfSession";
import { useWolfSfx } from "../../../hooks/games/useWolfSfx";
import { buildWolfQuestionSetFromBankWithFallback } from "../../../services/games/wolfQuestionBankService";
import { canStartWolfAttempt } from "../../../services/games/wolfEngine";
import { supabase } from "../../../lib/supabase/client";
import { fetchMyAccessRole, fetchWolfAttemptGateRpc, fetchWolfWeeklyRankingStudentRpc, upsertWolfAttemptResultRpc, WolfWeeklyRankingRow } from "../../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import type { WolfGrade, WolfPhaseCategory } from "../../../types/games/wolf";

const DEFAULT_GRADE: WolfGrade = "8º Ano";
type GradePreference = "random" | WolfGrade;
const WOLF_GRADES: WolfGrade[] = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"];
const ADMIN_TIME_BUFFER_SECONDS = 5;
const WOLF_RULES_SEEN_KEY_PREFIX = "wolf_rules_seen_v1";

const PHASE_LABEL: Record<WolfPhaseCategory, string> = {
  reflexo: "Reflexo",
  logica: "Lógica",
  conhecimento: "Conhecimento",
  lideranca: "Liderança",
};
const USE_NATIVE_DRIVER = Platform.OS !== "web";
const ENABLE_MOTION = Platform.OS !== "web";

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

export function WolfGameScreen({ studentMode = false }: { studentMode?: boolean }) {
  const params = useLocalSearchParams<{ grade?: string }>();
  const [guardLoading, setGuardLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [attemptsUsedToday, setAttemptsUsedToday] = useState(0);
  const [xpAwardedToday, setXpAwardedToday] = useState(0);
  const [attemptsPerDayEffective, setAttemptsPerDayEffective] = useState(wolfAttemptsConfig.attemptsPerDay);
  const [latestAttemptFinishedAtIso, setLatestAttemptFinishedAtIso] = useState<string | null>(null);
  const [bestAttemptHits, setBestAttemptHits] = useState(0);
  const [streakDays, setStreakDays] = useState(4);
  const [selectedGradePreference, setSelectedGradePreference] = useState<GradePreference>("random");
  const [comboStreak, setComboStreak] = useState(0);
  const [isPhaseTransitioning, setIsPhaseTransitioning] = useState(false);
  const [nextPhaseLabel, setNextPhaseLabel] = useState<string | null>(null);
  const [rulesLoading, setRulesLoading] = useState(studentMode);
  const [rulesSeen, setRulesSeen] = useState(!studentMode);
  const [rulesStorageKey, setRulesStorageKey] = useState<string | null>(null);
  const [weeklyRankingRows, setWeeklyRankingRows] = useState<WolfWeeklyRankingRow[]>([]);
  const [weeklyRankingLoading, setWeeklyRankingLoading] = useState(studentMode);
  const sfx = useWolfSfx();
  const countdownPulse = useRef(new Animated.Value(1)).current;
  const feedbackEnter = useRef(new Animated.Value(0)).current;
  const comboPulse = useRef(new Animated.Value(1)).current;
  const transitionAnim = useRef(new Animated.Value(0)).current;

  const grade = coerceWolfGrade(params.grade, DEFAULT_GRADE);
  const session = useWolfSession({
    grade,
    streakDays,
    xpAlreadyAwardedToday: xpAwardedToday,
    timeBufferSeconds: ADMIN_TIME_BUFFER_SECONDS,
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
    async function loadGateSnapshot() {
      try {
        const gate = await fetchWolfAttemptGateRpc();
        if (!mounted || !gate) return;
        setAttemptsUsedToday(gate.attempts_used_today);
        setAttemptsPerDayEffective(gate.attempts_per_day_effective);
        setLatestAttemptFinishedAtIso(gate.latest_attempt_finished_at);
      } catch {
        // fallback local para ambiente sem migração aplicada
      }
    }
    async function loadWeeklyRanking() {
      if (!studentMode) return;
      setWeeklyRankingLoading(true);
      try {
        const rows = await fetchWolfWeeklyRankingStudentRpc(5);
        if (!mounted) return;
        setWeeklyRankingRows(rows);
      } catch {
        if (mounted) setWeeklyRankingRows([]);
      } finally {
        if (mounted) setWeeklyRankingLoading(false);
      }
    }
    async function guard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/admin/login");
          return;
        }
        if (!mounted) return;
        if (!studentMode) {
          const role = await fetchMyAccessRole();
          if (role !== "admin") {
            setAllowed(false);
            return;
          }
        }
        setAllowed(true);
        if (studentMode) {
          const storageKey = `${WOLF_RULES_SEEN_KEY_PREFIX}:${user.id}`;
          setRulesStorageKey(storageKey);
          setRulesLoading(true);
          try {
            const seen = await AsyncStorage.getItem(storageKey);
            if (!mounted) return;
            setRulesSeen(seen === "1");
          } catch {
            if (mounted) setRulesSeen(false);
          } finally {
            if (mounted) setRulesLoading(false);
          }
        } else if (mounted) {
          setRulesSeen(true);
          setRulesLoading(false);
        }
        await loadGateSnapshot();
        await loadWeeklyRanking();
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
  }, [studentMode]);

  useEffect(() => {
    void sfx.preload();
  }, [sfx]);

  useEffect(() => {
    if (session.stage !== "countdown") {
      countdownPulse.stopAnimation();
      countdownPulse.setValue(1);
      return;
    }
    if (!ENABLE_MOTION) {
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

    if (!ENABLE_MOTION) {
      feedbackEnter.setValue(1);
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
        if (ENABLE_MOTION) {
          comboPulse.setValue(0.86);
          Animated.spring(comboPulse, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start();
        } else {
          comboPulse.setValue(1);
        }

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
        attemptsPerDay: attemptsPerDayEffective,
        cooldownMinutes: wolfAttemptsConfig.cooldownMinutes,
        nowIso: new Date().toISOString(),
        latestAttemptFinishedAtIso,
      }),
    [attemptsUsedToday, attemptsPerDayEffective, latestAttemptFinishedAtIso],
  );

  const currentMaxSeconds = session.currentQuestionTimeLimit;
  const weeklyTopFiveRows = useMemo(() => weeklyRankingRows.filter((row) => row.is_public).slice(0, 5), [weeklyRankingRows]);
  const myPrivateRankRow = useMemo(
    () => weeklyRankingRows.find((row) => row.is_current_user && !row.is_public) ?? null,
    [weeklyRankingRows],
  );

  useEffect(() => {
    if (session.stage !== "completed") return;
    let mounted = true;
    async function finalizeAttempt() {
    const finalHits = session.hits;
    const nextAttemptsUsedToday = attemptsUsedToday + 1;
    const nextXpAwardedToday = xpAwardedToday + session.xpAwarded;
    const nextStreakDays = streakDays + 1;
    setBestAttemptHits((prev) => Math.max(prev, finalHits));
    setAttemptsUsedToday(nextAttemptsUsedToday);
    setXpAwardedToday(nextXpAwardedToday);
    setStreakDays(nextStreakDays);
    setLatestAttemptFinishedAtIso(new Date().toISOString());

    const message = wolfInspirationalMessages[finalHits % wolfInspirationalMessages.length] ?? wolfInspirationalMessages[0];
    try {
      await upsertWolfAttemptResultRpc({
        attemptNumber: nextAttemptsUsedToday,
        hits: finalHits,
        xpBase: session.xpBase,
        xpStreakBonus: session.xpStreakBonus,
        xpAwarded: session.xpAwarded,
        metadata: {
          grade: session.activeGrade,
          source: session.questionSource ?? "mock",
        },
      });
      const gate = await fetchWolfAttemptGateRpc();
      if (mounted && gate) {
        setAttemptsUsedToday(gate.attempts_used_today);
        setAttemptsPerDayEffective(gate.attempts_per_day_effective);
        setLatestAttemptFinishedAtIso(gate.latest_attempt_finished_at);
      }
    } catch {
      // mantém fallback local para ambiente sem RPC/migração.
    }

    router.replace({
      pathname: studentMode ? "/lab-games/teste-dos-lobos/resultado" : "/admin/lab-games/teste-dos-lobos/resultado",
      params: {
        hits: String(finalHits),
        xpAwarded: String(session.xpAwarded),
        xpBase: String(session.xpBase),
        xpPerformance: String(session.xpPerformance),
        xpParticipationBonus: String(session.xpParticipationBonus),
        xpStreakBonus: String(session.xpStreakBonus),
        xpTodayTotal: String(nextXpAwardedToday),
        attemptsUsedToday: String(nextAttemptsUsedToday),
        attemptsPerDay: String(attemptsPerDayEffective),
        bestAttemptHits: String(Math.max(bestAttemptHits, finalHits)),
        streakDays: String(nextStreakDays),
        grade: session.activeGrade,
        inspiration: message,
        mode: studentMode ? "student" : "admin",
      },
    });
    }
    void finalizeAttempt();
    return () => {
      mounted = false;
    };
  }, [session.stage, attemptsUsedToday, xpAwardedToday, streakDays, bestAttemptHits, attemptsPerDayEffective, session.hits, session.xpAwarded, session.xpBase, session.xpPerformance, session.xpParticipationBonus, session.xpStreakBonus, session.activeGrade, session.questionSource, studentMode]);

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
    if (!ENABLE_MOTION) {
      transitionAnim.setValue(0);
      setIsPhaseTransitioning(false);
      setNextPhaseLabel(null);
      session.goNext();
      return;
    }
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

  async function handleAcceptRules() {
    try {
      if (rulesStorageKey) {
        await AsyncStorage.setItem(rulesStorageKey, "1");
      }
    } catch {
      // Em caso de falha de persistência local, libera o acesso na sessão atual.
    } finally {
      setRulesSeen(true);
    }
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

  if (studentMode && (rulesLoading || !rulesSeen)) {
    return (
      <StitchScreenFrame>
        <ScrollView contentContainerStyle={screenContentStyle} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["rgba(17,28,67,0.96)", "rgba(8,16,43,0.94)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={heroSectionStyle}>
            <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.35 }} weight="semibold">
              LAB GAMES • REGRAS OFICIAIS
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: spacing.xxs }} weight="bold">
              Teste dos Lobos
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: typography.bodyMd.lineHeight }}>
              Leia as regras antes da primeira rodada. Esta tela aparece somente no primeiro acesso.
            </Text>
          </LinearGradient>

          <View style={rulesCardStyle}>
            <Text style={{ color: colors.textPrimary }} weight="bold">
              Regras rápidas
            </Text>
            <Text style={rulesItemStyle}>1) O teste tem 4 fases fixas.</Text>
            <Text style={rulesItemStyle}>2) Você recebe XP por participação, desempenho e streak.</Text>
            <Text style={rulesItemStyle}>3) Limite diário: 4 rodadas (Plano Pro: 8 rodadas).</Text>
            <Text style={rulesItemStyle}>4) Há competição anônima por percentil da sua série.</Text>
            <Text style={rulesItemStyle}>5) Responda com atenção: cada fase tem tempo limitado.</Text>
          </View>

          {rulesLoading ? (
            <View style={rulesLoadingBoxStyle}>
              <ActivityIndicator color={colors.einsteinYellow} />
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                Preparando seu acesso...
              </Text>
            </View>
          ) : (
            <Pressable onPress={() => void handleAcceptRules()} style={({ pressed }) => [acceptRulesButtonStyle, pressed ? { transform: [{ scale: 0.988 }] } : null]}>
              <Text style={{ color: colors.einsteinBlue, fontSize: typography.bodyMd.fontSize }} weight="bold">
                Entendi, começar o teste
              </Text>
            </Pressable>
          )}
        </ScrollView>
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
                {studentMode ? "LAB GAMES • TRILHA DO LOBO" : "LAB GAMES • ÁREA ESPECIAL"}
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.headingLg.fontSize, marginTop: spacing.xxs }} weight="bold">
                Teste dos Lobos
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: typography.bodyMd.lineHeight }}>
                {studentMode
                  ? "Desafio diário com 4 fases, progressão intelectual e competição anônima por percentil."
                  : "Ambiente premium de validação interna com banco de questões, progressão e desafios por série."}
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
                {studentMode ? "Modo aluno" : "Modo admin"}
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

          {session.stage === "home" && !studentMode ? (
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
            <>
              {studentMode ? (
                <LinearGradient colors={["rgba(17,27,66,0.96)", "rgba(12,19,52,0.95)"]} style={weeklyRankingCardStyle}>
                  <Text style={{ color: colors.goldSoft, fontSize: typography.small.fontSize, letterSpacing: 0.3 }} weight="bold">
                    RANKING DA SEMANA
                  </Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                    Exibimos apenas os 5 primeiros colocados para proteger os demais alunos.
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
                          <View key={`weekly-rank-${row.rank}-${row.user_id}`} style={weeklyRankingRowStyle}>
                            <Text style={{ color: colors.goldSoft }} weight="bold">
                              #{row.rank}
                            </Text>
                            <Text style={{ color: colors.textPrimary, flex: 1 }} numberOfLines={1} weight="semibold">
                              {row.full_name ?? "Aluno"}
                            </Text>
                            <Text style={{ color: colors.einsteinYellow }} weight="bold">
                              {row.weekly_xp.toLocaleString("pt-BR")} XP
                            </Text>
                          </View>
                        ))
                      )}

                      {myPrivateRankRow ? (
                        <View style={myPrivateRankBoxStyle}>
                          <Text style={{ color: colors.textTechnical, fontSize: typography.small.fontSize }} weight="semibold">
                            Sua posição (visível só para você)
                          </Text>
                          <Text style={{ color: colors.textPrimary, marginTop: 2 }} weight="bold">
                            #{myPrivateRankRow.rank} • {myPrivateRankRow.weekly_xp.toLocaleString("pt-BR")} XP
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </LinearGradient>
              ) : null}

              <WolfGameHomeCard
                attemptsRemaining={attemptGate.attemptsRemaining}
                streakDays={streakDays}
                activeEvent="Semana da Lógica Estruturada"
                estimatedDurationMinutes={3}
                startDisabled={!attemptGate.canStart || session.questionLoading}
                disabledReason={attemptGate.reason}
                onStart={() => {
                  const runGrade = studentMode ? grade : selectedGradePreference === "random" ? pickRandomGrade() : selectedGradePreference;
                  void session.startSession({ grade: runGrade });
                }}
              />
            </>
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
              {!studentMode ? (
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
                  <Text style={{ color: colors.textMuted, marginTop: 2 }}>
                    Tempo calibrado: {currentMaxSeconds}s (texto + dificuldade + {ADMIN_TIME_BUFFER_SECONDS}s admin)
                  </Text>
                </View>
              ) : null}
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

export default function AdminWolfGameScreen() {
  return <WolfGameScreen />;
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

const rulesCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: colors.surfaceCard,
  padding: spacing.md,
  gap: spacing.xs,
};

const rulesItemStyle = {
  color: colors.textSecondary,
  lineHeight: typography.bodyMd.lineHeight,
};

const rulesLoadingBoxStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.md,
  alignItems: "center" as const,
};

const acceptRulesButtonStyle = {
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

const weeklyRankingCardStyle = {
  borderRadius: radii.xl,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  padding: spacing.md,
};

const weeklyRankingRowStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.04)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: spacing.xs,
};

const myPrivateRankBoxStyle = {
  marginTop: spacing.xs,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderGoldSoft,
  backgroundColor: "rgba(255,199,0,0.10)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
};

