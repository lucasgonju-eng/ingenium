export type OlympiadFormat = {
  modalidade: string;
  estrutura: string;
  tipo?: string;
  questoes?: number;
  publico?: string;
  participation?: string;
  observacao?: string;
  janelaAplicacao?: string;
  duracao?: string;
  regraInicio?: string;
};

export type OlympiadCalendarEvent = {
  key: string;
  label: string;
  date?: string;
  start?: string;
  end?: string;
  note?: string;
  timeNote?: string;
  dateTbd?: boolean;
};

export type OlympiadSchedule = {
  timezone: string;
  displayTimezoneLabel?: string;
  calendarStatus?: string;
  calendarNote?: string;
  calendarYearConfirmed?: boolean;
  registrationStart?: string;
  registrationDeadline?: string;
  examDate?: string;
  appealsWindow?: {
    start: string;
    end: string;
  };
  resultsDate?: string;
  medalsRequestWindow?: {
    start: string;
    end: string;
  };
  finalPresentialNote?: string;
  calendarEvents?: OlympiadCalendarEvent[];
};

export type OlympiadHistoricalSchedule = {
  year: number;
  note: string;
  calendarEvents: OlympiadCalendarEvent[];
};

export type OlympiadCatalogItem = {
  slug: string;
  name: string;
  organizer: string;
  category: string;
  mentorTeacher: string;
  officialUrl: string;
  regulationUrl: string;
  regulationCtaLabel?: string;
  faqUrl?: string;
  visualSealLabel?: string;
  regulationNote?: string;
  headline: string;
  shortDescription: string;
  longDescription: string;
  format: OlympiadFormat;
  schedule: OlympiadSchedule;
  historicalSchedule?: OlympiadHistoricalSchedule;
  listBadges?: string[];
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
  assertRequired(item.format.modalidade, "format.modalidade");
  assertRequired(item.format.estrutura, "format.estrutura");
  assertRequired(item.schedule.timezone, "schedule.timezone");
  if (item.format.questoes !== undefined && item.format.questoes <= 0) {
    throw new Error('Catálogo de olimpíadas inválido: "format.questoes" deve ser maior que zero.');
  }
  if (!item.schedule.registrationDeadline && !item.schedule.calendarEvents?.length && !item.schedule.calendarStatus) {
    throw new Error(
      'Catálogo de olimpíadas inválido: informar "schedule.registrationDeadline", "schedule.calendarEvents" ou "schedule.calendarStatus".',
    );
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
    visualSealLabel: "SELETA OFICIAL",
    headline: "Entenda o mundo como ele funciona — e prove isso em prova.",
    shortDescription:
      "A OBGP coloca você no tabuleiro do mundo: relações internacionais, conflitos, alianças, economia e decisões globais. Excelente para repertório de atualidades e redação.",
    longDescription:
      "A OBGP é uma olimpíada que desafia alunos a interpretar o cenário internacional: poder entre países, geopolítica, economia global, conflitos, blocos, diplomacia e impactos no dia a dia. É indicada para quem curte atualidades, debate, história/geografia e quer repertório forte para redação e provas.",
    format: {
      modalidade: "Online",
      estrutura: "Fase única",
      questoes: 30,
      tipo: "Objetiva",
      janelaAplicacao: "07:00–23:00 (horário de Brasília)",
      duracao: "2 horas corridas",
      regraInicio: "Início máximo até 21:00 para completar as 2h",
    },
    schedule: {
      displayTimezoneLabel: "horário de Brasília",
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
    listBadges: ["Online"],
    tags: ["Online", "Humanas", "Geopolítica", "Atualidades"],
  },
  {
    slug: "obg",
    name: "OBG — Olimpíada Brasileira de Geografia",
    organizer: "OBG (portal oficial)",
    category: "Humanas / Geografia",
    mentorTeacher: "Gisliane",
    officialUrl: "https://www.obgeografia.com.br/",
    regulationUrl: "https://www.obgeografia.com.br/",
    regulationNote: "Regulamento e calendário publicados no portal oficial.",
    visualSealLabel: "OBG OFICIAL",
    headline: "Geografia de verdade: território, mundo e estratégia — em equipe.",
    shortDescription:
      "A OBG é uma competição que mistura geografia física e humana com desafios aplicados, leitura de mapas e análise do mundo real. Ideal pra quem curte humanas e trabalho em equipe.",
    longDescription:
      "A Olimpíada Brasileira de Geografia (OBG) desafia equipes a interpretarem mapas, fenômenos naturais, população, economia e geopolítica do Brasil e do mundo. É uma chance de competir em alto nível, aprender de forma aplicada e representar o Einstein em uma jornada com fases online e etapa presencial.",
    format: {
      modalidade: "Online (fases) + Presencial (final)",
      estrutura: "3 fases online + final presencial",
      participation: "Em equipe (padrão OBG)",
      observacao: "Cronograma com janelas por fase; final presencial ocorre na semana de novembro.",
    },
    schedule: {
      timezone: "America/Sao_Paulo",
      displayTimezoneLabel: "horário de Brasília",
      registrationStart: "2026-04-06",
      registrationDeadline: "2026-06-16",
      finalPresentialNote: "Final presencial: semana de novembro/2026 (data exata a confirmar no portal).",
      calendarEvents: [
        {
          key: "registrations",
          label: "Inscrições",
          start: "2026-04-06",
          end: "2026-06-16",
        },
        {
          key: "fase_1_online",
          label: "Fase 1 (online)",
          start: "2026-08-05",
          end: "2026-08-12",
        },
        {
          key: "divulgacao_classificados_medalhistas_estaduais",
          label: "Divulgação de classificados e medalhistas estaduais",
          date: "2026-09-01",
        },
        {
          key: "fase_2_online",
          label: "Fase 2 (online)",
          start: "2026-09-14",
          end: "2026-09-19",
        },
        {
          key: "fase_3_online",
          label: "Fase 3 (online)",
          start: "2026-10-05",
          end: "2026-10-10",
        },
        {
          key: "final_presencial",
          label: "Final presencial",
          note: "Semana de novembro/2026 (data exata a confirmar no portal).",
          dateTbd: true,
        },
      ],
    },
    listBadges: ["Online", "Final presencial"],
    tags: ["Online", "Final presencial", "Humanas", "Geografia", "Equipe"],
  },
  {
    slug: "canguru",
    name: "Canguru de Matemática Brasil",
    organizer: "UpMat Brasil",
    category: "Exatas / Matemática",
    mentorTeacher: "Professora Samantha",
    officialUrl: "https://www.cangurudematematicabrasil.com.br/",
    regulationUrl: "https://www.cangurudematematicabrasil.com.br/regulamento",
    regulationCtaLabel: "Ver regulamento",
    visualSealLabel: "UPMAT OFICIAL",
    headline: "A maior competição internacional de Matemática — e você pode medalhar.",
    shortDescription:
      "Prova objetiva e divertida, perfeita para treinar raciocínio lógico, ganhar ritmo de prova e representar o Einstein em uma competição global.",
    longDescription:
      "O Canguru de Matemática é uma competição internacional que incentiva o raciocínio lógico com questões criativas e objetivas. É uma porta de entrada excelente para cultura olímpica (e também para quem já compete), com aplicação organizada pela escola e resultados que valorizam desempenho e consistência.",
    format: {
      modalidade: "Aplicação na escola (impresso ou online, conforme escola)",
      estrutura: "Prova única",
      tipo: "Objetiva (múltipla escolha)",
      duracao: "1h40",
      publico: "Do 3º ano do Fundamental ao 3º do Ensino Médio",
      observacao: "Inscrição feita pela escola (não é inscrição individual).",
    },
    schedule: {
      timezone: "America/Sao_Paulo",
      displayTimezoneLabel: "horário de Brasília",
      registrationStart: "2026-03-19",
      registrationDeadline: "2026-03-25",
      examDate: "2026-03-19",
      resultsDate: "2026-06-02",
      medalsRequestWindow: {
        start: "2026-06-02",
        end: "2026-10-12",
      },
      calendarEvents: [
        {
          key: "janela_prova",
          label: "Janela de prova",
          start: "2026-03-19",
          end: "2026-03-25",
        },
        {
          key: "resultado",
          label: "Resultado",
          date: "2026-06-02",
        },
        {
          key: "janela_venda_medalhas",
          label: "Venda de medalhas",
          start: "2026-06-02",
          end: "2026-10-12",
        },
      ],
    },
    listBadges: ["Prova única", "Internacional"],
    tags: ["Exatas", "Matemática", "Internacional", "Prova única"],
  },
  {
    slug: "tnbio",
    name: "TNBio — Torneio Nacional de Biologia",
    organizer: "Seleta Educação",
    category: "Ciências da Natureza / Biologia",
    mentorTeacher: "Professora Aline",
    officialUrl: "https://www.seletaeducacao.com.br/tnbio",
    regulationUrl: "https://www.seletaeducacao.com.br/tnbio-regulamento",
    regulationCtaLabel: "Ver regulamento",
    visualSealLabel: "SELETA OFICIAL",
    headline: "Biologia pra quem quer crescer — do 6º ano ao Ensino Médio.",
    shortDescription:
      "Competição online com prova objetiva, ótima para entrar na cultura olímpica e medir desempenho em Biologia com calendário claro.",
    longDescription:
      "O TNBio é uma competição nacional de Biologia com prova online objetiva e fase única. É excelente para alunos que querem desenvolver repertório em Ciências da Vida, criar rotina de estudo e competir representando o Einstein — com uma experiência acessível e bem organizada.",
    format: {
      modalidade: "Online",
      estrutura: "Fase única",
      questoes: 30,
      tipo: "Objetiva",
      janelaAplicacao: "07:00–23:00 (horário de Brasília)",
      duracao: "2 horas corridas",
      regraInicio: "Início máximo até 21:00 para completar as 2h",
      observacao: "Prova online em janela ampla; resultados e certificados em data definida.",
    },
    schedule: {
      timezone: "America/Sao_Paulo",
      displayTimezoneLabel: "horário de Brasília",
      registrationStart: "2025-11-25",
      registrationDeadline: "2026-05-13",
      examDate: "2026-05-20",
      resultsDate: "2026-05-27",
      appealsWindow: {
        start: "2026-05-21",
        end: "2026-05-22",
      },
      medalsRequestWindow: {
        start: "2026-05-28",
        end: "2026-07-10",
      },
      calendarEvents: [
        { key: "inscricoes", label: "Inscrições", start: "2025-11-25", end: "2026-05-13" },
        { key: "prova_fase_unica", label: "Prova (fase única)", date: "2026-05-20" },
        { key: "recursos", label: "Recursos", start: "2026-05-21", end: "2026-05-22" },
        { key: "resultados_certificados", label: "Resultados e certificados", date: "2026-05-27" },
        { key: "solicitacao_medalhas", label: "Solicitação de medalhas", start: "2026-05-28", end: "2026-07-10" },
      ],
    },
    listBadges: ["Online", "Fase única"],
    tags: ["Biologia", "Ciências da Natureza", "Online", "Fase única"],
  },
  {
    slug: "obf",
    name: "OBF — Olimpíada Brasileira de Física",
    organizer: "Sociedade Brasileira de Física (SBF)",
    category: "Exatas / Física",
    mentorTeacher: "Professor Paulo Sergio",
    officialUrl: "https://www1.fisica.org.br/olimpiada/",
    regulationUrl: "https://www1.fisica.org.br/olimpiada/",
    regulationCtaLabel: "Edital / Portal da OBF",
    visualSealLabel: "SBF OFICIAL",
    headline: "Física de competição: problemas, lógica e performance.",
    shortDescription:
      "A OBF é a olimpíada oficial de Física da SBF e é referência nacional. Ideal pra quem gosta de desafios e quer treinar resolução de problemas em alto nível.",
    longDescription:
      "A OBF (Sociedade Brasileira de Física) é uma das olimpíadas acadêmicas mais tradicionais e reconhecidas do Brasil. Ela desenvolve raciocínio, modelagem e resolução de problemas — uma trilha excelente para alunos que querem competir forte, ganhar maturidade de prova e representar o Einstein em nível nacional.",
    format: {
      modalidade: "Fases (online/presencial variam por edição)",
      estrutura: "Múltiplas fases (calendário anual publicado pela SBF)",
      observacao:
        "O formato e as datas específicas devem ser confirmados no calendário oficial da edição vigente.",
      participation: "Múltiplas fases; datas variam por edição",
    },
    schedule: {
      timezone: "America/Sao_Paulo",
      displayTimezoneLabel: "horário de Brasília",
      calendarStatus: "A confirmar (aguardando publicação no site oficial)",
      calendarYearConfirmed: false,
      calendarNote:
        "O calendário oficial 2026 ainda não foi publicado no portal da OBF/SBF. Assim que sair, vamos atualizar aqui.",
    },
    historicalSchedule: {
      year: 2025,
      note: "Referência do último calendário publicado (2025). Não usar como data oficial de 2026.",
      calendarEvents: [
        { key: "fase_1_window", label: "Fase 1", start: "2025-06-13", end: "2025-06-14" },
        { key: "fase_2_date", label: "Fase 2", date: "2025-08-09" },
        { key: "fase_3_date", label: "Fase 3", date: "2025-10-18" },
      ],
    },
    listBadges: ["Calendário 2026: a confirmar"],
    tags: ["Exatas", "Física", "Calendário a confirmar", "SBF"],
  },
  {
    slug: "obb",
    name: "OBB — Olimpíada Brasileira de Biologia",
    organizer: "Instituto Butantan",
    category: "Ciências da Natureza / Biologia",
    mentorTeacher: "Professora Aline",
    officialUrl: "https://olimpiadasdebiologia.butantan.gov.br/",
    regulationUrl: "https://olimpiadasdebiologia.butantan.gov.br/cronograma",
    regulationCtaLabel: "Ver cronograma / edital",
    visualSealLabel: "BUTANTAN OFICIAL",
    headline: "Biologia em alto nível: etapas, seleção e reconhecimento nacional.",
    shortDescription:
      "A OBB é uma das olimpíadas mais fortes de Biologia do país, com fases eliminatórias e trilha clara de evolução. Ideal pra quem quer aprofundar e competir sério.",
    longDescription:
      "A OBB (Butantan) é uma competição de Biologia de alto nível, com etapas eliminatórias e calendário bem definido. É perfeita para alunos que querem aprofundamento real, rotina de estudo e performance — além de ser uma vitrine acadêmica forte para o Einstein no cenário nacional.",
    format: {
      modalidade: "Online (fases) + etapas avançadas",
      estrutura: "3 fases + capacitação/seletiva (virtual e presencial)",
      tipo: "Fases com datas definidas (inclui horário fixo na Fase 3)",
      participation: "3 fases + capacitação/seletiva",
      observacao: "A escola tem tarefas operacionais (confirmações/inserções) entre fases.",
    },
    schedule: {
      timezone: "America/Sao_Paulo",
      displayTimezoneLabel: "horário de Brasília",
      registrationStart: "2026-01-15",
      registrationDeadline: "2026-02-25",
      examDate: "2026-03-03",
      calendarEvents: [
        { key: "inscricoes", label: "Inscrições", start: "2026-01-15", end: "2026-02-25" },
        { key: "fase_1", label: "Fase 1", date: "2026-03-03" },
        { key: "fase_2", label: "Fase 2", date: "2026-03-18" },
        { key: "fase_3", label: "Fase 3", date: "2026-04-14", timeNote: "10:00 (horário de Brasília)" },
        { key: "capacitacao_seletiva_virtual", label: "Capacitação/Seletiva (virtual)", start: "2026-05-07", end: "2026-05-08" },
        { key: "capacitacao_seletiva_presencial", label: "Capacitação/Seletiva (presencial)", start: "2026-05-11", end: "2026-05-16" },
      ],
    },
    listBadges: ["Alto nível", "Etapas"],
    tags: ["Biologia", "Ciências da Natureza", "Alto nível", "Etapas"],
  },
  {
    slug: "onhb",
    name: "ONHB — Olimpíada Nacional em História do Brasil",
    organizer: "Unicamp (IFCH — Projeto de Extensão)",
    category: "Humanas / História",
    mentorTeacher: "Professora Gabi",
    officialUrl: "https://www.olimpiadadehistoria.com.br/",
    regulationUrl: "https://www.olimpiadadehistoria.com.br/calendario/index",
    faqUrl: "https://www.olimpiadadehistoria.com.br/paginas/onhb18/duvidas",
    visualSealLabel: "UNICAMP OFICIAL",
    headline: "História não é decorar: é investigar. Em equipe.",
    shortDescription:
      "A ONHB é uma olimpíada em equipe, com fases online semanais e final presencial. Você aprende História do Brasil analisando fontes, tomando decisões e resolvendo desafios reais.",
    longDescription:
      "A ONHB (Unicamp) é uma competição nacional que transforma História do Brasil em investigação: interpretação de documentos, imagens, mapas e textos, com desafios semanais em equipe. É perfeita para quem gosta de humanas, leitura, estratégia e quer repertório forte para redação, debates e formação crítica — representando o Einstein no cenário nacional.",
    format: {
      modalidade: "Online (5 fases) + Presencial (final nacional)",
      estrutura: "5 fases online (tarefas semanais) + final presencial",
      participation: "Em equipe (3 estudantes) com professor(a) orientador(a)",
      observacao:
        "As fases online ocorrem em janelas de alguns dias, com tarefas/questões por fase. Final nacional presencial e cerimônia de premiação em datas definidas no calendário.",
    },
    schedule: {
      timezone: "America/Sao_Paulo",
      displayTimezoneLabel: "horário de Brasília",
      registrationStart: "2026-02-15",
      registrationDeadline: "2026-04-24",
      calendarEvents: [
        { key: "inscricoes", label: "Inscrições", start: "2026-02-15", end: "2026-04-24" },
        { key: "fase_1", label: "Fase 1 (online)", start: "2026-05-04", end: "2026-05-09" },
        { key: "fase_2", label: "Fase 2 (online)", start: "2026-05-11", end: "2026-05-16" },
        { key: "fase_3", label: "Fase 3 (online)", start: "2026-05-18", end: "2026-05-23" },
        { key: "fase_4", label: "Fase 4 (online)", start: "2026-05-25", end: "2026-05-30" },
        { key: "fase_5", label: "Fase 5 (online)", start: "2026-06-08", end: "2026-06-13" },
        { key: "selecao_final", label: "Seleção para final", date: "2026-06-19" },
        { key: "medalhistas_estaduais", label: "Medalhistas estaduais", date: "2026-06-26" },
        { key: "final_presencial", label: "Final presencial", date: "2026-08-29" },
        { key: "cerimonia_premiacao", label: "Cerimônia de premiação", date: "2026-08-30" },
      ],
    },
    listBadges: ["Em equipe", "Online", "Final presencial"],
    tags: ["Humanas", "História", "Equipe", "Online", "Final presencial"],
  },
];

for (const item of olympiadCatalog) {
  validateItem(item);
}

function endOfDay(dateIso: string) {
  return new Date(`${dateIso}T23:59:59`);
}

function getFirstEventDate(schedule: OlympiadSchedule) {
  const dates = (schedule.calendarEvents ?? [])
    .map((event) => event.start ?? event.date)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

function getStatusFromSchedule(schedule: OlympiadSchedule) {
  if (schedule.calendarYearConfirmed === false) return "upcoming";

  const now = new Date();
  if (schedule.registrationStart && schedule.registrationDeadline) {
    const start = new Date(`${schedule.registrationStart}T00:00:00`);
    const end = endOfDay(schedule.registrationDeadline);
    if (now < start) return "upcoming";
    if (now <= end) return "open";
  } else if (schedule.registrationDeadline) {
    if (now <= endOfDay(schedule.registrationDeadline)) return "open";
  }

  if (schedule.resultsDate && now <= endOfDay(schedule.resultsDate)) return "upcoming";
  if (schedule.examDate && now <= endOfDay(schedule.examDate)) return "upcoming";
  const firstEventDate = getFirstEventDate(schedule);
  if (firstEventDate && now <= endOfDay(firstEventDate)) return "upcoming";
  return "closed";
}

function toDbRow(item: OlympiadCatalogItem): OlympiadDbShape {
  const firstEventDate = getFirstEventDate(item.schedule);
  return {
    id: item.slug,
    title: item.name,
    description: item.shortDescription,
    category: item.category,
    status: getStatusFromSchedule(item.schedule),
    start_date: item.schedule.examDate ?? firstEventDate,
    end_date: item.schedule.examDate ?? firstEventDate,
    registration_deadline: item.schedule.registrationDeadline ?? null,
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
