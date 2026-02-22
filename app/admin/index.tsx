import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";

export default function AdminDashboardScreen() {
  return (
    <StitchScaffoldScreen
      title="Admin"
      subtitle="Dashboard de coordenação"
      sections={[
        { title: "KPIs em tempo real", body: "Acompanhe inscrições, taxa de conclusão, NPS e engajamento por olimpíada.", badge: "LIVE" },
        { title: "Alertas críticos", body: "Pendências de moderação, inconsistências de pontuação e eventos próximos ao deadline." },
      ]}
      ctas={[
        { label: "Ver olimpíadas", tone: "secondary" },
        { label: "Abrir resultados" },
      ]}
    />
  );
}
