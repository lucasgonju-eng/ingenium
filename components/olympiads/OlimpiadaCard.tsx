import React from "react";
import { Pressable, View } from "react-native";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";
import { OlympiadStatus } from "./olympiadStatus";

type Props = {
  title: string;
  subject?: string;
  mentorTeacher?: string;
  badges?: string[];
  status: OlympiadStatus;
  startAt?: string;
  registrationEndAt?: string;
  ctaLabel: string;
  onPress?: () => void;
  featured?: boolean;
};

export default function OlimpiadaCard({
  title,
  subject,
  mentorTeacher,
  badges,
  status,
  startAt,
  registrationEndAt,
  ctaLabel,
  onPress,
  featured = false,
}: Props) {
  const badgeText = status === "open" ? "ABERTA" : status === "closed" ? "ENCERRADA" : "EM BREVE";
  const badgeBg =
    status === "open" ? "rgba(52,211,153,0.16)" : status === "closed" ? "rgba(248,113,113,0.16)" : "rgba(255,255,255,0.10)";
  const badgeColor = status === "open" ? "#6EE7B7" : status === "closed" ? "#FCA5A5" : "rgba(255,255,255,0.8)";

  const ctaBg =
    status === "open" ? colors.einsteinYellow : status === "closed" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)";
  const ctaColor = status === "open" ? colors.einsteinBlue : colors.white;

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: featured ? colors.borderStrong : colors.borderSoft,
        backgroundColor: featured ? colors.surfaceCard : colors.surfacePanel,
        padding: sizes.compactCardPadding,
        ...shadows.soft,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
            {title}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2, fontSize: typography.small.fontSize }}>
            {subject ?? "Categoria geral"}
          </Text>
          {mentorTeacher ? (
            <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 2, fontSize: typography.small.fontSize }}>
              Mentor: {mentorTeacher}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          {badges?.map((badge) => (
            <View
              key={badge}
              style={{ paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: "rgba(56,189,248,0.14)" }}
            >
              <Text style={{ color: "#7DD3FC", fontSize: 10 }} weight="bold">
                {badge.toUpperCase()}
              </Text>
            </View>
          ))}
          <View style={{ paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: badgeBg }}>
            <Text style={{ color: badgeColor, fontSize: 10 }} weight="bold">
              {badgeText}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: spacing.sm }}>
        <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: typography.small.fontSize }}>
          Início: {startAt ?? "-"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: typography.small.fontSize }}>
          Inscrição: {registrationEndAt ?? "-"}
        </Text>
      </View>

      <Pressable
        onPress={onPress}
        disabled={!onPress || status === "upcoming"}
        style={{
          marginTop: spacing.sm,
          height: sizes.buttonHeight,
          borderRadius: radii.md,
          backgroundColor: ctaBg,
          alignItems: "center",
          justifyContent: "center",
          opacity: status === "upcoming" ? 0.9 : 1,
        }}
      >
        <Text style={{ color: ctaColor, fontSize: typography.small.fontSize }} weight="bold">
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}
