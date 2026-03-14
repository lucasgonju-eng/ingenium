import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import { Text } from "../../ui/Text";
import LabGameCard from "./LabGameCard";
import type { LabGameAction, LabGameListItem } from "../../../types/games/lab-games";
import type { WolfAiQuestionPayload } from "../../../types/games/wolf";

type Props = {
  items: LabGameListItem[];
  loading: boolean;
  canPublish: boolean;
  canAccessLab: boolean;
  configSummary: {
    attemptsPerDay: number;
    cooldownMinutes: number;
    dailyXpCap: number;
  };
  generatedQuestion: WolfAiQuestionPayload | null;
  generatedQuestionSource: "ai" | "mock" | null;
  generatingQuestion: boolean;
  onGenerateQuestion: () => void;
  onRefresh: () => void;
  onAction: (action: LabGameAction, item: LabGameListItem) => void;
};

export default function AdminLabGamesSection({
  items,
  loading,
  canPublish,
  canAccessLab,
  configSummary,
  generatedQuestion,
  generatedQuestionSource,
  generatingQuestion,
  onGenerateQuestion,
  onRefresh,
  onAction,
}: Props) {
  const activeEventBadge = useMemo(() => "Semana da Lógica (estrutura pronta)", []);

  if (!canAccessLab) {
    return (
      <View style={cardStyle}>
        <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
          Lab Games
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, lineHeight: 20 }}>
          Esta área é exclusiva do administrador principal para testes e publicação de jogos.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={cardStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
              Lab Games
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4, lineHeight: 20 }}>
              Área de teste interno para validar jogos antes da liberação para alunos.
            </Text>
          </View>
          <Pressable onPress={onRefresh} style={refreshBtnStyle}>
            <Text style={{ color: colors.white }} weight="semibold">
              Atualizar
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>Tentativas / dia</Text>
            <Text style={summaryValueStyle} weight="bold">
              {configSummary.attemptsPerDay}
            </Text>
          </View>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>Intervalo</Text>
            <Text style={summaryValueStyle} weight="bold">
              {configSummary.cooldownMinutes} min
            </Text>
          </View>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>Teto XP diário</Text>
            <Text style={summaryValueStyle} weight="bold">
              {configSummary.dailyXpCap} XP
            </Text>
          </View>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>Evento ativo</Text>
            <Text style={summaryValueStyle} weight="bold">
              {activeEventBadge}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          <Pressable onPress={onGenerateQuestion} disabled={generatingQuestion} style={generateButtonStyle}>
            <Text style={{ color: colors.einsteinBlue }} weight="bold">
              {generatingQuestion ? "Gerando questão..." : "Disparar geração de questão teste (IA)"}
            </Text>
          </Pressable>

          {generatedQuestion ? (
            <View style={previewBoxStyle}>
              <Text style={{ color: colors.white }} weight="semibold">
                Prévia da questão gerada {generatedQuestionSource ? `(${generatedQuestionSource.toUpperCase()})` : ""}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.84)", marginTop: 6, lineHeight: 20 }}>
                {generatedQuestion.prompt}
              </Text>
              <View style={{ marginTop: 8, gap: 4 }}>
                {generatedQuestion.options.map((option, idx) => (
                  <Text key={`${option}-${idx}`} style={{ color: "rgba(255,255,255,0.76)" }}>
                    {idx + 1}. {option}
                  </Text>
                ))}
              </View>
              <Text style={{ color: colors.einsteinYellow, marginTop: 8 }}>
                Resposta correta: opção {generatedQuestion.correctOptionIndex + 1}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.70)", marginTop: 4 }}>
                Explicação: {generatedQuestion.explanation}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={cardStyle}>
          <Text style={{ color: "rgba(255,255,255,0.78)" }}>Carregando jogos em laboratório...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={cardStyle}>
          <Text style={{ color: "rgba(255,255,255,0.78)" }}>
            Ainda não existem jogos cadastrados no laboratório. O primeiro jogo será o Teste dos Lobos.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <LabGameCard key={item.game.id} item={item} canPublish={canPublish} onAction={onAction} />
        ))
      )}
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

const refreshBtnStyle = {
  height: 38,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.06)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: spacing.sm,
};

const summaryPillStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 8,
  minWidth: 112,
};

const summaryLabelStyle = {
  color: "rgba(255,255,255,0.68)",
  fontSize: 11,
};

const summaryValueStyle = {
  color: colors.einsteinYellow,
  marginTop: 2,
  fontSize: 12,
};

const generateButtonStyle = {
  minHeight: 42,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.einsteinYellow,
  paddingHorizontal: spacing.sm,
};

const previewBoxStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

