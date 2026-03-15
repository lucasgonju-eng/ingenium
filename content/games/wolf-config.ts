import type {
  WolfAttemptsConfig,
  WolfBand,
  WolfGrade,
  WolfProgressionRule,
  WolfStreakBonusConfig,
  WolfTimerConfigByBand,
  WolfXpBaseByHits,
} from "../../types/games/wolf";

export const WOLF_GAME_ID = "game_teste_dos_lobos";
export const WOLF_GAME_SLUG = "teste-dos-lobos";

export const wolfBandByGrade: Record<WolfGrade, WolfBand> = {
  "6º Ano": "exploradores",
  "7º Ano": "exploradores",
  "8º Ano": "cacadores",
  "9º Ano": "cacadores",
  "1ª Série": "estrategistas",
  "2ª Série": "estrategistas",
  "3ª Série": "estrategistas",
};

export const wolfTimersByBand: WolfTimerConfigByBand = {
  exploradores: {
    reflexo: 10,
    logica: 22,
    conhecimento: 18,
    lideranca: 22,
  },
  cacadores: {
    reflexo: 8,
    logica: 18,
    conhecimento: 15,
    lideranca: 18,
  },
  estrategistas: {
    reflexo: 7,
    logica: 15,
    conhecimento: 12,
    lideranca: 15,
  },
};

export const wolfAttemptsConfig: WolfAttemptsConfig = {
  attemptsPerDay: 4,
  cooldownMinutes: 10,
};

export const wolfXpBaseByHits: WolfXpBaseByHits = {
  0: 2,
  1: 5,
  2: 10,
  3: 15,
  4: 20,
};

export const wolfStreakBonusConfig: WolfStreakBonusConfig = {
  streak3: 2,
  streak5: 3,
  streak10: 5,
};

export const WOLF_DAILY_XP_CAP = 25;

export const wolfProgressionRules: WolfProgressionRule[] = [
  { level: "Filhote", minXp: 0, minTests: 0, minAverageHits: 0 },
  { level: "Explorador", minXp: 80, minTests: 5, minAverageHits: 2 },
  { level: "Caçador", minXp: 200, minTests: 12, minAverageHits: 2.5 },
  { level: "Estrategista", minXp: 400, minTests: 25, minAverageHits: 3 },
  { level: "Guardião", minXp: 700, minTests: 40, minAverageHits: 3.2 },
  { level: "Mestre da Trilha", minXp: 1000, minTests: 60, minAverageHits: 3.5 },
];

export const wolfInspirationalMessages = [
  "A consistência fortalece a mente.",
  "Hoje você avançou mais um passo na trilha.",
  "Disciplina também é inteligência.",
  "Seu foco de hoje constrói seu resultado de amanhã.",
];

export function getWolfBandByGrade(grade: WolfGrade): WolfBand {
  return wolfBandByGrade[grade];
}

