import React from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import FAQAccordion from "./FAQAccordion";
import PlanCard from "./PlanCard";
import { planosContent } from "../content/planos";
import StitchScreenFrame from "./layout/StitchScreenFrame";
import StitchHeader from "./ui/StitchHeader";
import { Text } from "./ui/Text";
import { colors, radii, spacing, typography } from "../lib/theme/tokens";

export default function PlanosIngeniumScreen() {
  const params = useLocalSearchParams<{
    source?: string | string[];
    olympiadTitle?: string | string[];
    signupUrl?: string | string[];
  }>();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const olympiadTitle = Array.isArray(params.olympiadTitle) ? params.olympiadTitle[0] : params.olympiadTitle;
  const signupUrl = Array.isArray(params.signupUrl) ? params.signupUrl[0] : params.signupUrl;
  const cameFromOlympiad = source === "olympiad";

  async function handleSelectPlan(planId: "free" | "pro") {
    if (planId === "pro") {
      Alert.alert("Plano PRO", "Link de pagamento do Asaas será conectado em breve.");
      return;
    }

    if (cameFromOlympiad && signupUrl) {
      const ok = await Linking.canOpenURL(signupUrl);
      if (!ok) {
        Alert.alert("Erro", "Não foi possível abrir o link de inscrição da olimpíada.");
        return;
      }
      await Linking.openURL(signupUrl);
      return;
    }

    Alert.alert("Plano FREE", "No Plano Free, escolha uma olimpíada e clique em Inscrever-se para abrir o link oficial.");
  }

  return (
    <StitchScreenFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Planos" subtitle="Assinatura InGenium" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          <View
            style={{
              marginTop: spacing.sm,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
            }}
          >
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.35)",
                backgroundColor: "rgba(255,199,0,0.08)",
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize, letterSpacing: 1, textTransform: "uppercase" }} weight="semibold">
                {planosContent.heroTag}
              </Text>
            </View>
            <Text style={{ marginTop: spacing.sm, color: colors.white, fontSize: 34, lineHeight: 38 }} weight="bold">
              {planosContent.title}
            </Text>
            <Text style={{ marginTop: spacing.xs, color: "rgba(255,255,255,0.88)", fontSize: 16 }} weight="semibold">
              {planosContent.subtitle}
            </Text>
            <Text style={{ marginTop: spacing.xs, color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 22 }}>
              {planosContent.description}
            </Text>
            {cameFromOlympiad ? (
              <View
                style={{
                  marginTop: spacing.xs,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  backgroundColor: "rgba(255,199,0,0.08)",
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="semibold">
                  Origem: {olympiadTitle ? `inscrição da olimpíada ${olympiadTitle}` : "inscrição de olimpíada"}
                </Text>
              </View>
            ) : null}
            <Pressable
              style={{
                marginTop: spacing.md,
                height: 42,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.25)",
                backgroundColor: "rgba(255,255,255,0.10)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.white }} weight="bold">
                {planosContent.compareCta}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.md, paddingHorizontal: spacing.md }}>
          {planosContent.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              ctaLabel={
                plan.id === "free"
                  ? cameFromOlympiad
                    ? "Continuar no Plano Free"
                    : "Usar Plano Free"
                  : "Selecionar Plano PRO"
              }
              onPress={(selectedPlan) => {
                void handleSelectPlan(selectedPlan.id);
              }}
            />
          ))}
        </View>

        <View
          style={{
            marginTop: spacing.xl,
            marginHorizontal: spacing.md,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize, textAlign: "center" }} weight="bold">
            {planosContent.howItWorksTitle}
          </Text>
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {planosContent.howItWorks.map((step) => (
              <View key={step.title} style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: colors.einsteinYellow, fontSize: 24 }}>★</Text>
                </View>
                <Text style={{ marginTop: spacing.xs, color: colors.white, fontSize: 16, textAlign: "center" }} weight="bold">
                  {step.title}
                </Text>
                <Text style={{ marginTop: 2, color: "rgba(255,255,255,0.70)", fontSize: 14, textAlign: "center" }}>
                  {step.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            marginTop: spacing.xl,
            marginHorizontal: spacing.md,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            padding: spacing.lg,
          }}
        >
          <Text style={{ color: colors.einsteinYellow, fontSize: 28, textAlign: "center", lineHeight: 40, fontStyle: "italic" }}>
            {planosContent.quote}
          </Text>
        </View>

        <View
          style={{
            marginTop: spacing.xl,
            marginHorizontal: spacing.md,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize, marginBottom: spacing.sm }} weight="bold">
            Perguntas frequentes
          </Text>
          <FAQAccordion items={planosContent.faq} />
        </View>

        <View
          style={{
            marginTop: spacing.xl,
            marginHorizontal: spacing.md,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.white, fontSize: 28, lineHeight: 34, textAlign: "center" }} weight="bold">
            {planosContent.finalTitle}
          </Text>
          <Pressable
            style={{
              marginTop: spacing.md,
              height: 54,
              borderRadius: radii.md,
              backgroundColor: colors.einsteinYellow,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.einsteinBlue, fontSize: 16 }} weight="bold">
              {planosContent.finalCta}
            </Text>
          </Pressable>
          <Text style={{ marginTop: spacing.xs, color: "rgba(255,255,255,0.72)", fontSize: 14, textAlign: "center" }}>
            {planosContent.finalNote}
          </Text>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
