import { useLocalSearchParams } from "expo-router";
import React from "react";
import StitchScaffoldScreen from "../../components/stitch/StitchScaffoldScreen";
import { canonicalCatalogScreens } from "../../lib/stitch/canonicalScreens";

function slugFromRoute(route: string) {
  const parts = route.split("/");
  return parts[parts.length - 1];
}

function getSectionsForSlug(slug: string) {
  if (slug.startsWith("ds-")) {
    return [
      { title: "Paleta principal", body: "Cores institucionais, contraste e combinações válidas.", badge: "VARIÁVEIS" },
      { title: "Tipografia", body: "Escala de títulos, textos de apoio e hierarquia semântica." },
      { title: "Composição", body: "Regras de espaçamento, raio, sombra e estrutura de cards." },
    ];
  }
  if (slug.startsWith("cmp-")) {
    return [
      { title: "Variações", body: "Estados padrão, foco, destaque ao passar e desabilitado.", badge: "KIT UI" },
      { title: "Acessibilidade", body: "Tamanho mínimo de toque e contraste para leitura." },
      { title: "Uso recomendado", body: "Padrões de aplicação em contextos de produto." },
    ];
  }
  if (slug.startsWith("skel-")) {
    return [
      { title: "Estado de carregamento", body: "Espaço reservado visual para reduzir percepção de espera.", badge: "ESQUELETO" },
      { title: "Ritmo visual", body: "Blocos e linhas respeitam densidade da tela final." },
      { title: "Transição", body: "Substituição suave pelo conteúdo real quando a API responde." },
    ];
  }
  if (slug.startsWith("gami-")) {
    return [
      { title: "Progressão", body: "Sistema de classe, XP e recompensas por missão.", badge: "GAMI" },
      { title: "Retorno visual", body: "Confirmações visuais de conquista e evolução de nível." },
      { title: "Motivação", body: "Missões semanais e desafios para manter constância." },
    ];
  }
  if (slug.includes("ranking")) {
    return [
      { title: "Segmentação", body: "Ranking por categoria, olimpíada e período.", badge: "RANKING" },
      { title: "Critérios", body: "Média e elegibilidade com desempate padronizado." },
      { title: "Engajamento", body: "Ações para incentivar progressão no top 100." },
    ];
  }
  if (slug.includes("onboarding")) {
    return [
      { title: "Objetivos", body: "Definição de foco inicial do aluno e trilha personalizada.", badge: "INÍCIO" },
      { title: "Perfil inicial", body: "Preferências de matérias e nível de preparação." },
      { title: "Próximos passos", body: "Recomendações imediatas para começar na liga." },
    ];
  }
  return [
    { title: "Resumo", body: "Versão canônica da tela Stitch para referência visual.", badge: "CANÔNICO" },
    { title: "Comportamento", body: "Fluxos, estados e interações consistentes com o design." },
    { title: "Aplicação", body: "Base para evolução incremental das telas de produto." },
  ];
}

export default function StitchCatalogScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const key = Array.isArray(slug) ? slug[0] : slug;
  const screen = canonicalCatalogScreens.find((item) => slugFromRoute(item.route) === key);

  if (!screen || !key) {
    return (
      <StitchScaffoldScreen
        title="Tela não encontrada"
        subtitle="Catálogo Stitch"
        sections={[{ title: "Slug inválido", body: "A tela solicitada não está mapeada na matriz canônica." }]}
      />
    );
  }

  return (
    <StitchScaffoldScreen
      title={screen.title}
      subtitle={screen.screenId}
      sections={getSectionsForSlug(key)}
      ctas={[
        { label: "Canônico", tone: "secondary" },
        { label: "Implementado" },
      ]}
    />
  );
}
