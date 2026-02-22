export type OlympiadProofFormat = {
  modalidade: string;
  estrutura: string;
  questoes: number;
  tipo: string;
  janelaAplicacao: string;
  duracao: string;
  regraInicio: string;
};

export type OlympiadSchedule = {
  registrationDeadline: string;
  examDate: string;
  appealsWindow: {
    start: string;
    end: string;
  };
  resultsDate: string;
  medalsRequestWindow: {
    start: string;
    end: string;
  };
  timezone: string;
};

export type OlympiadCatalogItem = {
  slug: string;
  name: string;
  organizer: string;
  category: string;
  mentorTeacher: string;
  officialUrl: string;
  regulationUrl: string;
  headline: string;
  shortDescription: string;
  longDescription: string;
  proofFormat: OlympiadProofFormat;
  schedule: OlympiadSchedule;
  tags: string[];
};

export type OlympiadDbShape = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
};

function assertRequired(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`Catálogo de olimpíadas inválido: campo obrigatório "${fieldName}" vazio.`);
  }
}

function validateItem(item: OlympiadCatalogItem) {
  assertRequired(item.slug, "slug");
  assertRequired(item.name, "name");
  assertRequired(item.organizer, "organizer");
  assertRequired(item.category, "category");
  assertRequired(item.mentorTeacher, "mentorTeacher");
  assertRequired(item.officialUrl, "officialUrl");
  assertRequired(item.regulationUrl, "regulationUrl");
  assertRequired(item.headline, "headline");
  assertRequired(item.shortDescription, "shortDescription");
  assertRequired(item.longDescription, "longDescription");
  assertRequired(item.proofFormat.modalidade, "proofFormat.modalidade");
  assertRequired(item.proofFormat.estrutura, "proofFormat.estrutura");
  assertRequired(item.proofFormat.tipo, "proofFormat.tipo");
  assertRequired(item.proofFormat.janelaAplicacao, "proofFormat.janelaAplicacao");
  assertRequired(item.proofFormat.duracao, "proofFormat.duracao");
  assertRequired(item.proofFormat.regraInicio, "proofFormat.regraInicio");
  assertRequired(item.schedule.registrationDeadline, "schedule.registrationDeadline");
  assertRequired(item.schedule.examDate, "schedule.examDate");
  assertRequired(item.schedule.appealsWindow.start, "schedule.appealsWindow.start");
  assertRequired(item.schedule.appealsWindow.end, "schedule.appealsWindow.end");
  assertRequired(item.schedule.resultsDate, "schedule.resultsDate");
  assertRequired(item.schedule.medalsRequestWindow.start, "schedule.medalsRequestWindow.start");
  assertRequired(item.schedule.medalsRequestWindow.end, "schedule.medalsRequestWindow.end");
  assertRequired(item.schedule.timezone, "schedule.timezone");
  if (item.proofFormat.questoes <= 0) {
    throw new Error('Catálogo de olimpíadas inválido: "proofFormat.questoes" deve ser maior que zero.');
  }
}

export const olympiadCatalog: OlympiadCatalogItem[] = [
  {
    slug: "obgp",
    name: "OBGP — Olimpíada Brasileira de Geopolítica",
    organizer: "Seleta Educação",
    category: "Humanas / Geopolítica",
    mentorTeacher: "Gisliane",
    officialUrl: "https://www.seletaeducacao.com.br/obgp-regulamento",
    regulationUrl: "https://www.seletaeducacao.com.br/obgp-regulamento",
    headline: "Entenda o mundo como ele funciona — e prove isso em prova.",
    shortDescription:
      "A OBGP coloca você no tabuleiro do mundo: relações internacionais, conflitos, alianças, economia e decisões globais. Excelente para repertório de atualidades e redação.",
    longDescription:
      "A OBGP é uma olimpíada que desafia alunos a interpretar o cenário internacional: poder entre países, geopolítica, economia global, conflitos, blocos, diplomacia e impactos no dia a dia. É indicada para quem curte atualidades, debate, história/geografia e quer repertório forte para redação e provas.",
    proofFormat: {
      modalidade: "Online",
      estrutura: "Fase única",
      questoes: 30,
      tipo: "Objetiva",
      janelaAplicacao: "07:00–23:00 (horário de Brasília)",
      duracao: "2 horas corridas",
      regraInicio: "Início máximo até 21:00 para completar as 2h",
    },
    schedule: {
      registrationDeadline: "2026-03-25",
      examDate: "2026-04-01",
      appealsWindow: {
        start: "2026-04-02",
        end: "2026-04-03",
      },
      resultsDate: "2026-04-08",
      medalsRequestWindow: {
        start: "2026-04-09",
        end: "2026-07-10",
      },
      timezone: "America/Sao_Paulo",
    },
    tags: ["Online", "Humanas", "Geopolítica", "Atualidades"],
  },
];

for (const item of olympiadCatalog) {
  validateItem(item);
}

function endOfDay(dateIso: string) {
  return new Date(`${dateIso}T23:59:59`);
}

function getStatusFromSchedule(schedule: OlympiadSchedule) {
  const now = new Date();
  if (now <= endOfDay(schedule.registrationDeadline)) return "open";
  if (now <= endOfDay(schedule.resultsDate)) return "upcoming";
  return "closed";
}

function toDbRow(item: OlympiadCatalogItem): OlympiadDbShape {
  return {
    id: item.slug,
    title: item.name,
    description: item.shortDescription,
    category: item.category,
    status: getStatusFromSchedule(item.schedule),
    start_date: item.schedule.examDate,
    end_date: item.schedule.examDate,
    registration_deadline: item.schedule.registrationDeadline,
  };
}

export function getOlympiadCatalogBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  return olympiadCatalog.find((item) => item.slug.toLowerCase() === normalized) ?? null;
}

export function mergeOlympiadsWithCatalog(rows: OlympiadDbShape[]) {
  const merged = new Map(rows.map((row) => [row.id, row]));
  for (const item of olympiadCatalog) {
    merged.set(item.slug, toDbRow(item));
  }
  return [...merged.values()].sort((a, b) => {
    const da = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER;
    const db = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}
