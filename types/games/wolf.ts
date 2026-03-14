export type WolfPhaseCategory = "reflexo" | "logica" | "conhecimento" | "lideranca";

export type WolfBand = "exploradores" | "cacadores" | "estrategistas";

export type WolfDifficulty = "easy" | "medium" | "hard";

export type WolfGrade =
  | "6º Ano"
  | "7º Ano"
  | "8º Ano"
  | "9º Ano"
  | "1ª Série"
  | "2ª Série"
  | "3ª Série";

export type WolfQuestion = {
  id: string;
  category: WolfPhaseCategory;
  grade: WolfGrade;
  band: WolfBand;
  difficulty: WolfDifficulty;
  prompt: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation: string;
  tags: string[];
  estimatedReadTime: number;
};

export type WolfBandTimerConfig = Record<WolfPhaseCategory, number>;

export type WolfTimerConfigByBand = Record<WolfBand, WolfBandTimerConfig>;

export type WolfXpBaseByHits = Record<0 | 1 | 2 | 3 | 4, number>;

export type WolfStreakBonusConfig = {
  streak3: number;
  streak5: number;
  streak10: number;
};

export type WolfAttemptsConfig = {
  attemptsPerDay: number;
  cooldownMinutes: number;
};

export type WolfProgressionRule = {
  level: "Filhote" | "Explorador" | "Caçador" | "Estrategista" | "Guardião" | "Mestre da Trilha";
  minXp: number;
  minTests: number;
  minAverageHits: number;
};

export type WolfQuestionRequestInput = {
  grade: WolfGrade;
  band: WolfBand;
  category: WolfPhaseCategory;
  difficulty: WolfDifficulty;
  maxChars: number;
};

export type WolfAiQuestionPayload = {
  category: WolfPhaseCategory;
  grade: WolfGrade;
  difficulty: WolfDifficulty;
  prompt: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation: string;
  tags: string[];
  estimatedReadTime: number;
};

export type WolfAttemptResult = {
  attemptNumber: number;
  hits: number;
  xpBase: number;
  xpStreakBonus: number;
  xpAwarded: number;
  completedAt: string;
};

export type WolfPercentileSnapshot = {
  percentile: number | null;
  message: string;
  seriesLabel: string;
  sampleSize: number;
};

