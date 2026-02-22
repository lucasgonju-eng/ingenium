import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";

export default function AdminResultadosScreen() {
  return (
    <StitchScaffoldScreen
      title="Resultados"
      subtitle="Pontuação e validação"
      sections={[
        { title: "Conferência automática", body: "Reprocessamento de médias, ranking e critérios de elegibilidade.", badge: "AUTO" },
        { title: "Correções manuais", body: "Ajuste exceções e publique lotes de resultado com histórico de auditoria." },
      ]}
      ctas={[
        { label: "Recalcular ranking" },
        { label: "Baixar relatório", tone: "secondary" },
      ]}
    />
  );
}
