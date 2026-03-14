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
  bnccTopicHint?: string;
  avoidQuestionPatterns?: string[];
};

type StructuredGeneratedQuestion = {
  enunciado: string;
  raciocinio_privado: string;
  resposta_correta: string;
  alternativas: Record<"A" | "B" | "C" | "D", string> | string[];
  justificativa_curta: string;
  nivel_dificuldade: string;
  tema: string;
  tipo_validacao: string;
};

type StudentSolverResult = {
  alternativa_escolhida: "A" | "B" | "C" | "D" | null;
  confianca: number;
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

type ValidationResult = {
  alternativa_correta_existe: boolean;
  apenas_uma_correta: boolean;
  coerencia_enunciado_gabarito: boolean;
  sem_ambiguidade_relevante: boolean;
  aprovada_para_exibicao: boolean;
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

function normalizeCategory(value: unknown): WolfPhaseCategory | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "reflexo") return "reflexo";
  if (raw === "logica" || raw === "lógica") return "logica";
  if (raw === "conhecimento") return "conhecimento";
  if (raw === "lideranca" || raw === "liderança") return "lideranca";
  return null;
}

function normalizeBand(value: unknown): WolfBand | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "exploradores") return "exploradores";
  if (raw === "cacadores" || raw === "caçadores") return "cacadores";
  if (raw === "estrategistas") return "estrategistas";
  return null;
}

function normalizeDifficulty(value: unknown): WolfDifficulty | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "easy" || raw === "facil" || raw === "fácil") return "easy";
  if (raw === "medium" || raw === "medio" || raw === "médio") return "medium";
  if (raw === "hard" || raw === "dificil" || raw === "difícil") return "hard";
  return null;
}

function normalizeEstimatedReadTime(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(4, Math.min(30, Math.round(value)));
  }

  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const match = raw.match(/(\d+)/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base) || base <= 0) return null;

  const inMinutes =
    raw.includes("min") ||
    raw.includes("minuto") ||
    raw.includes("minutos") ||
    raw === "1m" ||
    raw === "2m";

  const seconds = inMinutes ? base * 60 : base;
  return Math.max(4, Math.min(30, Math.round(seconds)));
}

function asQuestionPayload(value: unknown): QuestionPayload | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const category = normalizeCategory(obj.category);
  if (!category) return null;
  if (typeof obj.grade !== "string" || !obj.grade.trim()) return null;
  const difficulty = normalizeDifficulty(obj.difficulty);
  if (!difficulty) return null;
  if (typeof obj.prompt !== "string" || !obj.prompt.trim()) return null;
  if (!Array.isArray(obj.options) || obj.options.length !== 4) return null;
  if (!obj.options.every((x) => typeof x === "string" && x.trim().length > 0)) return null;
  if (![0, 1, 2, 3].includes(Number(obj.correctOptionIndex))) return null;
  if (typeof obj.explanation !== "string" || !obj.explanation.trim()) return null;
  if (!Array.isArray(obj.tags) || !obj.tags.every((x) => typeof x === "string")) return null;
  const estimatedReadTime = normalizeEstimatedReadTime(obj.estimatedReadTime);
  if (estimatedReadTime === null) return null;

  return {
    category,
    grade: obj.grade.trim(),
    difficulty,
    prompt: obj.prompt.trim(),
    options: [obj.options[0], obj.options[1], obj.options[2], obj.options[3]],
    correctOptionIndex: Number(obj.correctOptionIndex) as 0 | 1 | 2 | 3,
    explanation: obj.explanation.trim(),
    tags: obj.tags,
    estimatedReadTime,
  };
}

function normalizePromptSignature(prompt: string): string {
  return String(prompt ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparableText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAlternatives(raw: unknown): Record<"A" | "B" | "C" | "D", string> | null {
  if (Array.isArray(raw)) {
    if (raw.length !== 4 || !raw.every((item) => typeof item === "string" && item.trim())) return null;
    return {
      A: raw[0].trim(),
      B: raw[1].trim(),
      C: raw[2].trim(),
      D: raw[3].trim(),
    };
  }

  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const A = typeof obj.A === "string" ? obj.A.trim() : "";
  const B = typeof obj.B === "string" ? obj.B.trim() : "";
  const C = typeof obj.C === "string" ? obj.C.trim() : "";
  const D = typeof obj.D === "string" ? obj.D.trim() : "";
  if (!A || !B || !C || !D) return null;
  return { A, B, C, D };
}

function asStructuredGeneratedQuestion(value: unknown): StructuredGeneratedQuestion | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const enunciado = typeof obj.enunciado === "string" ? obj.enunciado.trim() : "";
  const raciocinio_privado = typeof obj.raciocinio_privado === "string" ? obj.raciocinio_privado.trim() : "";
  const resposta_correta = typeof obj.resposta_correta === "string" ? obj.resposta_correta.trim() : "";
  const justificativa_curta = typeof obj.justificativa_curta === "string" ? obj.justificativa_curta.trim() : "";
  const nivel_dificuldade = typeof obj.nivel_dificuldade === "string" ? obj.nivel_dificuldade.trim() : "";
  const tema = typeof obj.tema === "string" ? obj.tema.trim() : "";
  const tipo_validacao = typeof obj.tipo_validacao === "string" ? obj.tipo_validacao.trim() : "";
  const alternativas = parseAlternatives(obj.alternativas);

  if (!enunciado || !resposta_correta || !justificativa_curta || !alternativas) return null;
  return {
    enunciado,
    raciocinio_privado,
    resposta_correta,
    alternativas,
    justificativa_curta,
    nivel_dificuldade,
    tema,
    tipo_validacao,
  };
}

function findMatchingCorrectAlternative(
  respostaCorreta: string,
  alternativas: Record<"A" | "B" | "C" | "D", string>,
): { matches: ("A" | "B" | "C" | "D")[]; normalizedAnswer: string } {
  const normalizedAnswer = normalizeComparableText(respostaCorreta);
  const entries: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];
  const matches = entries.filter((key) => normalizeComparableText(alternativas[key]) === normalizedAnswer);
  return { matches, normalizedAnswer };
}

function hasAmbiguousAlternatives(alternativas: Record<"A" | "B" | "C" | "D", string>): boolean {
  const normalized = ["A", "B", "C", "D"].map((key) => normalizeComparableText(alternativas[key as "A" | "B" | "C" | "D"]));
  return new Set(normalized).size !== normalized.length;
}

function computeEstimatedReadTimeFromText(enunciado: string): number {
  const words = normalizeComparableText(enunciado).split(" ").filter(Boolean).length;
  const seconds = Math.round(words * 0.9 + 7);
  return Math.max(6, Math.min(30, seconds));
}

function buildQuestionFromStructured(
  input: GenerateInput,
  structured: StructuredGeneratedQuestion,
  solverResult: StudentSolverResult,
): { question: QuestionPayload | null; validation: ValidationResult; correctLetter: "A" | "B" | "C" | "D" | null } {
  const matchResult = findMatchingCorrectAlternative(structured.resposta_correta, structured.alternativas);
  const correctExists = matchResult.matches.length >= 1;
  const onlyOneCorrect = matchResult.matches.length === 1;
  const correctLetter = onlyOneCorrect ? matchResult.matches[0] : null;
  const coherence = !!correctLetter && solverResult.alternativa_escolhida === correctLetter;
  const notAmbiguous = !hasAmbiguousAlternatives(structured.alternativas) && solverResult.confianca >= 0.55;

  const validation: ValidationResult = {
    alternativa_correta_existe: correctExists,
    apenas_uma_correta: onlyOneCorrect,
    coerencia_enunciado_gabarito: coherence,
    sem_ambiguidade_relevante: notAmbiguous,
    aprovada_para_exibicao: correctExists && onlyOneCorrect && coherence && notAmbiguous,
  };

  if (!validation.aprovada_para_exibicao || !correctLetter) {
    return { question: null, validation, correctLetter };
  }

  const options: [string, string, string, string] = [
    structured.alternativas.A,
    structured.alternativas.B,
    structured.alternativas.C,
    structured.alternativas.D,
  ];
  const correctOptionIndex: 0 | 1 | 2 | 3 =
    correctLetter === "A" ? 0 : correctLetter === "B" ? 1 : correctLetter === "C" ? 2 : 3;

  const question: QuestionPayload = {
    category: input.category,
    grade: input.grade,
    difficulty: input.difficulty,
    prompt: structured.enunciado,
    options,
    correctOptionIndex,
    explanation: structured.justificativa_curta,
    tags: [input.category, input.band, structured.tema || "bncc", structured.nivel_dificuldade || input.difficulty]
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 6),
    estimatedReadTime: computeEstimatedReadTimeFromText(structured.enunciado),
  };

  return { question, validation, correctLetter };
}

function buildWords(signature: string): Set<string> {
  return new Set(signature.split(" ").filter((word) => word.length > 3));
}

function isPromptTooSimilar(candidatePrompt: string, previousSignatures: string[]): boolean {
  const candidate = normalizePromptSignature(candidatePrompt);
  if (!candidate) return false;

  if (previousSignatures.includes(candidate)) return true;

  const wordsA = buildWords(candidate);
  if (!wordsA.size) return false;

  return previousSignatures.some((signature) => {
    const wordsB = buildWords(signature);
    if (!wordsB.size) return false;

    let overlap = 0;
    wordsA.forEach((word) => {
      if (wordsB.has(word)) overlap += 1;
    });
    const ratio = overlap / Math.max(wordsA.size, wordsB.size);
    return ratio >= 0.58;
  });
}

function getDifficultyBoostPct(grade: string): number {
  const normalized = grade.toLowerCase().trim();
  if (normalized === "2ª série" || normalized === "3ª série") {
    return 60;
  }
  return 30;
}

function buildDifficultyBoostInstruction(grade: string): string {
  const boost = getDifficultyBoostPct(grade);
  if (boost >= 60) {
    return "Aumente o nível de desafio cognitivo em 60% para esta série, com maior abstração, inferência e rigor conceitual.";
  }
  return "Aumente o nível de desafio cognitivo em 30% para esta série, elevando complexidade de raciocínio e precisão conceitual.";
}

async function getRecentPromptSignaturesForUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  requestedBy: string,
): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("game_ai_generations")
    .select("response_snapshot")
    .eq("game_id", "game_teste_dos_lobos")
    .eq("requested_by", requestedBy)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(120);

  if (!Array.isArray(data)) return [];

  const signatures: string[] = [];
  for (const row of data) {
    const snapshot = row?.response_snapshot as Record<string, unknown> | null;
    const prompt = typeof snapshot?.prompt === "string" ? snapshot.prompt : "";
    const signature = normalizePromptSignature(prompt);
    if (signature) signatures.push(signature);
  }
  return signatures;
}

function buildPrompt(input: GenerateInput): string {
  const avoidList = (input.avoidQuestionPatterns ?? []).filter(Boolean).slice(0, 6);
  return [
    "Você é um gerador de questões para o jogo educacional Teste dos Lobos.",
    "Retorne SOMENTE JSON válido (sem markdown) seguindo o schema obrigatório.",
    "Público: estudantes de 11 a 18 anos em ambiente escolar.",
    "A questão deve ser aderente à BNCC e condizente com a série solicitada.",
    buildDifficultyBoostInstruction(input.grade),
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
    input.bnccTopicHint ? `Habilidade/tema BNCC prioritário: ${input.bnccTopicHint}` : "",
    avoidList.length ? `Evite repetir estes padrões recentes: ${avoidList.join(" | ")}` : "",
    "NÃO repita perguntas já usadas para o mesmo aluno.",
    "Crie contexto original e diferente de exemplos repetidos.",
    "Campos obrigatórios e separados:",
    "- enunciado",
    "- raciocinio_privado",
    "- resposta_correta",
    "- alternativas (objeto com chaves A, B, C, D)",
    "- justificativa_curta",
    "- nivel_dificuldade",
    "- tema",
    "- tipo_validacao",
    "Regra-mãe: nenhuma questão pode ser exibida se resposta_correta não estiver presente de forma inequívoca entre as alternativas.",
    "Não produza alternativas duplicadas ou semanticamente equivalentes.",
  ].join("\n");
}

async function runStudentSolverValidation(params: {
  openAiKey: string;
  enunciado: string;
  alternativas: Record<"A" | "B" | "C" | "D", string>;
}): Promise<StudentSolverResult> {
  const solverPrompt = [
    "Resolva a questão abaixo como um aluno, sem acessar gabarito.",
    "Retorne apenas JSON no formato:",
    '{ "alternativa_escolhida": "A|B|C|D", "confianca": 0.0 }',
    "Questão:",
    params.enunciado,
    "Alternativas:",
    `A) ${params.alternativas.A}`,
    `B) ${params.alternativas.B}`,
    `C) ${params.alternativas.C}`,
    `D) ${params.alternativas.D}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.openAiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Responda apenas JSON válido." },
        { role: "user", content: solverPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return { alternativa_escolhida: null, confianca: 0 };
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : null;
  const rawAlternative = String(parsed?.alternativa_escolhida ?? "").trim().toUpperCase();
  const alternativa_escolhida =
    rawAlternative === "A" || rawAlternative === "B" || rawAlternative === "C" || rawAlternative === "D"
      ? (rawAlternative as "A" | "B" | "C" | "D")
      : null;
  const confianca = Number(parsed?.confianca ?? 0);
  return {
    alternativa_escolhida,
    confianca: Number.isFinite(confianca) ? Math.max(0, Math.min(1, confianca)) : 0,
  };
}

async function getOpenAiKey(supabaseAdmin: ReturnType<typeof createClient>): Promise<string | null> {
  const envKey = Deno.env.get("INGENIUM_GAMES_OPENAI_API_KEY")?.trim();
  if (envKey) return envKey;

  const { data, error } = await supabaseAdmin.rpc("get_app_secret_service", {
    p_key: "ingenium_games_openai_api_key",
  });

  if (error) return null;
  const key = typeof data === "string" ? data.trim() : "";
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
    band: normalizeBand(inputObj.band) as WolfBand,
    category: normalizeCategory(inputObj.category) as WolfPhaseCategory,
    difficulty: normalizeDifficulty(inputObj.difficulty) as WolfDifficulty,
    maxChars: Number(inputObj.maxChars ?? 220),
    bnccTopicHint: typeof inputObj.bnccTopicHint === "string" ? inputObj.bnccTopicHint.trim() : undefined,
    avoidQuestionPatterns: Array.isArray(inputObj.avoidQuestionPatterns)
      ? inputObj.avoidQuestionPatterns.filter((item) => typeof item === "string").map((item) => String(item))
      : undefined,
  };

  if (!input.grade || !input.band || !input.category || !input.difficulty) {
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
  const recentSignatures = await getRecentPromptSignaturesForUser(supabaseAdmin, requestedBy);
  const dynamicAvoidPatterns = [...(input.avoidQuestionPatterns ?? [])];

  try {
    const maxAttempts = 5;
    let lastParsedPayload: unknown = null;
    let lastPrompt = prompt;
    let lastFailureReason = "invalid_question_payload";

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const promptForAttempt = buildPrompt({
        ...input,
        avoidQuestionPatterns: [...dynamicAvoidPatterns, ...recentSignatures.slice(0, 10)],
      });

      lastPrompt = promptForAttempt;
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.52,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Responda apenas JSON válido." },
            { role: "user", content: promptForAttempt },
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
          prompt_snapshot: promptForAttempt,
          status: "failed",
          error_message: `openai_http_${response.status}:${errBody.slice(0, 220)}`,
          latency_ms: Date.now() - startedAt,
        });
        return json(502, { error: "openai_request_failed" });
      }

      const openAiPayload = await response.json();
      const content = openAiPayload?.choices?.[0]?.message?.content;
      const parsed = typeof content === "string" ? JSON.parse(content) : null;
      lastParsedPayload = parsed;

      const structured = asStructuredGeneratedQuestion(parsed);
      if (!structured) {
        lastFailureReason = "invalid_structured_payload";
        continue;
      }

      const solverResult = await runStudentSolverValidation({
        openAiKey,
        enunciado: structured.enunciado,
        alternativas: structured.alternativas,
      });

      const built = buildQuestionFromStructured(input, structured, solverResult);
      if (!built.question) {
        if (!built.validation.alternativa_correta_existe) {
          lastFailureReason = "correct_answer_not_in_options";
        } else if (!built.validation.apenas_uma_correta) {
          lastFailureReason = "multiple_or_no_unique_correct_options";
        } else if (!built.validation.coerencia_enunciado_gabarito) {
          lastFailureReason = "student_solver_mismatch";
        } else {
          lastFailureReason = "ambiguous_question";
        }
        dynamicAvoidPatterns.push(structured.enunciado.slice(0, 220));
        dynamicAvoidPatterns.push(structured.resposta_correta.slice(0, 120));
        continue;
      }

      const question = built.question;
      const repeatedForUser = isPromptTooSimilar(question.prompt, recentSignatures);
      if (repeatedForUser) {
        lastFailureReason = "repeated_question_for_user";
        dynamicAvoidPatterns.push(question.prompt.slice(0, 200));
        continue;
      }

      await supabaseAdmin.from("game_ai_generations").insert({
        game_id: "game_teste_dos_lobos",
        requested_by: requestedBy,
        grade: input.grade,
        band: input.band,
        category: input.category,
        difficulty: input.difficulty,
        model: "gpt-4o-mini",
        prompt_snapshot: promptForAttempt,
        response_snapshot: {
          enunciado: structured.enunciado,
          resposta_correta: structured.resposta_correta,
          alternativas: structured.alternativas,
          justificativa_curta: structured.justificativa_curta,
          tema: structured.tema,
          nivel_dificuldade: structured.nivel_dificuldade,
          tipo_validacao: structured.tipo_validacao,
          validacao: built.validation,
          alternativa_escolhida_aluno_simulado: solverResult.alternativa_escolhida,
          confianca_aluno_simulado: solverResult.confianca,
          question,
        },
        status: "success",
        latency_ms: Date.now() - startedAt,
      });

      return json(200, {
        enunciado: structured.enunciado,
        alternativas: structured.alternativas,
        gabarito: structured.resposta_correta,
        justificativa: structured.justificativa_curta,
        question,
        validacao: built.validation,
      });
    }

    await supabaseAdmin.from("game_ai_generations").insert({
      game_id: "game_teste_dos_lobos",
      requested_by: requestedBy,
      grade: input.grade,
      band: input.band,
      category: input.category,
      difficulty: input.difficulty,
      model: "gpt-4o-mini",
      prompt_snapshot: lastPrompt,
      response_snapshot: lastParsedPayload,
      status: "failed",
      error_message: lastFailureReason,
      latency_ms: Date.now() - startedAt,
    });
    return json(502, { error: lastFailureReason });
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

