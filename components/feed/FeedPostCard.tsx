import React from "react";
import { Pressable, View } from "react-native";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";
import AvatarWithFallback from "../ui/AvatarWithFallback";
import FeedPostActions from "./FeedPostActions";

type Props = {
  authorName: string;
  authorAvatar?: string | null;
  body: string;
  createdAt: string;
  kind?: "announcement" | "highlight" | "tip";
  title?: string;
  ctaLabel?: string;
  badge?: string;
};

function fmtDate(dateIso: string) {
  const d = new Date(dateIso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function FeedPostCard({ authorName, authorAvatar, body, createdAt, kind, title, ctaLabel, badge }: Props) {
  if (kind === "announcement") {
    return (
      <View
        style={{
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: colors.einsteinBlue,
          padding: sizes.cardPadding,
          ...shadows.hero,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.22)" }}>
            <Text style={{ color: colors.white, fontSize: 9 }} weight="bold">
              ANÚNCIO OFICIAL
            </Text>
          </View>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.16)" }}>
            <Text style={{ color: colors.white, fontSize: 9 }} weight="bold">
              {badge ?? "Fase 2"}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize, marginTop: spacing.sm }} weight="bold">
          {title ?? "Comunicado oficial"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: spacing.xs, lineHeight: 20 }}>{body}</Text>
        <Pressable
          style={{
            marginTop: spacing.sm,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.white,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.md,
          }}
        >
          <Text style={{ color: colors.einsteinBlue, fontSize: typography.small.fontSize }} weight="bold">
            {ctaLabel ?? "Ver cronograma"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (kind === "highlight") {
    return (
      <View
        style={{
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          backgroundColor: colors.surfacePanel,
          padding: sizes.compactCardPadding,
          ...shadows.soft,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
            InGenium Destaques
          </Text>
          <View style={{ paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: "rgba(255,199,0,0.18)" }}>
            <Text style={{ color: colors.einsteinYellow, fontSize: 10 }} weight="bold">
              {badge ?? "DESTAQUE"}
            </Text>
          </View>
        </View>
        <View
          style={{
            marginTop: spacing.sm,
            borderRadius: radii.md,
            height: 148,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.62)" }}>Imagem destaque</Text>
          </View>
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 18,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />
        </View>
        <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: spacing.sm, lineHeight: 20 }}>{body}</Text>
        <FeedPostActions likes={142} comments={24} />
      </View>
    );
  }

  if (kind === "tip") {
    return (
      <View
        style={{
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          backgroundColor: colors.surfacePanel,
          padding: sizes.compactCardPadding,
          ...shadows.soft,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
            Dicas de estudo
          </Text>
          <View style={{ paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radii.sm, backgroundColor: "rgba(34,197,94,0.18)" }}>
            <Text style={{ color: "#86efac", fontSize: 10 }} weight="bold">
              DICA
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.white, marginTop: spacing.sm, fontSize: typography.titleMd.fontSize }} weight="bold">
          {title ?? "Estratégia para Física Moderna"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: spacing.xs, lineHeight: 20 }}>{body}</Text>
        <Pressable style={{ marginTop: 6 }}>
          <Text style={{ color: colors.linkBlue, fontSize: typography.small.fontSize }} weight="semibold">
            Ver conteúdo completo
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: sizes.compactCardPadding,
        ...shadows.soft,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1 }}>
          <AvatarWithFallback fullName={authorName} avatarUrl={authorAvatar} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
              {authorName}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: typography.small.fontSize }}>
              Comunidade
            </Text>
          </View>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: typography.small.fontSize }}>{fmtDate(createdAt)}</Text>
      </View>

      <Text style={{ color: "rgba(255,255,255,0.9)", marginTop: spacing.sm, lineHeight: 20 }}>{body}</Text>

      <FeedPostActions />
    </View>
  );
}
