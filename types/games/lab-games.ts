export type LabGameStatus = "development" | "internal_test" | "published" | "paused";

export type LabGameCategory = "logic" | "memory" | "strategy" | "knowledge" | "behavior";

export type LabGameAction =
  | "view"
  | "edit_settings"
  | "test_game"
  | "publish"
  | "unpublish"
  | "pause"
  | "simulate_student_view";

export type LabGameDefinition = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  signature: boolean;
  category: LabGameCategory;
  status: LabGameStatus;
  published: boolean;
  isVisibleForStudents: boolean;
  version: string;
  updatedAt: string;
};

export type LabGamePublication = {
  gameId: string;
  published: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  pausedAt: string | null;
  pausedBy: string | null;
  visibilityRule: "admin_only" | "eligible_students";
};

export type LabGameAdminMetrics = {
  gameId: string;
  testRunsLast7d: number;
  publishedRunsLast7d: number;
  uniqueStudentsLast7d: number;
  averageAccuracyLast7d: number;
  averageXpLast7d: number;
};

export type LabGameListItem = {
  game: LabGameDefinition;
  publication: LabGamePublication;
  metrics: LabGameAdminMetrics;
};

