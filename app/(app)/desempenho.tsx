import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";

export default function DesempenhoScreen() {
  return (
    <StitchScaffoldScreen
      title="Meu desempenho"
      subtitle="Métricas e evolução"
      sections={[
        { title: "Média geral", body: "Visualize tendência semanal da sua média nas últimas olimpíadas.", badge: "82.4" },
        { title: "Comparativo", body: "Seu desempenho está +6.2% acima da média dos alunos da mesma série." },
        { title: "Foco recomendado", body: "Priorize Física e Matemática nas próximas 2 semanas para subir para Lobo Ouro." },
      ]}
      ctas={[
        { label: "Ver ranking" },
        { label: "Ver olimpíadas", tone: "secondary" },
      ]}
    />
  );
}
