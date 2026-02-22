import React from "react";
import { View } from "react-native";
import { Text } from "../ui/Text";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  title: string;
  category: string | null;
  status: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
};

export default function OlympiadHeader({
  title,
  category,
  status,
  startDate,
  endDate,
  registrationDeadline,
}: Props) {
  return (
    <View
      style={{
        borderRadius: radii.xl,
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        padding: sizes.cardPadding,
      }}
    >
      <Text style={{ color: "white", fontSize: typography.titleLg.fontSize }} weight="bold">
        {title}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.60)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
        {category ?? "Categoria geral"} • {status ?? "status indefinido"}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.sm, fontSize: typography.subtitle.fontSize }}>
        Início: {startDate} • Fim: {endDate}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: typography.subtitle.fontSize }}>
        Inscrição até: {registrationDeadline}
      </Text>
    </View>
  );
}
