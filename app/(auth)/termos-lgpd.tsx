import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { TERMS_CONTENT, TERMS_EFFECTIVE_DATE, TERMS_TITLE, TERMS_VERSION_TEXT } from "../../content/legal/terms-v1.0";
import { fetchLatestTermsVersion } from "../../lib/legal/consent";
import { clearLocalSignupTermsAcceptance, setLocalSignupTermsAcceptance } from "../../lib/legal/signupTermsState";
import { colors, radii, spacing } from "../../lib/theme/tokens";

type ScrollEvent = {
  nativeEvent: {
    contentOffset: { y: number };
    contentSize: { height: number };
    layoutMeasurement: { height: number };
  };
};

export default function TermsLgpdScreen() {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = scrolledToEnd && checked && !loading;

  const lines = useMemo(() => TERMS_CONTENT.trim().split("\n"), []);

  function handleScroll(e: ScrollEvent) {
    const offsetY = e.nativeEvent.contentOffset.y;
    const contentHeight = e.nativeEvent.contentSize.height;
    const viewportHeight = e.nativeEvent.layoutMeasurement.height;
    const reachedBottom = offsetY + viewportHeight >= contentHeight - 12;
    if (reachedBottom) setScrolledToEnd(true);
  }

  async function handleContinue() {
    if (!canContinue) return;
    try {
      setLoading(true);
      clearLocalSignupTermsAcceptance();
      const latest = await fetchLatestTermsVersion();
      setLocalSignupTermsAcceptance({
        accepted: true,
        termsVersionId: latest.id,
        termsHash: latest.content_sha256,
        acceptedAtIso: new Date().toISOString(),
      });
      router.replace("/(auth)/cadastro");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Nao foi possivel carregar a versao vigente dos termos.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <StitchScreenFrame>
      <View style={{ flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl }}>
        <StitchHeader title="Termos e LGPD" subtitle="Aceite obrigatorio antes do cadastro" variant="feed" />

        <View
          style={{
            marginTop: spacing.sm,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            padding: spacing.sm,
            flex: 1,
          }}
        >
          <Text style={{ color: colors.white }} weight="bold">
            {TERMS_TITLE}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4 }}>
            Versao: {TERMS_VERSION_TEXT} • Vigencia: {TERMS_EFFECTIVE_DATE}
          </Text>

          <ScrollView
            style={{
              marginTop: spacing.sm,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
            contentContainerStyle={{ padding: spacing.sm, gap: 6 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {lines.map((line, idx) => (
              <Text key={`${idx}-${line.slice(0, 16)}`} style={{ color: "rgba(255,255,255,0.9)", lineHeight: 20 }}>
                {line || " "}
              </Text>
            ))}
          </ScrollView>

          <Text style={{ color: colors.einsteinYellow, marginTop: spacing.sm }}>
            Para habilitar o aceite, role ate o final.
          </Text>

          <Pressable
            disabled={!scrolledToEnd}
            onPress={() => {
              if (!scrolledToEnd) return;
              setChecked((v) => !v);
            }}
            style={{
              marginTop: spacing.xs,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              opacity: scrolledToEnd ? 1 : 0.6,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.45)",
                backgroundColor: checked ? colors.einsteinYellow : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {checked ? <Text style={{ color: colors.einsteinBlue }}>✓</Text> : null}
            </View>
            <Text style={{ color: colors.white }}>
              Declaro que li e aceito os Termos de Uso, Politica de Privacidade e LGPD.
            </Text>
          </Pressable>

          <Pressable
            disabled={!canContinue}
            onPress={() => {
              void handleContinue();
            }}
            style={{
              marginTop: spacing.md,
              height: 46,
              borderRadius: radii.md,
              backgroundColor: colors.einsteinYellow,
              opacity: canContinue ? 1 : 0.6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.einsteinBlue }} weight="bold">
              {loading ? "Validando..." : "Concordar e continuar"}
            </Text>
          </Pressable>
        </View>
      </View>
    </StitchScreenFrame>
  );
}
