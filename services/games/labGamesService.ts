import { WOLF_GAME_ID, WOLF_GAME_SLUG, wolfAttemptsConfig, wolfProgressionRules, wolfStreakBonusConfig, wolfTimersByBand, wolfXpBaseByHits, WOLF_DAILY_XP_CAP } from "../../content/games/wolf-config";
import { fetchLabGamesAdminRpc, fetchWolfGameConfigAdminRpc, setLabGameStatusAdminRpc } from "../../lib/supabase/queries";
import type { LabGameDefinition, LabGameListItem, LabGamePublication, LabGameStatus } from "../../types/games/lab-games";

type MutableLabGameStore = {
  game: LabGameDefinition;
  publication: LabGamePublication;
  metrics: {
    testRunsLast7d: number;
    publishedRunsLast7d: number;
    uniqueStudentsLast7d: number;
    averageAccuracyLast7d: number;
    averageXpLast7d: number;
  };
};

const gameStore: MutableLabGameStore = {
  game: {
    id: WOLF_GAME_ID,
    slug: WOLF_GAME_SLUG,
    title: "Teste dos Lobos",
    subtitle: "Jogo assinatura da Trilha do Lobo",
    description: "Desafio pedagógico diário com 4 fases fixas e competição anônima por percentil.",
    signature: true,
    category: "logic",
    status: "internal_test",
    published: false,
    isVisibleForStudents: false,
    version: "v1-lab",
    updatedAt: new Date().toISOString(),
  },
  publication: {
    gameId: WOLF_GAME_ID,
    published: false,
    publishedAt: null,
    publishedBy: null,
    pausedAt: null,
    pausedBy: null,
    visibilityRule: "admin_only",
  },
  metrics: {
    testRunsLast7d: 12,
    publishedRunsLast7d: 0,
    uniqueStudentsLast7d: 0,
    averageAccuracyLast7d: 0,
    averageXpLast7d: 0,
  },
};

function toListItem(): LabGameListItem {
  return {
    game: { ...gameStore.game },
    publication: { ...gameStore.publication },
    metrics: { gameId: gameStore.game.id, ...gameStore.metrics },
  };
}

export async function listLabGamesForAdmin(): Promise<LabGameListItem[]> {
  try {
    const rows = await fetchLabGamesAdminRpc();
    if (rows.length > 0) {
      return rows.map((row) => ({
        game: {
          id: row.game_id,
          slug: row.slug,
          title: row.title,
          subtitle: row.subtitle ?? "Jogo em laboratório",
          description: row.description ?? "Sem descrição",
          signature: row.slug === WOLF_GAME_SLUG,
          category: "logic",
          status: (row.status as LabGameStatus) ?? "internal_test",
          published: row.published,
          isVisibleForStudents: row.visibility_rule === "eligible_students" && row.published,
          version: "v1",
          updatedAt: row.updated_at,
        },
        publication: {
          gameId: row.game_id,
          published: row.published,
          publishedAt: row.published ? row.updated_at : null,
          publishedBy: null,
          pausedAt: row.published ? null : row.updated_at,
          pausedBy: null,
          visibilityRule: row.visibility_rule === "eligible_students" ? "eligible_students" : "admin_only",
        },
        metrics: {
          gameId: row.game_id,
          testRunsLast7d: 0,
          publishedRunsLast7d: 0,
          uniqueStudentsLast7d: 0,
          averageAccuracyLast7d: 0,
          averageXpLast7d: 0,
        },
      }));
    }
  } catch {
    // fallback local
  }
  return [toListItem()];
}

export async function updateLabGameStatus(input: {
  gameId: string;
  status: LabGameStatus;
  actorEmail?: string | null;
}) {
  try {
    await setLabGameStatusAdminRpc({
      gameId: input.gameId,
      status: input.status,
      publish: input.status === "published",
    });
  } catch {
    // fallback local
  }

  if (input.gameId !== gameStore.game.id) throw new Error("Jogo não encontrado.");
  gameStore.game.status = input.status;
  gameStore.game.updatedAt = new Date().toISOString();

  if (input.status === "published") {
    gameStore.game.published = true;
    gameStore.game.isVisibleForStudents = true;
    gameStore.publication.published = true;
    gameStore.publication.publishedAt = new Date().toISOString();
    gameStore.publication.publishedBy = input.actorEmail ?? "admin";
    gameStore.publication.pausedAt = null;
    gameStore.publication.pausedBy = null;
    gameStore.publication.visibilityRule = "eligible_students";
  }

  if (input.status === "paused") {
    gameStore.game.published = false;
    gameStore.game.isVisibleForStudents = false;
    gameStore.publication.published = false;
    gameStore.publication.pausedAt = new Date().toISOString();
    gameStore.publication.pausedBy = input.actorEmail ?? "admin";
    gameStore.publication.visibilityRule = "admin_only";
  }

  if (input.status === "internal_test" || input.status === "development") {
    gameStore.game.published = false;
    gameStore.game.isVisibleForStudents = false;
    gameStore.publication.published = false;
    gameStore.publication.visibilityRule = "admin_only";
  }

  return toListItem();
}

export async function toggleLabGamePublication(input: {
  gameId: string;
  publish: boolean;
  actorEmail?: string | null;
}) {
  return updateLabGameStatus({
    gameId: input.gameId,
    status: input.publish ? "published" : "paused",
    actorEmail: input.actorEmail ?? null,
  });
}

export async function getWolfAdminConfigSnapshot() {
  try {
    const remote = await fetchWolfGameConfigAdminRpc();
    if (remote) {
      return {
        gameId: WOLF_GAME_ID,
        attemptsConfig: {
          attemptsPerDay: Number(remote.attempts_per_day ?? wolfAttemptsConfig.attemptsPerDay),
          cooldownMinutes: Number(remote.cooldown_minutes ?? wolfAttemptsConfig.cooldownMinutes),
        },
        xpBaseByHits: (remote.xp_base_by_hits as Record<string, number>) ?? wolfXpBaseByHits,
        streakBonus: (remote.streak_bonus as Record<string, number>) ?? wolfStreakBonusConfig,
        dailyXpCap: Number(remote.daily_xp_cap ?? WOLF_DAILY_XP_CAP),
        timersByBand: (remote.timers_by_band as Record<string, unknown>) ?? wolfTimersByBand,
        progressionRules: (remote.progression_rules as Array<Record<string, unknown>>) ?? wolfProgressionRules,
      };
    }
  } catch {
    // fallback local
  }

  return {
    gameId: WOLF_GAME_ID,
    attemptsConfig: wolfAttemptsConfig,
    xpBaseByHits: wolfXpBaseByHits,
    streakBonus: wolfStreakBonusConfig,
    dailyXpCap: WOLF_DAILY_XP_CAP,
    timersByBand: wolfTimersByBand,
    progressionRules: wolfProgressionRules,
  };
}

