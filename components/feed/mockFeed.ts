import { FeedPost } from "../../lib/supabase/queries";

export type MockFeedPost = FeedPost & {
  kind?: "announcement" | "highlight" | "tip";
  title?: string;
  ctaLabel?: string;
  badge?: string;
};

export function getMockFeedPosts(): MockFeedPost[] {
  const now = Date.now();
  return [
    {
      id: "mock-1",
      author_id: "system",
      created_at: new Date(now - 1000 * 60 * 20).toISOString(),
      content: "Calendário de Provas: 2ª Fase.\n\nPrepare-se com foco total.",
      kind: "announcement",
      title: "Calendário de Provas: 2ª Fase",
      ctaLabel: "Ver cronograma",
    },
    {
      id: "mock-2",
      author_id: "ingenium",
      created_at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
      content: "Parabéns, Ana Silva! 🏅\n\nVocê conquistou destaque no ranking.",
      kind: "highlight",
      badge: "DESTAQUE",
    },
    {
      id: "mock-3",
      author_id: "prof",
      created_at: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
      content: "Estratégia para Física Moderna:\n\nA resolução por problemas é o método mais eficiente.",
      kind: "tip",
    },
  ];
}
