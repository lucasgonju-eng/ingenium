import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";

export default function AdminModeracaoScreen() {
  return (
    <StitchScaffoldScreen
      title="Moderação"
      subtitle="Mural e usuários"
      sections={[
        { title: "Fila de revisão", body: "Posts sinalizados por abuso, spam ou conteúdo fora de diretriz.", badge: "12 ITENS" },
        { title: "Gestão de perfis", body: "Bloqueio temporário, ajuste de permissões e trilha de auditoria." },
      ]}
      ctas={[
        { label: "Abrir fila" },
        { label: "Política", tone: "secondary" },
      ]}
    />
  );
}
