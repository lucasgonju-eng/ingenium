import { Platform } from "react-native";

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

  const endpoint =
    Platform.OS === "web"
      ? "/ai-feed-audit.php"
      : "https://ingenium.einsteinhub.co/ai-feed-audit.php";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Falha na auditoria de conteúdo por IA (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as Partial<FeedAIAuditResult> | null;
  const parsed = data;
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
