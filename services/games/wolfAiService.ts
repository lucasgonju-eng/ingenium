import { buildMockWolfQuestionsForGrade } from "../../content/games/wolf-mock-questions";
import { supabase } from "../../lib/supabase/client";
import type { WolfAiQuestionPayload, WolfQuestionRequestInput } from "../../types/games/wolf";

const DEFAULT_AI_ENDPOINT =
  process.env.EXPO_PUBLIC_GAMES_AI_GENERATE_URL ??
  (process.env.EXPO_PUBLIC_SUPABASE_URL
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/games-generate-questions`
    : "");

function buildSafetyPrompt(input: WolfQuestionRequestInput): string {
  return [
    "Você é um gerador de questões pedagógicas para o jogo Teste dos Lobos.",
    "Retorne somente JSON válido.",
    "Público: estudantes de 11 a 18 anos.",
    "Restrições obrigatórias:",
    "- questão curta, clara e sem ambiguidades;",
    "- múltipla escolha com exatamente 4 opções;",
    "- apenas uma alternativa correta;",
    "- sem conteúdo impróprio, violento, sexual, discriminatório ou sensível mal formulado;",
    "- sem depender de chat livre entre alunos;",
    "- linguagem adequada para ambiente escolar;",
    `Série: ${input.grade}`,
    `Faixa: ${input.band}`,
    `Categoria: ${input.category}`,
    `Dificuldade: ${input.difficulty}`,
    `Limite máximo de caracteres no enunciado: ${input.maxChars}`,
    "Campos obrigatórios de saída:",
    "category, grade, difficulty, prompt, options, correctOptionIndex, explanation, tags, estimatedReadTime",
  ].join("\n");
}

function isValidQuestionPayload(value: unknown): value is WolfAiQuestionPayload {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (typeof item.prompt !== "string" || !item.prompt.trim()) return false;
  if (!Array.isArray(item.options) || item.options.length !== 4) return false;
  if (!item.options.every((opt) => typeof opt === "string" && opt.trim().length > 0)) return false;
  if (![0, 1, 2, 3].includes(Number(item.correctOptionIndex))) return false;
  if (typeof item.explanation !== "string" || !item.explanation.trim()) return false;
  if (!Array.isArray(item.tags)) return false;
  if (typeof item.estimatedReadTime !== "number") return false;
  return true;
}

/**
 * A chave da OpenAI nunca fica no cliente.
 * Este método chama apenas um endpoint seguro (edge function/API route/backend).
 */
export async function generateWolfQuestionWithFallback(input: WolfQuestionRequestInput): Promise<{
  question: WolfAiQuestionPayload;
  source: "ai" | "mock";
}> {
  const fallback = buildMockWolfQuestionsForGrade(input.grade).find((q) => q.category === input.category);
  if (!DEFAULT_AI_ENDPOINT) {
    if (!fallback) throw new Error("Banco mock indisponível para fallback.");
    return { question: fallback, source: "mock" };
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? null;
    if (!accessToken) throw new Error("Sessão inválida para geração IA.");

    const response = await fetch(DEFAULT_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
      body: JSON.stringify({
        game: "teste-dos-lobos",
        schemaVersion: "1.0.0",
        prompt: buildSafetyPrompt(input),
        input,
      }),
    });

    if (!response.ok) throw new Error(`Falha no backend IA (${response.status}).`);
    const payload = (await response.json()) as { question?: unknown };
    if (!isValidQuestionPayload(payload.question)) throw new Error("Payload IA inválido.");

    return {
      question: payload.question,
      source: "ai",
    };
  } catch {
    if (!fallback) throw new Error("Falha na geração IA e fallback mock indisponível.");
    return {
      question: fallback,
      source: "mock",
    };
  }
}

