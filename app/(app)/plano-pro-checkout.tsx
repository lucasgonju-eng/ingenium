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
  const [selectedOption, setSelectedOption] = useState<PaymentOption>("pix");
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
            onPress={() => setSelectedOption("pix")}
            disabled={loadingOption !== null}
            style={{
              borderRadius: radii.lg,
              borderWidth: selectedOption === "pix" ? 2 : 1,
              borderColor: selectedOption === "pix" ? colors.einsteinYellow : colors.borderSoft,
              backgroundColor: selectedOption === "pix" ? colors.surfaceCard : colors.surfacePanel,
              padding: spacing.md,
              opacity: loadingOption === null ? 1 : 0.7,
            }}
          >
            <Text style={{ color: colors.einsteinYellow }} weight="bold">
              PIX (indicado)
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.45)",
                marginTop: 6,
                fontSize: typography.small.fontSize,
                textDecorationLine: "line-through",
              }}
              weight="semibold"
            >
              R$ 328,00
            </Text>
            <Text style={{ color: colors.white, marginTop: 2, fontSize: 34, lineHeight: 38 }} weight="bold">
              R$ 278,80
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              15% de desconto aplicado automaticamente.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedOption("debit")}
            disabled={loadingOption !== null}
            style={{
              borderRadius: radii.lg,
              borderWidth: selectedOption === "debit" ? 2 : 1,
              borderColor: selectedOption === "debit" ? colors.einsteinYellow : colors.borderSoft,
              backgroundColor: selectedOption === "debit" ? colors.surfaceCard : colors.surfacePanel,
              padding: spacing.md,
              opacity: loadingOption === null ? 1 : 0.7,
            }}
          >
            <Text style={{ color: colors.white }} weight="bold">
              Débito
            </Text>
            <Text style={{ color: colors.white, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
              R$ 328,00
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedOption("installment12")}
            disabled={loadingOption !== null}
            style={{
              borderRadius: radii.lg,
              borderWidth: selectedOption === "installment12" ? 2 : 1,
              borderColor: selectedOption === "installment12" ? colors.einsteinYellow : colors.borderSoft,
              backgroundColor: selectedOption === "installment12" ? colors.surfaceCard : colors.surfacePanel,
              padding: spacing.md,
              opacity: loadingOption === null ? 1 : 0.7,
            }}
          >
            <Text style={{ color: colors.white }} weight="bold">
              Crédito parcelado (sem juros)
            </Text>
            <Text style={{ color: colors.white, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
              12x de R$ 27,00
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
              Prestações suaves que cabem no bolso.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleOpenCheckout(selectedOption)}
            disabled={loadingOption !== null}
            style={{
              marginTop: spacing.xs,
              height: 48,
              borderRadius: radii.md,
              backgroundColor: colors.einsteinYellow,
              alignItems: "center",
              justifyContent: "center",
              opacity: loadingOption !== null ? 0.75 : 1,
            }}
          >
            <Text style={{ color: colors.einsteinBlue, fontSize: 16 }} weight="bold">
              {loadingOption ? "Abrindo checkout..." : "Contratar"}
            </Text>
          </Pressable>
          <Text style={{ color: colors.einsteinYellow, textAlign: "center" }} weight="semibold">
            Esse plano é referente ao ano de 2026. Ele se encerra em 31 de dezembro, mesmo que as prestações restantes tenham vencimento em 2027.
          </Text>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
