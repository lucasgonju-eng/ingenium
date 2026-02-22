import { router } from "expo-router";
import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";

export default function OlimpiadaDetalheScreen() {
  return (
    <StitchScaffoldScreen
      title="Detalhes da olimpíada"
      subtitle="Inscrição e regulamento"
      sections={[
        { title: "OBM - 2ª Fase", body: "Categoria Matemática • Nacional • início em 12 Nov.", badge: "ABERTA" },
        { title: "Regulamento", body: "Confira critérios de pontuação, desempate e política de participação." },
        { title: "Material recomendado", body: "Lista de exercícios, trilha de revisão e simulados oficiais." },
      ]}
      ctas={[
        { label: "Abrir tela completa", onPress: () => router.push("/olimpiadas") },
        { label: "Voltar", onPress: () => router.back(), tone: "secondary" },
      ]}
    />
  );
}
