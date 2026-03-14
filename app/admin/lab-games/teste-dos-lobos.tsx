import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../../components/layout/StitchScreenFrame";
import WolfGameHomeCard from "../../../components/sections/games/wolf/WolfGameHomeCard";
import WolfQuestionCard from "../../../components/sections/games/wolf/WolfQuestionCard";
import { Text } from "../../../components/ui/Text";
import { getWolfBandByGrade, wolfAttemptsConfig, wolfInspirationalMessages, wolfTimersByBand } from "../../../content/games/wolf-config";
import { useWolfSession } from "../../../hooks/games/useWolfSession";
import { generateWolfQuestionWithFallback } from "../../../services/games/wolfAiService";
import { canStartWolfAttempt } from "../../../services/games/wolfEngine";
import { supabase } from "../../../lib/supabase/client";
import { fetchMyAccessRole } from "../../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import type { WolfBand, WolfDifficulty, WolfGrade, WolfPhaseCategory, WolfQuestion } from "../../../types/games/wolf";

const DEFAULT_GRADE: WolfGrade = "8º Ano";
type GradePreference = "random" | WolfGrade;
const PHASE_ORDER: WolfPhaseCategory[] = ["reflexo", "logica", "conhecimento", "lideranca"];
const DIFFICULTY_BY_BAND: Record<WolfBand, Record<WolfPhaseCategory, WolfDifficulty>> = {
  exploradores: {
    reflexo: "easy",
    logica: "easy",
    conhecimento: "medium",
    lideranca: "medium",
  },
  cacadores: {
    reflexo: "easy",
    logica: "medium",
    conhecimento: "medium",
    lideranca: "medium",
  },
  estrategistas: {
    reflexo: "medium",
    logica: "hard",
    conhecimento: "hard",
    lideranca: "hard",
  },
};
const WOLF_GRADES: WolfGrade[] = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"];
const BNCC_HINTS: Record<WolfBand, Record<WolfPhaseCategory, string[]>> = {
  exploradores: {
    reflexo: [
      "EF06MA11 (operações com números naturais em contexto escolar)",
      "EF67LP11 (leitura de instruções curtas e objetivas)",
      "EF06CI03 (observação de padrões simples em fenômenos)",
    ],
    logica: [
      "EF06MA01 (resolução de problemas com estratégias variadas)",
      "EF67LP28 (inferência em textos curtos)",
      "EF06MA06 (organização lógica de informações)",
    ],
    conhecimento: [
      "EF06GE01 (orientação e leitura de mapas)",
      "EF06HI01 (noções temporais e fatos históricos introdutórios)",
      "EF06CI01 (conceitos básicos de ciência e ambiente)",
    ],
    lideranca: [
      "EF67LP25 (escuta e colaboração em atividades coletivas)",
      "Competências Gerais 8 e 9 da BNCC (autoconhecimento, empatia e cooperação)",
      "Situações de convivência escolar e resolução de conflitos",
    ],
  },
  cacadores: {
    reflexo: [
      "EF08MA04 (proporcionalidade em situações do cotidiano)",
      "EF89LP07 (compreensão rápida de textos instrucionais)",
      "EF08CI01 (análise de relações simples de causa e efeito)",
    ],
    logica: [
      "EF08MA12 (argumentação e validação de estratégias)",
      "EF89LP14 (relações lógicas em enunciados)",
      "EF09MA11 (raciocínio dedutivo em problemas estruturados)",
    ],
    conhecimento: [
      "EF08GE06 (dinâmicas socioespaciais em escalas locais e globais)",
      "EF09HI12 (eventos históricos e cidadania)",
      "EF08CI07 (conceitos científicos aplicados ao cotidiano)",
    ],
    lideranca: [
      "Competências Gerais 9 e 10 (cooperação e responsabilidade)",
      "Projetos colaborativos com tomada de decisão em grupo",
      "Mediação de conflitos em contexto escolar",
    ],
  },
  estrategistas: {
    reflexo: [
      "EM13MAT101 (resolução ágil de problemas quantitativos)",
      "EM13LGG103 (leitura precisa de comandos e critérios)",
      "EM13CNT201 (análise rápida de cenários científicos)",
    ],
    logica: [
      "EM13MAT401 (argumentação lógico-matemática)",
      "EM13LGG302 (interpretação crítica e inferência)",
      "EM13CHS103 (análise de premissas e consequências)",
    ],
    conhecimento: [
      "EM13CHS101 (contextos históricos e sociais contemporâneos)",
      "EM13CNT301 (conceitos científicos em problemas reais)",
      "EM13MAT303 (modelagem e interpretação de dados)",
    ],
    lideranca: [
      "EM13CHS502 (ética, participação e cidadania)",
      "Competências socioemocionais em liderança colaborativa",
      "Tomada de decisão responsável em projetos escolares",
    ],
  },
};

const PHASE_LABEL: Record<WolfPhaseCategory, string> = {
  reflexo: "Reflexo",
  logica: "Lógica",
  conhecimento: "Conhecimento",
  lideranca: "Liderança",
};

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

function normalizePromptSignature(prompt: string): string {
  return prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTooSimilarPrompt(candidate: string, seen: string[]): boolean {
  const normalized = normalizePromptSignature(candidate);
  if (!normalized) return false;
  return seen.some((item) => {
    const wordsA = new Set(normalized.split(" ").filter((w) => w.length > 3));
    const wordsB = new Set(item.split(" ").filter((w) => w.length > 3));
    if (!wordsA.size || !wordsB.size) return false;
    let overlap = 0;
    wordsA.forEach((word) => {
      if (wordsB.has(word)) overlap += 1;
    });
    const ratio = overlap / Math.max(wordsA.size, wordsB.size);
    return ratio >= 0.55;
  });
}

function CorrectAnswerExplosion({ answerText }: { answerText: string }) {
  const ringScale = useRef(new Animated.Value(0.45)).current;
  const ringOpacity = useRef(new Animated.Value(0.85)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const burst = Animated.parallel([
      Animated.timing(ringScale, {
        toValue: 1.8,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 1.08,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 150,
          useNativeDriver: true,
        }),
      ]),
    ]);

    burst.start();
  }, [ringScale, ringOpacity, cardScale]);

  return (
    <View style={{ marginTop: spacing.sm, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 176,
          height: 176,
          borderRadius: 88,
          borderWidth: 3,
          borderColor: "rgba(74,222,128,0.78)",
          transform: [{ scale: ringScale }],
          opacity: ringOpacity,
        }}
      />

      <Animated.View
        style={{
          width: "100%",
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: "rgba(74,222,128,0.65)",
          backgroundColor: "rgba(22,163,74,0.24)",
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          transform: [{ scale: cardScale }],
        }}
      >
        <Text style={{ color: "#86efac", fontSize: typography.small.fontSize }} weight="bold">
          Resposta certa (explosao verde)
        </Text>
        <Text style={{ color: "#dcfce7", marginTop: 4, lineHeight: 20 }} weight="semibold">
          {answerText}
        </Text>
      </Animated.View>
    </View>
  );
}

export default function AdminWolfGameScreen() {
  const params = useLocalSearchParams<{ grade?: string }>();
  const [guardLoading, setGuardLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [attemptsUsedToday, setAttemptsUsedToday] = useState(0);
  const [bestAttemptHits, setBestAttemptHits] = useState(0);
  const [streakDays, setStreakDays] = useState(4);
  const [selectedGradePreference, setSelectedGradePreference] = useState<GradePreference>("random");
  const countdownPulse = useRef(new Animated.Value(1)).current;

  const grade = coerceWolfGrade(params.grade, DEFAULT_GRADE);
  const session = useWolfSession({
    grade,
    streakDays,
    xpAlreadyAwardedToday: 0,
    buildQuestions: async (targetGrade) => {
      const band = getWolfBandByGrade(targetGrade);
      let hasMockFallback = false;
      const seenPromptSignatures: string[] = [];

      const builtQuestions = await Promise.all(
        PHASE_ORDER.map(async (category, index) => {
          const hints = BNCC_HINTS[band][category];
          let bestQuestion: WolfQuestion | null = null;

          for (let attempt = 0; attempt < 3; attempt += 1) {
            const hint = hints[(index + attempt) % hints.length] ?? "";
            const result = await generateWolfQuestionWithFallback({
              grade: targetGrade,
              band,
              category,
              difficulty: DIFFICULTY_BY_BAND[band][category],
              maxChars: 220,
              bnccTopicHint: hint,
              avoidQuestionPatterns: [
                ...seenPromptSignatures.slice(-4),
                "questao de gatos, caes ou mamiferos",
                "premissa repetida de animais domesticos",
              ],
            });

            if (result.source === "mock") hasMockFallback = true;
            const payload = result.question;
            const resolvedGrade = coerceWolfGrade(payload.grade, targetGrade);
            const candidate: WolfQuestion = {
              id: `run-${Date.now()}-${category}-${index + 1}-${attempt + 1}`,
              category,
              grade: resolvedGrade,
              band,
              difficulty: payload.difficulty,
              prompt: payload.prompt,
              options: payload.options,
              correctOptionIndex: payload.correctOptionIndex,
              explanation: payload.explanation,
              tags: payload.tags,
              estimatedReadTime: payload.estimatedReadTime,
            };

            const signature = normalizePromptSignature(candidate.prompt);
            const tooSimilar = isTooSimilarPrompt(candidate.prompt, seenPromptSignatures);
            if (!tooSimilar || attempt === 2) {
              seenPromptSignatures.push(signature);
              bestQuestion = candidate;
              break;
            }
          }

          if (!bestQuestion) {
            throw new Error(`Falha ao preparar a fase ${category} para ${targetGrade}.`);
          }

          return bestQuestion;
        }),
      );

      return {
        questions: builtQuestions,
        source: hasMockFallback ? "mock" : "ai",
      };
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
          useNativeDriver: true,
        }),
        Animated.timing(countdownPulse, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [session.stage, countdownPulse]);

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
                Ambiente premium de validação interna com IA, progressão e desafios por série.
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
                Fonte: {session.questionSource === "ai" ? "IA" : session.questionSource === "mock" ? "Fallback" : "Preparando"}
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
                Gerando fases via IA para a série {session.activeGrade}...
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
                  Série da rodada: {session.activeGrade} • Série da questão IA: {session.currentQuestion.grade}
                </Text>
                <Text style={{ color: colors.textMuted, marginTop: 2 }}>
                  Fase atual: {PHASE_LABEL[session.currentQuestion.category]} • Fonte: {session.questionSource === "ai" ? "IA" : "IA + fallback mock"}
                </Text>
              </View>
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
            </>
          ) : null}

          {session.stage === "feedback" && session.currentQuestion ? (
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
                      <CorrectAnswerExplosion answerText={correctAnswer} />
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

              <Pressable onPress={session.goNext} style={({ pressed }) => [nextButtonStyle, pressed ? { transform: [{ scale: 0.988 }] } : null]}>
                <Text style={{ color: colors.einsteinBlue, fontSize: typography.bodyMd.fontSize }} weight="bold">
                  {session.phaseIndex + 1 >= session.questions.length ? "Ver resultado premium" : "Seguir para próxima fase"}
                </Text>
              </Pressable>
            </LinearGradient>
          ) : null}
        </View>
      </ScrollView>
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

