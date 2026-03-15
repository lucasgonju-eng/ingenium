import { buildMockWolfQuestionsForGrade } from "../../content/games/wolf-mock-questions";
import { getWolfBandByGrade } from "../../content/games/wolf-config";
import {
  pickWolfQuestionsFromBankRpc,
  previewWolfQuestionFromBankAdminRpc,
  type WolfBankQuestionRow,
} from "../../lib/supabase/queries";
import type { WolfAiQuestionPayload, WolfGrade, WolfPhaseCategory, WolfQuestion } from "../../types/games/wolf";

type WolfQuestionSource = "bank" | "mock";

function toOptionsTuple(options: string[]): [string, string, string, string] {
  if (options.length === 4) {
    return [options[0] ?? "", options[1] ?? "", options[2] ?? "", options[3] ?? ""];
  }
  throw new Error("Questão inválida no banco: quantidade de alternativas diferente de 4.");
}

function toCorrectIndex(value: number): 0 | 1 | 2 | 3 {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  throw new Error("Questão inválida no banco: gabarito fora do intervalo 0..3.");
}

function shuffleQuestionOptions(
  options: [string, string, string, string],
  correctOptionIndex: 0 | 1 | 2 | 3,
): { options: [string, string, string, string]; correctOptionIndex: 0 | 1 | 2 | 3 } {
  const entries = options.map((text, index) => ({
    text,
    isCorrect: index === correctOptionIndex,
  }));

  for (let i = entries.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = entries[i];
    entries[i] = entries[j] ?? entries[i];
    entries[j] = tmp;
  }

  const nextCorrectIndex = entries.findIndex((entry) => entry.isCorrect);
  if (nextCorrectIndex < 0 || nextCorrectIndex > 3) {
    throw new Error("Falha ao embaralhar alternativas da questão.");
  }

  return {
    options: [entries[0]?.text ?? "", entries[1]?.text ?? "", entries[2]?.text ?? "", entries[3]?.text ?? ""],
    correctOptionIndex: nextCorrectIndex as 0 | 1 | 2 | 3,
  };
}

function toWolfQuestion(row: WolfBankQuestionRow): WolfQuestion {
  const grade = row.grade as WolfGrade;
  const category = row.phase_category as WolfPhaseCategory;
  const band = (row.band || getWolfBandByGrade(grade)) as WolfQuestion["band"];
  const shuffled = shuffleQuestionOptions(
    toOptionsTuple(row.options),
    toCorrectIndex(row.correct_option_index),
  );
  return {
    id: row.question_id,
    category,
    grade,
    band,
    discipline: row.discipline,
    difficulty: row.difficulty as WolfQuestion["difficulty"],
    prompt: row.prompt,
    vestibularName: row.vestibular_name,
    vestibularYear: row.vestibular_year,
    vestibularUrl: row.vestibular_url,
    options: shuffled.options,
    correctOptionIndex: shuffled.correctOptionIndex,
    explanation: row.explanation,
    tags: row.tags ?? [],
    estimatedReadTime: Math.max(5, Number(row.estimated_read_time ?? 12)),
  };
}

function toPreviewPayload(row: WolfBankQuestionRow): WolfAiQuestionPayload {
  const question = toWolfQuestion(row);
  return {
    category: question.category,
    grade: question.grade,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation,
    tags: question.tags,
    estimatedReadTime: question.estimatedReadTime,
  };
}

const PHASE_ORDER: WolfPhaseCategory[] = ["reflexo", "logica", "conhecimento", "lideranca"];

export async function buildWolfQuestionSetFromBankWithFallback(input: {
  grade: WolfGrade;
  sessionKey?: string | null;
}): Promise<{ questions: WolfQuestion[]; source: WolfQuestionSource }> {
  try {
    const rows = await pickWolfQuestionsFromBankRpc({
      grade: input.grade,
      sessionKey: input.sessionKey ?? null,
    });
    const mapped = rows.map(toWolfQuestion);
    if (mapped.length < 4) throw new Error("Banco de perguntas retornou menos de 4 questões.");

    const sorted = [...mapped].sort(
      (a, b) => PHASE_ORDER.indexOf(a.category) - PHASE_ORDER.indexOf(b.category),
    );

    return { questions: sorted, source: "bank" };
  } catch {
    // Fallback seguro para não quebrar rodada caso o banco/RPC esteja indisponível.
    const fallbackQuestions = buildMockWolfQuestionsForGrade(input.grade).map((question) => {
      const shuffled = shuffleQuestionOptions(question.options, question.correctOptionIndex);
      return {
        ...question,
        options: shuffled.options,
        correctOptionIndex: shuffled.correctOptionIndex,
      };
    });
    return {
      questions: fallbackQuestions,
      source: "mock",
    };
  }
}

export async function previewWolfQuestionFromBankAdminWithFallback(input: {
  grade: WolfGrade;
  category?: WolfPhaseCategory;
}): Promise<{ question: WolfAiQuestionPayload; source: WolfQuestionSource }> {
  try {
    const row = await previewWolfQuestionFromBankAdminRpc({
      grade: input.grade,
      category: input.category ?? "logica",
    });
    if (!row) throw new Error("Banco de perguntas sem questão para prévia.");
    return {
      question: toPreviewPayload(row),
      source: "bank",
    };
  } catch {
    const fallback =
      buildMockWolfQuestionsForGrade(input.grade).find((q) => q.category === (input.category ?? "logica")) ??
      buildMockWolfQuestionsForGrade(input.grade)[0];
    if (!fallback) {
      throw new Error("Fallback mock indisponível para prévia de questão.");
    }
    return {
      question: {
        category: fallback.category,
        grade: fallback.grade,
        difficulty: fallback.difficulty,
        prompt: fallback.prompt,
        options: fallback.options,
        correctOptionIndex: fallback.correctOptionIndex,
        explanation: fallback.explanation,
        tags: fallback.tags,
        estimatedReadTime: fallback.estimatedReadTime,
      },
      source: "mock",
    };
  }
}

