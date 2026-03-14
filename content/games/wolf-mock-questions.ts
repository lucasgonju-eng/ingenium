import type { WolfGrade, WolfPhaseCategory, WolfQuestion } from "../../types/games/wolf";
import { getWolfBandByGrade } from "./wolf-config";

type BaseMockQuestion = Omit<WolfQuestion, "id" | "grade" | "band">;

const baseByCategory: Record<WolfPhaseCategory, BaseMockQuestion[]> = {
  reflexo: [
    {
      category: "reflexo",
      difficulty: "easy",
      prompt: "Qual número completa a sequência com mais rapidez: 2, 4, 6, ?",
      options: ["7", "8", "9", "10"],
      correctOptionIndex: 1,
      explanation: "A sequência cresce de 2 em 2. O próximo número é 8.",
      tags: ["sequencia", "aritmetica", "rapidez"],
      estimatedReadTime: 6,
    },
    {
      category: "reflexo",
      difficulty: "medium",
      prompt: "Memória rápida: você viu 3 letras nesta ordem: B, D, F. Qual era a letra do meio?",
      options: ["B", "D", "F", "Nenhuma"],
      correctOptionIndex: 1,
      explanation: "A letra central da sequência B, D, F é D.",
      tags: ["memoria", "atencao"],
      estimatedReadTime: 7,
    },
  ],
  logica: [
    {
      category: "logica",
      difficulty: "medium",
      prompt: "Se todo lobo é mamífero e alguns mamíferos nadam, o que podemos afirmar com certeza?",
      options: [
        "Todo lobo nada",
        "Nenhum lobo nada",
        "Lobos são mamíferos",
        "Todo mamífero é lobo",
      ],
      correctOptionIndex: 2,
      explanation: "A única afirmação garantida pelas premissas é que lobos são mamíferos.",
      tags: ["deducao", "proposicoes"],
      estimatedReadTime: 10,
    },
    {
      category: "logica",
      difficulty: "hard",
      prompt: "Qual padrão continua melhor: AZ, BY, CX, ?",
      options: ["DW", "DX", "EV", "CV"],
      correctOptionIndex: 0,
      explanation: "Primeira letra avança (A,B,C,D) e a segunda recua (Z,Y,X,W).",
      tags: ["padrao", "sequencia"],
      estimatedReadTime: 9,
    },
  ],
  conhecimento: [
    {
      category: "conhecimento",
      difficulty: "medium",
      prompt: "Na maioria dos mapas, qual direção fica no topo?",
      options: ["Sul", "Norte", "Leste", "Oeste"],
      correctOptionIndex: 1,
      explanation: "Convencionalmente, o Norte fica na parte superior do mapa.",
      tags: ["geografia", "orientacao"],
      estimatedReadTime: 8,
    },
    {
      category: "conhecimento",
      difficulty: "hard",
      prompt: "Qual operação desfaz a potenciação x² quando x é não negativo?",
      options: ["Raiz quadrada", "Multiplicação por 2", "Divisão por 2", "Subtração de 2"],
      correctOptionIndex: 0,
      explanation: "A raiz quadrada é a operação inversa de elevar ao quadrado no domínio não negativo.",
      tags: ["matematica", "funcoes"],
      estimatedReadTime: 10,
    },
  ],
  lideranca: [
    {
      category: "lideranca",
      difficulty: "medium",
      prompt: "Seu grupo errou a estratégia e ficou tenso. Qual atitude é mais adequada?",
      options: [
        "Culpar quem errou primeiro",
        "Ignorar o problema e seguir",
        "Revisar o plano juntos com calma",
        "Sair do grupo para evitar desgaste",
      ],
      correctOptionIndex: 2,
      explanation: "Liderança saudável envolve responsabilidade compartilhada e correção com respeito.",
      tags: ["empatia", "colaboracao", "decisao"],
      estimatedReadTime: 11,
    },
    {
      category: "lideranca",
      difficulty: "hard",
      prompt: "Um colega está excluído na atividade. Qual decisão gera melhor resultado coletivo?",
      options: [
        "Manter o grupo como está para ganhar tempo",
        "Redistribuir tarefas para incluir o colega",
        "Pedir ao colega para observar sem participar",
        "Solicitar ao professor trocar o colega de turma",
      ],
      correctOptionIndex: 1,
      explanation: "Incluir com divisão equilibrada fortalece o desempenho e o clima do grupo.",
      tags: ["inclusao", "convivencia", "responsabilidade"],
      estimatedReadTime: 12,
    },
  ],
};

export function buildMockWolfQuestionsForGrade(grade: WolfGrade): WolfQuestion[] {
  const band = getWolfBandByGrade(grade);
  const categories: WolfPhaseCategory[] = ["reflexo", "logica", "conhecimento", "lideranca"];

  return categories.map((category, idx) => {
    const bank = baseByCategory[category];
    const selected = bank[idx % bank.length];
    return {
      ...selected,
      id: `mock-${grade}-${category}-${idx + 1}`,
      grade,
      band,
    };
  });
}

