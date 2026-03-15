import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import FAQAccordion from "./FAQAccordion";
import PlanCard from "./PlanCard";
import { planosContent } from "../content/planos";
import { fetchMyPlanProStatus } from "../lib/supabase/queries";
import StitchScreenFrame from "./layout/StitchScreenFrame";
import StitchHeader from "./ui/StitchHeader";
import { Text } from "./ui/Text";
import { colors, radii, spacing, typography } from "../lib/theme/tokens";

export default function PlanosIngeniumScreen() {
  const params = useLocalSearchParams<{
    source?: string | string[];
    olympiadId?: string | string[];
    olympiadTitle?: string | string[];
    signupUrl?: string | string[];
  }>();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const olympiadId = Array.isArray(params.olympiadId) ? params.olympiadId[0] : params.olympiadId;
  const olympiadTitle = Array.isArray(params.olympiadTitle) ? params.olympiadTitle[0] : params.olympiadTitle;
  const signupUrl = Array.isArray(params.signupUrl) ? params.signupUrl[0] : params.signupUrl;
  const originContext: "olympiad" | "menu" = source === "olympiad" ? "olympiad" : "menu";
  const cameFromOlympiad = originContext === "olympiad";
  const [isPlanPro, setIsPlanPro] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadPlanStatus() {
      try {
        const status = await fetchMyPlanProStatus();
        if (mounted) setIsPlanPro(status.isPlanPro);
      } catch {
        if (mounted) setIsPlanPro(false);
      }
    }
    void loadPlanStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const proFeatureList = useMemo(
    () => [
      "8 rodadas diárias no Teste dos Lobos",
      ...planosContent.plans
        .find((plan) => plan.id === "pro")
        ?.features.filter((feature) => feature.included)
        .map((feature) => feature.label) ?? [],
    ],
    [],
  );

  function handleProCheckout() {
    router.push({
      pathname: "/(app)/plano-pro-checkout",
      params: {
        source: originContext,
        olympiadId: olympiadId ?? "",
        olympiadTitle: olympiadTitle ?? "",
        signupUrl: signupUrl ?? "",
      },
    });
  }

  async function handleSelectPlan(planId: "free" | "pro") {
    if (planId === "pro") {
      handleProCheckout();
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

    if (cameFromOlympiad && olympiadId) {
      router.push(`/olimpiadas/${olympiadId}`);
      return;
    }

    router.replace("/(marketing)");
  }

  return (
    <StitchScreenFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Planos" subtitle={isPlanPro ? "Perfil Pro ativo" : "Assinatura InGenium"} variant="feed" />
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
            {isPlanPro ? (
              <View
                style={{
                  marginTop: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: "rgba(134,239,172,0.55)",
                  backgroundColor: "rgba(20,83,45,0.28)",
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <Text style={{ color: "#86efac", fontSize: typography.small.fontSize }} weight="semibold">
                  Você já é aluno(a) Plano Pro. Todas as vantagens estão ativas.
                </Text>
              </View>
            ) : null}
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
          {isPlanPro ? (
            <View
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.45)",
                backgroundColor: "rgba(255,199,0,0.10)",
                padding: spacing.md,
              }}
            >
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.titleMd.fontSize }} weight="bold">
                Vantagens ativas do Plano Pro
              </Text>
              <View style={{ marginTop: spacing.sm, gap: 6 }}>
                {proFeatureList.map((feature) => (
                  <Text key={feature} style={{ color: "rgba(255,255,255,0.9)", lineHeight: 20 }}>
                    • {feature}
                  </Text>
                ))}
              </View>
            </View>
          ) : (
            planosContent.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                ctaLabel={
                  plan.id === "free"
                    ? cameFromOlympiad
                      ? "Continuar no Plano Free"
                      : "Continuar com Plano Free"
                    : "Selecionar Plano PRO"
                }
                onPress={(selectedPlan) => {
                  void handleSelectPlan(selectedPlan.id);
                }}
              />
            ))
          )}
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

        {!isPlanPro ? (
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
              onPress={handleProCheckout}
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
        ) : null}
      </ScrollView>
    </StitchScreenFrame>
  );
}
