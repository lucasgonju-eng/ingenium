export type PlanFeature = {
  label: string;
  included: boolean;
  emphasis?: boolean;
};

export type PlanItem = {
  id: "free" | "pro";
  title: string;
  price: string;
  period?: string;
  subtitle?: string;
  badge?: string;
  cta: string;
  highlighted?: boolean;
  features: PlanFeature[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const planosContent = {
  heroTag: "Colégio Einstein",
  title: "Plano InGenium",
  subtitle: "Organização, desempenho e gestão da jornada olímpica.",
  description:
    "O InGenium estrutura a participação dos alunos do Colégio Einstein nas Olimpíadas Nacionais. Escolha a modalidade de participação.",
  compareCta: "Comparar planos",
  howItWorksTitle: "Como funciona",
  howItWorks: [
    {
      title: "1. Escolha a Olimpíada",
      text: "Selecione entre dezenas de competições nacionais disponíveis no calendário.",
    },
    {
      title: "2. Inscrição e Acompanhamento",
      text: "Nossa equipe realiza sua inscrição e te guia em todas as fases da prova.",
    },
    {
      title: "3. Desempenho e Pontos",
      text: "Seus resultados geram XP e reconhecimento institucional no ranking Einstein.",
    },
  ],
  quote:
    '"O InGenium não é apenas um ranking. É a consolidação da cultura olímpica do Colégio Einstein."',
  finalTitle: "Escolha a modalidade que melhor se adequa à sua jornada.",
  finalCta: "Aderir ao Plano PRO",
  finalNote: "Plano anual com pagamento facilitado.",
  sharedBenefits: [
    "Acesso ao app InGenium Einstein",
    "Aulas específicas para as Olimpíadas",
    "Ranking no app",
    "Gestão de calendário centralizada",
    "Inscrições ilimitadas para as Olimpíadas do calendário InGenium com custo zero",
    "Camiseta oficial inclusa",
    "Premiação para os melhores rankeados",
    "Suporte prioritário",
  ],
  plans: [
    {
      id: "free",
      title: "Plano FREE",
      price: "Gratuito",
      cta: "Manter Plano Free",
      features: [
        { label: "Acesso ao app InGenium Einstein", included: true },
        { label: "Aulas específicas para as Olimpíadas", included: true },
        { label: "Ranking no app", included: true },
        { label: "Gestão de calendário centralizada", included: true },
        { label: "Inscrições ilimitadas para as Olimpíadas do calendário InGenium com custo zero", included: false },
        { label: "Camiseta oficial inclusa", included: false },
        { label: "Premiação para os melhores rankeados", included: false },
        { label: "Suporte prioritário", included: false },
      ],
    },
    {
      id: "pro",
      title: "Plano PRO",
      price: "R$27",
      period: "/mês",
      subtitle: "Anual em 12x • 10% OFF no Pix • R$0,89/dia",
      badge: "Plano Completo",
      cta: "Selecionar Plano PRO",
      highlighted: true,
      features: [
        { label: "Acesso ao app InGenium Einstein", included: true, emphasis: true },
        { label: "Aulas específicas para as Olimpíadas", included: true, emphasis: true },
        { label: "Ranking no app", included: true, emphasis: true },
        { label: "Gestão de calendário centralizada", included: true, emphasis: true },
        { label: "Inscrições ilimitadas para as Olimpíadas do calendário InGenium com custo zero", included: true, emphasis: true },
        { label: "Camiseta oficial inclusa", included: true, emphasis: true },
        { label: "Premiação para os melhores rankeados", included: true, emphasis: true },
        { label: "Suporte prioritário", included: true, emphasis: true },
      ],
    },
  ] as PlanItem[],
  faq: [
    {
      question: "Posso cancelar?",
      answer:
        "Não. O valor pago é sobre o serviço anual da taxa de conveniência de todas as olimpíadas oferecidas no Plano PRO. Caso não seja usado, o valor pago não é ressarcido.",
    },
    {
      question: "Qual o período de fidelidade?",
      answer:
        "O período vai até 31 de dezembro das Olimpíadas inscritas no ano corrente. Exemplo: se uma Olimpíada nacional teve a inscrição em 2026 e a última etapa em 2027, ela está inclusa no Plano PRO. Caso a Olimpíada seja referente ao ano seguinte (2027, por exemplo), ela só estará inclusa na renovação da assinatura do Plano PRO.",
    },
    {
      question: "Quais provas estão inclusas no PRO?",
      answer: "O Plano PRO inclui inscrições nas olimpíadas elegíveis do calendário institucional.",
    },
    {
      question: "Posso migrar do FREE para o PRO?",
      answer:
        "Sim, porém ele se encerrará em 31 de dezembro do ano corrente da assinatura. Não há diminuição do valor sobre o serviço de conveniência.",
    },
  ] as FaqItem[],
};
