import React from "react";
import { View } from "react-native";
import { Text } from "../ui/Text";
import { MyRankGeralMedia } from "../../lib/supabase/queries";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  rankInfo: MyRankGeralMedia | null;
};

export default function RankingEligibilityCard({ rankInfo }: Props) {
  const message =
    rankInfo === null
      ? "Ainda sem pontuacao registrada. Participe de olimpiadas para entrar no ranking geral."
      : rankInfo.is_eligible
        ? `Elegivel: Sim • Posicao #${rankInfo.position ?? "-"} • Media ${rankInfo.avg_points?.toFixed(2) ?? "-"}`
        : `Elegivel: Nao • Faltam ${rankInfo.missing_olympiads} olimpiada(s) para entrar no ranking geral.`;

  return (
    <View
      style={{
        marginTop: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.surfacePanel,
        padding: sizes.compactCardPadding,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        ...shadows.soft,
      }}
    >
      <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: typography.subtitle.fontSize }}>{message}</Text>
    </View>
  );
}
