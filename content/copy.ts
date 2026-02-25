export const copy = {
  brand: {
    name: "InGenium Einstein",
    domain: "ingenium.einsteinhub.co",
    sloganLines: ["Compete quem estuda.", "Vence quem se prepara."],
    keyPhrases: [
      "Excelência se prova.",
      "Aqui, genialidade é desempenho.",
      "O campo de batalha da inteligência.",
    ],
  },
  program: {
    headline:
      "Programa de preparação para Olimpíadas Nacionais, com foco em desempenho acadêmico, constância e protagonismo.",
    xpSummary:
      "No InGenium, o XP é acumulado por participação, resultado e constância. A classificação é definida exclusivamente pelo desempenho acumulado.",
    xpRules: [
      {
        key: "profile-photo-upload",
        label: "Inserir foto de perfil",
        criteria: "Adicionar uma foto válida no perfil do aluno.",
        xp: 50,
      },
      {
        key: "top10-school-mock",
        label: "Top 10 no Simulado da Escola",
        criteria: "Estar entre os 10 primeiros do simulado interno da escola.",
        xp: 500,
      },
      {
        key: "weekly-study-group",
        label: "Grupo de estudo semanal",
        criteria: "Mínimo de 75% de presença no mês.",
        xp: 800,
      },
      {
        key: "volunteer-mentorship-bronze",
        label: "Monitoria voluntária (Lobo de Bronze)",
        criteria: "Atuação voluntária para apoio de alunos da liga Bronze.",
        xp: 2000,
      },
      {
        key: "perfect-quarter-attendance",
        label: "Frequência perfeita trimestral",
        criteria: "Presença integral nos encontros do programa no trimestre.",
        xp: 1200,
      },
    ],
    tiers: [
      {
        key: "gold",
        icon: "🥇",
        title: "Lobo Ouro",
        range: "20.000+ XP",
        desc: "Elite de performance nacional. Liderança, consistência e impacto acadêmico comprovados.",
      },
      {
        key: "silver",
        icon: "🥈",
        title: "Lobo Prata",
        range: "8.000 - 19.999 XP",
        desc: "Desempenho sólido e evolução contínua. Competidor preparado para resultados de alto nível.",
      },
      {
        key: "bronze",
        icon: "🥉",
        title: "Lobo Bronze",
        range: "0 - 7.999 XP",
        desc: "Base da jornada competitiva. Disciplina, presença e construção de repertório olímpico.",
      },
    ],
    goldAwards: [
      "Certificado oficial InGenium - Classe Ouro",
      "Jaqueta numerada do ano (colecionável)",
      "Troféu Lobo de Ouro",
      "Nome em mural físico + Hall digital",
    ],
    goldTop3Awards: [
      {
        place: "1º Lugar",
        items: [
          "Troféu Lobo de Ouro",
          "Experiência exclusiva acadêmica (mentoria individual com professor referência ou imersão acadêmica especial)",
          "Destaque institucional oficial (site + redes)",
        ],
      },
      {
        place: "2º Lugar",
        items: [
          "Troféu Lobo de Prata",
          "Kit acadêmico premium (livros estratégicos + material oficial InGenium)",
          "Destaque institucional",
        ],
      },
      {
        place: "3º Lugar",
        items: [
          "Troféu Lobo de Bronze",
          "Kit acadêmico oficial InGenium",
          "Reconhecimento público institucional",
        ],
      },
    ],
  },
};
