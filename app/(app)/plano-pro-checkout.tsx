import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { fetchMyProfile } from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type PaymentOption = "pix" | "debit" | "installment12";

function getPublicSiteUrl() {
  const raw =
    process.env.EXPO_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
  return raw.replace(/\/+$/, "");
}

function showFeedback(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function PlanoProCheckoutScreen() {
  const params = useLocalSearchParams<{
    source?: string | string[];
    olympiadId?: string | string[];
    olympiadTitle?: string | string[];
  }>();
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const olympiadId = Array.isArray(params.olympiadId) ? params.olympiadId[0] : params.olympiadId;
  const olympiadTitle = Array.isArray(params.olympiadTitle) ? params.olympiadTitle[0] : params.olympiadTitle;
  const originContext: "olympiad" | "menu" = source === "olympiad" ? "olympiad" : "menu";
  const [loadingOption, setLoadingOption] = useState<PaymentOption | null>(null);

  async function handleOpenCheckout(paymentOption: PaymentOption) {
    if (loadingOption) return;
    try {
      setLoadingOption(paymentOption);
      const [{ data: userData }, profile] = await Promise.all([supabase.auth.getUser(), fetchMyProfile().catch(() => null)]);
      const user = userData.user;
      if (!user) {
        showFeedback("Sessão expirada", "Faça login novamente para continuar.");
        router.replace("/(auth)/login");
        return;
      }

      const payload = {
        userId: user.id,
        userName:
          profile?.full_name?.trim() ||
          String(user.user_metadata?.full_name ?? "").trim() ||
          user.email?.split("@")[0] ||
          "Aluno",
        userEmail: user.email ?? "",
        originContext,
        olympiadId: olympiadId ?? "",
        olympiadTitle: olympiadTitle ?? "",
        paymentOption,
      };

      const response = await fetch(`${getPublicSiteUrl()}/asaas-create-checkout.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      let parsed: { ok?: boolean; checkoutUrl?: string; error?: string } = {};
      try {
        parsed = JSON.parse(raw) as { ok?: boolean; checkoutUrl?: string; error?: string };
      } catch {
        parsed = {};
      }

      if (!response.ok || !parsed.ok || !parsed.checkoutUrl) {
        throw new Error(parsed.error || `Falha ao iniciar checkout (HTTP ${response.status}).`);
      }

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(parsed.checkoutUrl);
        return;
      }

      const canOpen = await Linking.canOpenURL(parsed.checkoutUrl);
      if (!canOpen) {
        throw new Error("Checkout criado, mas a URL retornada pelo Asaas não pôde ser aberta.");
      }
      await Linking.openURL(parsed.checkoutUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao abrir checkout.";
      showFeedback("Erro no checkout", message);
    } finally {
      setLoadingOption(null);
    }
  }

  return (
    <StitchScreenFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Plano PRO" subtitle="Escolha sua forma de pagamento" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          <View
            style={{
              marginTop: spacing.sm,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: "rgba(255,199,0,0.45)",
              backgroundColor: "rgba(255,199,0,0.14)",
              padding: spacing.md,
            }}
          >
            <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="bold">
              OPÇÃO INDICADA
            </Text>
            <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize, marginTop: 2 }} weight="bold">
              PIX com 15% de desconto: R$ 278,80
            </Text>
            <Text style={{ color: colors.white, marginTop: 6 }} weight="semibold">
              Você economiza R$ 49,20 em relação ao valor base.
            </Text>
          </View>

          <Pressable
            onPress={() => void handleOpenCheckout("pix")}
            disabled={loadingOption !== null}
            style={{
              borderRadius: radii.lg,
              borderWidth: 2,
              borderColor: colors.einsteinYellow,
              backgroundColor: colors.surfaceCard,
              padding: spacing.md,
              opacity: loadingOption === null || loadingOption === "pix" ? 1 : 0.7,
            }}
          >
            <Text style={{ color: colors.einsteinYellow }} weight="bold">
              PIX (indicado)
            </Text>
            <Text style={{ color: colors.white, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
              R$ 278,80
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              15% de desconto aplicado automaticamente no Asaas.
            </Text>
            <Text style={{ color: colors.einsteinYellow, marginTop: spacing.sm }} weight="bold">
              {loadingOption === "pix" ? "Abrindo checkout..." : "Pagar com PIX"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleOpenCheckout("debit")}
            disabled={loadingOption !== null}
            style={{
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: spacing.md,
              opacity: loadingOption === null || loadingOption === "debit" ? 1 : 0.7,
            }}
          >
            <Text style={{ color: colors.white }} weight="bold">
              Débito
            </Text>
            <Text style={{ color: colors.white, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
              R$ 328,00
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.sm }} weight="semibold">
              {loadingOption === "debit" ? "Abrindo checkout..." : "Pagar no débito"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleOpenCheckout("installment12")}
            disabled={loadingOption !== null}
            style={{
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: spacing.md,
              opacity: loadingOption === null || loadingOption === "installment12" ? 1 : 0.7,
            }}
          >
            <Text style={{ color: colors.white }} weight="bold">
              Crédito parcelado
            </Text>
            <Text style={{ color: colors.white, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
              12x de R$ 27,00
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.sm }} weight="semibold">
              {loadingOption === "installment12" ? "Abrindo checkout..." : "Pagar no crédito"}
            </Text>
          </Pressable>

          <Text style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: spacing.xs }}>
            Boleto bancário não faz parte desta oferta.
          </Text>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
