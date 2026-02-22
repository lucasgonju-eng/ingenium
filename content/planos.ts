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
  plans: [
    {
      id: "free",
      title: "Plano FREE",
      price: "Gratuito",
      cta: "Manter Plano Free",
      features: [
        { label: "Acesso app", included: true },
        { label: "Ranking", included: true },
        { label: "XP acumulado", included: true },
        { label: "Inscrição independente", included: true },
        { label: "Sem premiação no ranking", included: false },
        { label: "Sem camiseta oficial", included: false },
        { label: "Pagamentos individuais por prova", included: false },
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
        { label: "Inscrições ilimitadas inclusas", included: true, emphasis: true },
        { label: "Gestão direta time Einstein", included: true, emphasis: true },
        { label: "Gestão de calendário centralizada", included: true, emphasis: true },
        { label: "Ranking com premiação oficial", included: true, emphasis: true },
        { label: "Camiseta oficial inclusa", included: true, emphasis: true },
        { label: "Suporte prioritário", included: true, emphasis: true },
      ],
    },
  ] as PlanItem[],
  faq: [
    {
      question: "Como funciona o cancelamento?",
      answer: "O cancelamento pode ser solicitado pela família conforme regras do contrato vigente.",
    },
    {
      question: "Qual o período de fidelidade?",
      answer: "O plano segue ciclo anual com pagamento mensal. Consulte condições no termo de adesão.",
    },
    {
      question: "Quais provas estão inclusas no PRO?",
      answer: "O Plano PRO inclui inscrições nas olimpíadas elegíveis do calendário institucional.",
    },
    {
      question: "Posso migrar do FREE para o PRO?",
      answer: "Sim. A migração pode ser feita durante o período letivo, com ajuste proporcional quando aplicável.",
    },
  ] as FaqItem[],
};
