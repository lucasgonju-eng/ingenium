import { Pressable, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import { Text } from "../../ui/Text";
import type { LabGameAction, LabGameListItem, LabGameStatus } from "../../../types/games/lab-games";

const statusUi: Record<LabGameStatus, { label: string; border: string; bg: string; text: string }> = {
  development: {
    label: "Em desenvolvimento",
    border: "rgba(147,197,253,0.48)",
    bg: "rgba(30,64,175,0.20)",
    text: "#bfdbfe",
  },
  internal_test: {
    label: "Em teste interno",
    border: "rgba(251,191,36,0.48)",
    bg: "rgba(146,64,14,0.22)",
    text: "#fde68a",
  },
  published: {
    label: "Publicado",
    border: "rgba(74,222,128,0.48)",
    bg: "rgba(21,128,61,0.22)",
    text: "#86efac",
  },
  paused: {
    label: "Pausado",
    border: "rgba(252,165,165,0.48)",
    bg: "rgba(127,29,29,0.22)",
    text: "#fecaca",
  },
};

type Props = {
  item: LabGameListItem;
  canPublish: boolean;
  onAction: (action: LabGameAction, item: LabGameListItem) => void;
};

export default function LabGameCard({ item, canPublish, onAction }: Props) {
  const statusInfo = statusUi[item.game.status];
  const actionButtons: Array<{ action: LabGameAction; label: string; tone: "primary" | "secondary" | "danger" }> = [
    { action: "view", label: "Visualizar", tone: "secondary" },
    { action: "edit_settings", label: "Editar configurações", tone: "secondary" },
    { action: "test_game", label: "Testar jogo", tone: "primary" },
    { action: "simulate_student_view", label: "Simular visão aluno", tone: "secondary" },
    ...(item.publication.published
      ? [{ action: "unpublish" as const, label: "Despublicar / pausar", tone: "danger" as const }]
      : [{ action: "publish" as const, label: "Publicar para alunos", tone: "primary" as const }]),
  ];

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            {item.game.title}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: 2 }}>{item.game.subtitle}</Text>
          <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 6, lineHeight: 20 }}>{item.game.description}</Text>
        </View>
        <View
          style={{
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: statusInfo.border,
            backgroundColor: statusInfo.bg,
            paddingHorizontal: spacing.xs,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: statusInfo.text, fontSize: 11 }} weight="bold">
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        <View style={metricPillStyle}>
          <Text style={metricLabelStyle}>Versão</Text>
          <Text style={metricValueStyle} weight="bold">
            {item.game.version}
          </Text>
        </View>
        <View style={metricPillStyle}>
          <Text style={metricLabelStyle}>Testes 7d</Text>
          <Text style={metricValueStyle} weight="bold">
            {item.metrics.testRunsLast7d}
          </Text>
        </View>
        <View style={metricPillStyle}>
          <Text style={metricLabelStyle}>Alunos 7d</Text>
          <Text style={metricValueStyle} weight="bold">
            {item.metrics.uniqueStudentsLast7d}
          </Text>
        </View>
        <View style={metricPillStyle}>
          <Text style={metricLabelStyle}>Acerto médio</Text>
          <Text style={metricValueStyle} weight="bold">
            {item.metrics.averageAccuracyLast7d.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
        {actionButtons.map((btn) => {
          const disabled = (btn.action === "publish" || btn.action === "unpublish") && !canPublish;
          const isPrimary = btn.tone === "primary";
          const isDanger = btn.tone === "danger";
          return (
            <Pressable
              key={`${item.game.id}-${btn.action}`}
              onPress={() => onAction(btn.action, item)}
              disabled={disabled}
              style={{
                minHeight: 42,
                borderRadius: radii.md,
                paddingHorizontal: spacing.sm,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: isPrimary ? 0 : 1,
                borderColor: isDanger ? "rgba(252,165,165,0.45)" : colors.borderSoft,
                backgroundColor: isPrimary
                  ? colors.einsteinYellow
                  : isDanger
                    ? "rgba(127,29,29,0.24)"
                    : "rgba(255,255,255,0.06)",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color: isPrimary ? colors.einsteinBlue : isDanger ? "#fecaca" : colors.white,
                  fontSize: typography.small.fontSize,
                }}
                weight="semibold"
              >
                {btn.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const metricPillStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 8,
  minWidth: 110,
};

const metricLabelStyle = {
  color: "rgba(255,255,255,0.68)",
  fontSize: 11,
};

const metricValueStyle = {
  color: colors.einsteinYellow,
  marginTop: 2,
};

