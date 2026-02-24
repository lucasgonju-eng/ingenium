import { supabase } from "../supabase/client";

export type FeedAIAuditResult = {
  approved: boolean;
  reason: string;
  category: "safe" | "abusive" | "sexual" | "violence" | "hate" | "self_harm" | "other";
  score: number;
};

export async function runFeedAIAudit(rawContent: string): Promise<FeedAIAuditResult> {
  const content = rawContent.trim();
  if (!content) {
    return {
      approved: false,
      reason: "Digite um conteúdo antes de publicar.",
      category: "other",
      score: 1,
    };
  }

  const { data, error } = await supabase.functions.invoke("ai-feed-audit", {
    body: { content },
  });

  if (error) {
    throw new Error(error.message || "Falha na auditoria de conteúdo por IA.");
  }

  const parsed = data as Partial<FeedAIAuditResult> | null;
  if (!parsed || typeof parsed.approved !== "boolean") {
    throw new Error("Resposta inválida da auditoria de conteúdo por IA.");
  }

  return {
    approved: parsed.approved,
    reason: String(parsed.reason ?? "Sem detalhes."),
    category: (parsed.category as FeedAIAuditResult["category"]) ?? "other",
    score: typeof parsed.score === "number" ? parsed.score : 0.5,
  };
}
