export type FeedAIAuditResult = {
  approved: boolean;
  reason: string;
  category: "safe" | "profanity" | "sexual" | "violence" | "drugs" | "hate" | "self_harm";
  score: number;
};

function normalize(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@]/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const RULES: Array<{ category: FeedAIAuditResult["category"]; reason: string; regex: RegExp; score: number }> = [
  {
    category: "sexual",
    reason: "Conteúdo sexual explícito não é permitido no mural.",
    regex: /\b(sexo|sexual|porn|nudez|nudes?|erotic|xvideos?)\b/i,
    score: 0.98,
  },
  {
    category: "violence",
    reason: "Conteúdo com violência explícita não é permitido no mural.",
    regex: /\b(matar|assassin|esfaquear|sangue|violencia|estupr|agressao)\b/i,
    score: 0.97,
  },
  {
    category: "drugs",
    reason: "Conteúdo sobre drogas ilícitas não é permitido no mural.",
    regex: /\b(cocaina|maconha|crack|ecstasy|heroina|lsd|trafic)\b/i,
    score: 0.95,
  },
  {
    category: "hate",
    reason: "Discurso de ódio ou discriminação não é permitido no mural.",
    regex: /\b(racista|racismo|homofob|naz[ií]|hitler|preconceit)\b/i,
    score: 0.96,
  },
  {
    category: "self_harm",
    reason: "Conteúdo de automutilação ou incentivo ao suicídio não é permitido no mural.",
    regex: /\b(suicid|auto ?mutil|me matar|quero morrer)\b/i,
    score: 0.99,
  },
  {
    category: "profanity",
    reason: "Palavras ofensivas não são permitidas no mural escolar.",
    regex: /\b(porra|caralho|foda\s*se|foder|fudid|fdp|pqp|puta\b|merda|bosta|otario|idiota|babaca|arrombado|desgraca)\b/i,
    score: 0.88,
  },
];

/**
 * Auditoria automática "estilo IA" para manter o mural adequado a menores de 12 anos.
 * Bloqueia publicação quando encontra padrões de alto risco.
 */
export function runFeedAIAudit(rawContent: string): FeedAIAuditResult {
  const content = normalize(rawContent);

  for (const rule of RULES) {
    if (rule.regex.test(content)) {
      return {
        approved: false,
        reason: rule.reason,
        category: rule.category,
        score: rule.score,
      };
    }
  }

  return {
    approved: true,
    reason: "Conteúdo aprovado para ambiente infantojuvenil.",
    category: "safe",
    score: 0.99,
  };
}
