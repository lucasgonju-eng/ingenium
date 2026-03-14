import { useEffect, useMemo, useState } from "react";
import { buildMockWolfQuestionsForGrade } from "../../content/games/wolf-mock-questions";
import { wolfTimersByBand } from "../../content/games/wolf-config";
import { calculateWolfAttemptXp } from "../../services/games/wolfEngine";
import type { WolfGrade, WolfPhaseCategory, WolfQuestion } from "../../types/games/wolf";

export type WolfSessionStage = "home" | "countdown" | "question" | "feedback" | "completed";

type AnswerSnapshot = {
  questionId: string;
  category: WolfPhaseCategory;
  selectedOptionIndex: number;
  isCorrect: boolean;
};

export function useWolfSession(input: {
  grade: WolfGrade;
  streakDays: number;
  xpAlreadyAwardedToday?: number;
  buildQuestions?: (
    grade: WolfGrade,
  ) => Promise<{ questions: WolfQuestion[]; source?: "ai" | "mock" }>;
}) {
  const [stage, setStage] = useState<WolfSessionStage>("home");
  const [activeGrade, setActiveGrade] = useState<WolfGrade>(input.grade);
  const [countdown, setCountdown] = useState(3);
  const [questions, setQuestions] = useState<WolfQuestion[]>([]);
  const [questionSource, setQuestionSource] = useState<"ai" | "mock" | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [questionReady, setQuestionReady] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answers, setAnswers] = useState<AnswerSnapshot[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const currentQuestion = questions[phaseIndex] ?? null;

  const hits = useMemo(() => answers.filter((item) => item.isCorrect).length, [answers]);
  const xpCalc = useMemo(
    () =>
      calculateWolfAttemptXp({
        hits,
        streakDays: input.streakDays,
        xpAlreadyAwardedToday: input.xpAlreadyAwardedToday ?? 0,
      }),
    [hits, input.streakDays, input.xpAlreadyAwardedToday],
  );

  function resetSession() {
    setStage("home");
    setActiveGrade(input.grade);
    setCountdown(3);
    setQuestions([]);
    setQuestionSource(null);
    setQuestionLoading(false);
    setQuestionError(null);
    setPhaseIndex(0);
    setQuestionReady(false);
    setSecondsLeft(0);
    setAnswers([]);
    setSelectedOptionIndex(null);
  }

  async function startSession(options?: { grade?: WolfGrade }) {
    const targetGrade = options?.grade ?? input.grade;
    setActiveGrade(targetGrade);
    setQuestionLoading(true);
    setQuestionError(null);
    try {
      const loaded = input.buildQuestions
        ? await input.buildQuestions(targetGrade)
        : { questions: buildMockWolfQuestionsForGrade(targetGrade), source: "mock" as const };

      if (!loaded.questions.length) {
        throw new Error("Nenhuma questão disponível para iniciar o teste.");
      }

      setQuestions(loaded.questions);
      setQuestionSource(loaded.source ?? null);
      setAnswers([]);
      setPhaseIndex(0);
      setSelectedOptionIndex(null);
      setQuestionReady(false);
      setCountdown(3);
      setStage("countdown");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao preparar perguntas.";
      setQuestionError(message);
      setStage("home");
    } finally {
      setQuestionLoading(false);
    }
  }

  function markQuestionReady() {
    if (stage !== "question" || !currentQuestion) return;
    const initialTime = wolfTimersByBand[currentQuestion.band][currentQuestion.category];
    setQuestionReady(true);
    setSecondsLeft(initialTime);
  }

  function registerAnswer(optionIndex: number) {
    if (!currentQuestion || stage !== "question" || selectedOptionIndex !== null) return;
    const isCorrect = optionIndex === currentQuestion.correctOptionIndex;
    setSelectedOptionIndex(optionIndex);
    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        category: currentQuestion.category,
        selectedOptionIndex: optionIndex,
        isCorrect,
      },
    ]);
    setStage("feedback");
  }

  function goNext() {
    if (!currentQuestion) return;
    const nextIndex = phaseIndex + 1;
    if (nextIndex >= questions.length) {
      setStage("completed");
      return;
    }
    setPhaseIndex(nextIndex);
    setQuestionReady(false);
    setSecondsLeft(0);
    setSelectedOptionIndex(null);
    setStage("question");
  }

  useEffect(() => {
    if (stage !== "countdown") return;
    const timeout = setTimeout(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setStage("question");
          return 0;
        }
        return prev - 1;
      });
    }, 700);
    return () => clearTimeout(timeout);
  }, [stage, countdown]);

  useEffect(() => {
    if (stage !== "question" || !questionReady || selectedOptionIndex !== null) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          registerAnswer(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, questionReady, selectedOptionIndex, currentQuestion?.id]);

  return {
    stage,
    activeGrade,
    countdown,
    questions,
    questionSource,
    questionLoading,
    questionError,
    currentQuestion,
    phaseIndex,
    secondsLeft,
    questionReady,
    selectedOptionIndex,
    answers,
    hits,
    xpBase: xpCalc.xpBase,
    xpStreakBonus: xpCalc.xpStreakBonus,
    xpAwarded: xpCalc.xpAwarded,
    resetSession,
    startSession,
    markQuestionReady,
    registerAnswer,
    goNext,
  };
}

