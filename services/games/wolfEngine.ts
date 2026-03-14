import { wolfProgressionRules, wolfStreakBonusConfig, wolfXpBaseByHits, WOLF_DAILY_XP_CAP } from "../../content/games/wolf-config";
import type { WolfAttemptResult, WolfPercentileSnapshot, WolfProgressionRule } from "../../types/games/wolf";

export type WolfAttemptGateResult = {
  canStart: boolean;
  reason: string | null;
  nextAvailableAt: string | null;
  attemptsRemaining: number;
};

export function getWolfStreakBonus(streakDays: number): number {
  if (streakDays >= 10) return wolfStreakBonusConfig.streak10;
  if (streakDays >= 5) return wolfStreakBonusConfig.streak5;
  if (streakDays >= 3) return wolfStreakBonusConfig.streak3;
  return 0;
}

export function getWolfBaseXpByHits(hits: number): number {
  const normalized = Math.max(0, Math.min(4, Math.round(hits))) as 0 | 1 | 2 | 3 | 4;
  return wolfXpBaseByHits[normalized];
}

export function calculateWolfAttemptXp(input: { hits: number; streakDays: number; xpAlreadyAwardedToday: number }) {
  const xpBase = getWolfBaseXpByHits(input.hits);
  const xpStreakBonus = getWolfStreakBonus(input.streakDays);
  const desiredXp = xpBase + xpStreakBonus;
  const remainingToCap = Math.max(0, WOLF_DAILY_XP_CAP - Math.max(0, input.xpAlreadyAwardedToday));
  const xpAwarded = Math.min(desiredXp, remainingToCap);

  return {
    xpBase,
    xpStreakBonus,
    xpAwarded,
    capped: xpAwarded < desiredXp,
  };
}

export function canStartWolfAttempt(input: {
  attemptsUsedToday: number;
  attemptsPerDay: number;
  cooldownMinutes: number;
  nowIso: string;
  latestAttemptFinishedAtIso: string | null;
}): WolfAttemptGateResult {
  const remaining = Math.max(0, input.attemptsPerDay - input.attemptsUsedToday);
  if (remaining <= 0) {
    return {
      canStart: false,
      reason: "Você já utilizou as 3 tentativas de hoje.",
      nextAvailableAt: null,
      attemptsRemaining: 0,
    };
  }

  if (!input.latestAttemptFinishedAtIso) {
    return {
      canStart: true,
      reason: null,
      nextAvailableAt: null,
      attemptsRemaining: remaining,
    };
  }

  const now = new Date(input.nowIso);
  const last = new Date(input.latestAttemptFinishedAtIso);
  const cooldownMs = input.cooldownMinutes * 60 * 1000;
  const nextAvailableMs = last.getTime() + cooldownMs;

  if (Number.isNaN(now.getTime()) || Number.isNaN(last.getTime())) {
    return {
      canStart: true,
      reason: null,
      nextAvailableAt: null,
      attemptsRemaining: remaining,
    };
  }

  if (now.getTime() >= nextAvailableMs) {
    return {
      canStart: true,
      reason: null,
      nextAvailableAt: null,
      attemptsRemaining: remaining,
    };
  }

  return {
    canStart: false,
    reason: "Aguarde o intervalo entre tentativas para jogar novamente.",
    nextAvailableAt: new Date(nextAvailableMs).toISOString(),
    attemptsRemaining: remaining,
  };
}

export function getWolfBestAttempt(results: WolfAttemptResult[]): WolfAttemptResult | null {
  if (!results.length) return null;
  return [...results].sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    if (b.xpAwarded !== a.xpAwarded) return b.xpAwarded - a.xpAwarded;
    return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
  })[0] ?? null;
}

export type WolfProgressInput = {
  accumulatedXp: number;
  completedTests: number;
  averageHits: number;
};

export function computeWolfTrailProgress(input: WolfProgressInput) {
  const levels = wolfProgressionRules;
  let currentLevel: WolfProgressionRule = levels[0];
  let nextLevel: WolfProgressionRule | null = levels[1] ?? null;

  for (let idx = 0; idx < levels.length; idx += 1) {
    const candidate = levels[idx];
    const pass =
      input.accumulatedXp >= candidate.minXp &&
      input.completedTests >= candidate.minTests &&
      input.averageHits >= candidate.minAverageHits;
    if (pass) {
      currentLevel = candidate;
      nextLevel = levels[idx + 1] ?? null;
    } else {
      break;
    }
  }

  if (!nextLevel) {
    return {
      currentLevel: currentLevel.level,
      nextLevel: null,
      progressPct: 100,
      remaining: { xp: 0, tests: 0, averageHits: 0 },
    };
  }

  const xpPct = Math.min(1, input.accumulatedXp / nextLevel.minXp);
  const testPct = Math.min(1, input.completedTests / nextLevel.minTests);
  const avgPct = Math.min(1, input.averageHits / nextLevel.minAverageHits);
  const progressPct = Math.round(((xpPct + testPct + avgPct) / 3) * 100);

  return {
    currentLevel: currentLevel.level,
    nextLevel: nextLevel.level,
    progressPct,
    remaining: {
      xp: Math.max(0, nextLevel.minXp - input.accumulatedXp),
      tests: Math.max(0, nextLevel.minTests - input.completedTests),
      averageHits: Math.max(0, Number((nextLevel.minAverageHits - input.averageHits).toFixed(2))),
    },
  };
}

export function buildWolfPercentileSnapshot(input: {
  percentile: number | null;
  seriesLabel: string;
  sampleSize: number;
}): WolfPercentileSnapshot {
  if (input.percentile === null || input.sampleSize < 10) {
    return {
      percentile: null,
      seriesLabel: input.seriesLabel,
      sampleSize: input.sampleSize,
      message: "Ainda estamos reunindo resultados da sua série.",
    };
  }

  const p = Math.max(0, Math.min(99, Math.round(input.percentile)));
  const upperBand = 100 - p;
  const message =
    upperBand <= 20
      ? `Você está entre os ${upperBand}% melhores da sua série hoje.`
      : `Você foi melhor que ${p}% dos alunos da sua série hoje.`;

  return {
    percentile: p,
    seriesLabel: input.seriesLabel,
    sampleSize: input.sampleSize,
    message,
  };
}

