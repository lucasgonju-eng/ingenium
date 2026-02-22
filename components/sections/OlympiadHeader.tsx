import React from "react";
import { View } from "react-native";
import { Text } from "../ui/Text";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  title: string;
  category: string | null;
  status: string | null;
  organizer?: string;
  mentorTeacher?: string;
  visualSealLabel?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
};

export default function OlympiadHeader({
  title,
  category,
  status,
  organizer,
  mentorTeacher,
  visualSealLabel,
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
      {visualSealLabel ? (
        <View
          style={{
            alignSelf: "flex-start",
            marginTop: spacing.xs,
            paddingHorizontal: spacing.xs,
            paddingVertical: 4,
            borderRadius: radii.pill,
            backgroundColor: "rgba(255,199,0,0.14)",
            borderWidth: 1,
            borderColor: "rgba(255,199,0,0.32)",
          }}
        >
          <Text style={{ color: colors.einsteinYellow, fontSize: 10 }} weight="bold">
            {visualSealLabel}
          </Text>
        </View>
      ) : null}
      {(organizer || mentorTeacher) ? (
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2, fontSize: typography.small.fontSize }}>
          {organizer ? `Organizador: ${organizer}` : ""}{organizer && mentorTeacher ? " • " : ""}{mentorTeacher ? `Mentor: ${mentorTeacher}` : ""}
        </Text>
      ) : null}
      <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.sm, fontSize: typography.subtitle.fontSize }}>
        Início: {startDate} • Fim: {endDate}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: typography.subtitle.fontSize }}>
        Inscrição até: {registrationDeadline}
      </Text>
    </View>
  );
}
