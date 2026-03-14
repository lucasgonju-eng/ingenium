// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type WolfPhaseCategory = "reflexo" | "logica" | "conhecimento" | "lideranca";
type WolfBand = "exploradores" | "cacadores" | "estrategistas";
type WolfDifficulty = "easy" | "medium" | "hard";

type GenerateInput = {
  grade: string;
  band: WolfBand;
  category: WolfPhaseCategory;
  difficulty: WolfDifficulty;
  maxChars: number;
};

type QuestionPayload = {
  category: WolfPhaseCategory;
  grade: string;
  difficulty: WolfDifficulty;
  prompt: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation: string;
  tags: string[];
  estimatedReadTime: number;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function isCategory(value: unknown): value is WolfPhaseCategory {
  return value === "reflexo" || value === "logica" || value === "conhecimento" || value === "lideranca";
}

function isBand(value: unknown): value is WolfBand {
  return value === "exploradores" || value === "cacadores" || value === "estrategistas";
}

function isDifficulty(value: unknown): value is WolfDifficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

function asQuestionPayload(value: unknown): QuestionPayload | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (!isCategory(obj.category)) return null;
  if (typeof obj.grade !== "string" || !obj.grade.trim()) return null;
  if (!isDifficulty(obj.difficulty)) return null;
  if (typeof obj.prompt !== "string" || !obj.prompt.trim()) return null;
  if (!Array.isArray(obj.options) || obj.options.length !== 4) return null;
  if (!obj.options.every((x) => typeof x === "string" && x.trim().length > 0)) return null;
  if (![0, 1, 2, 3].includes(Number(obj.correctOptionIndex))) return null;
  if (typeof obj.explanation !== "string" || !obj.explanation.trim()) return null;
  if (!Array.isArray(obj.tags) || !obj.tags.every((x) => typeof x === "string")) return null;
  if (typeof obj.estimatedReadTime !== "number" || !Number.isFinite(obj.estimatedReadTime)) return null;

  return {
    category: obj.category,
    grade: obj.grade.trim(),
    difficulty: obj.difficulty,
    prompt: obj.prompt.trim(),
    options: [obj.options[0], obj.options[1], obj.options[2], obj.options[3]],
    correctOptionIndex: Number(obj.correctOptionIndex) as 0 | 1 | 2 | 3,
    explanation: obj.explanation.trim(),
    tags: obj.tags,
    estimatedReadTime: Math.max(4, Math.min(30, Math.round(obj.estimatedReadTime))),
  };
}

function buildPrompt(input: GenerateInput): string {
  return [
    "Você é um gerador de questões para o jogo educacional Teste dos Lobos.",
    "Retorne SOMENTE JSON válido (sem markdown).",
    "Público: estudantes de 11 a 18 anos em ambiente escolar.",
    "Restrições obrigatórias:",
    "- questão curta, clara e sem ambiguidade;",
    "- exatamente 4 alternativas;",
    "- apenas 1 alternativa correta;",
    "- proibir conteúdo impróprio, sexual, violento, discriminatório, autolesão ou humilhação;",
    "- não depender de chat entre alunos;",
    "- adequado para pedagogia e convivência saudável.",
    `Série: ${input.grade}`,
    `Faixa: ${input.band}`,
    `Categoria: ${input.category}`,
    `Dificuldade: ${input.difficulty}`,
    `Limite máximo de caracteres do enunciado: ${input.maxChars}`,
    "Retorne objeto com campos: category, grade, difficulty, prompt, options, correctOptionIndex, explanation, tags, estimatedReadTime.",
  ].join("\n");
}

async function getOpenAiKey(supabaseAdmin: ReturnType<typeof createClient>): Promise<string | null> {
  const envKey = Deno.env.get("INGENIUM_GAMES_OPENAI_API_KEY")?.trim();
  if (envKey) return envKey;

  const { data, error } = await supabaseAdmin
    .schema("private")
    .from("app_secrets")
    .select("value")
    .eq("key", "ingenium_games_openai_api_key")
    .maybeSingle();

  if (error) return null;
  const key = typeof data?.value === "string" ? data.value.trim() : "";
  return key || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "server_env_not_configured" });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const authHeader = req.headers.get("Authorization") ?? "";

  let requestedBy: string | null = null;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAdmin.auth.getUser(token);
    requestedBy = data.user?.id ?? null;
  }

  if (!requestedBy) {
    return json(401, { error: "unauthorized" });
  }

  const body = await req.json().catch(() => null);
  const inputRaw = body && typeof body === "object" ? (body as Record<string, unknown>).input : null;
  if (!inputRaw || typeof inputRaw !== "object") {
    return json(400, { error: "invalid_input_payload" });
  }

  const inputObj = inputRaw as Record<string, unknown>;
  const input: GenerateInput = {
    grade: typeof inputObj.grade === "string" ? inputObj.grade.trim() : "",
    band: inputObj.band as WolfBand,
    category: inputObj.category as WolfPhaseCategory,
    difficulty: inputObj.difficulty as WolfDifficulty,
    maxChars: Number(inputObj.maxChars ?? 220),
  };

  if (!input.grade || !isBand(input.band) || !isCategory(input.category) || !isDifficulty(input.difficulty)) {
    return json(400, { error: "invalid_input_fields" });
  }

  const openAiKey = await getOpenAiKey(supabaseAdmin);
  if (!openAiKey) {
    await supabaseAdmin.from("game_ai_generations").insert({
      game_id: "game_teste_dos_lobos",
      requested_by: requestedBy,
      grade: input.grade,
      band: input.band,
      category: input.category,
      difficulty: input.difficulty,
      model: "gpt-4o-mini",
      prompt_snapshot: buildPrompt(input),
      status: "failed",
      error_message: "openai_key_missing",
    });
    return json(500, { error: "openai_key_missing" });
  }

  const prompt = buildPrompt(input);
  const startedAt = Date.now();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Responda apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      await supabaseAdmin.from("game_ai_generations").insert({
        game_id: "game_teste_dos_lobos",
        requested_by: requestedBy,
        grade: input.grade,
        band: input.band,
        category: input.category,
        difficulty: input.difficulty,
        model: "gpt-4o-mini",
        prompt_snapshot: prompt,
        status: "failed",
        error_message: `openai_http_${response.status}:${errBody.slice(0, 220)}`,
        latency_ms: Date.now() - startedAt,
      });
      return json(502, { error: "openai_request_failed" });
    }

    const openAiPayload = await response.json();
    const content = openAiPayload?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    const question = asQuestionPayload(parsed);
    if (!question) {
      await supabaseAdmin.from("game_ai_generations").insert({
        game_id: "game_teste_dos_lobos",
        requested_by: requestedBy,
        grade: input.grade,
        band: input.band,
        category: input.category,
        difficulty: input.difficulty,
        model: "gpt-4o-mini",
        prompt_snapshot: prompt,
        response_snapshot: parsed,
        status: "failed",
        error_message: "invalid_question_payload",
        latency_ms: Date.now() - startedAt,
      });
      return json(502, { error: "invalid_question_payload" });
    }

    await supabaseAdmin.from("game_ai_generations").insert({
      game_id: "game_teste_dos_lobos",
      requested_by: requestedBy,
      grade: input.grade,
      band: input.band,
      category: input.category,
      difficulty: input.difficulty,
      model: "gpt-4o-mini",
      prompt_snapshot: prompt,
      response_snapshot: question,
      status: "success",
      latency_ms: Date.now() - startedAt,
    });

    return json(200, { question });
  } catch (error) {
    await supabaseAdmin.from("game_ai_generations").insert({
      game_id: "game_teste_dos_lobos",
      requested_by: requestedBy,
      grade: input.grade,
      band: input.band,
      category: input.category,
      difficulty: input.difficulty,
      model: "gpt-4o-mini",
      prompt_snapshot: prompt,
      status: "failed",
      error_message: error instanceof Error ? error.message : "unknown_error",
      latency_ms: Date.now() - startedAt,
    });

    return json(500, { error: "unexpected_server_error" });
  }
});

