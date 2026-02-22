import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";

export default function AdminOlimpiadasScreen() {
  return (
    <StitchScaffoldScreen
      title="Gestão de Olimpíadas"
      subtitle="Administração de eventos"
      sections={[
        { title: "Publicadas", body: "Visualize e edite olimpíadas abertas, inscrições e cronogramas." },
        { title: "Rascunhos", body: "Prepare novas olimpíadas e regras de pontuação antes de publicar.", badge: "DRAFT" },
      ]}
      ctas={[
        { label: "Nova olimpíada" },
        { label: "Exportar", tone: "secondary" },
      ]}
    />
  );
}
