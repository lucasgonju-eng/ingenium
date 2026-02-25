import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { acceptLatestTerms, hasAcceptedLatestTerms } from "../../lib/legal/consent";
import { clearLocalSignupTermsAcceptance, getLocalSignupTermsAcceptance } from "../../lib/legal/signupTermsState";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Campos obrigatórios", "Preencha e-mail e senha.");
      return;
    }

    try {
      setLoading(true);
      setErrorText(null);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorText(error.message);
        Alert.alert("Erro no login", error.message);
        return;
      }

      // Garante leitura do usuário autenticado mais recente antes de navegar.
      await supabase.auth.getUser();

      const pendingTerms = getLocalSignupTermsAcceptance();
      if (pendingTerms?.accepted && pendingTerms.termsVersionId) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await acceptLatestTerms({
              termsVersionId: pendingTerms.termsVersionId,
              evidenceJson: {
                consent_checkbox: true,
                scrolled_to_end: true,
                local_terms_hash: pendingTerms.termsHash,
                local_accepted_at: pendingTerms.acceptedAtIso,
                login_email: email.trim().toLowerCase(),
                attempt: attempt + 1,
              },
            });
            clearLocalSignupTermsAcceptance();
            break;
          } catch (consentErr) {
            if (attempt === 2) throw consentErr;
            await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
          }
        }
      }

      const acceptedLatest = await hasAcceptedLatestTerms();
      if (!acceptedLatest) {
        router.replace("/(auth)/termos-lgpd");
        return;
      }

      router.replace("/(tabs)/dashboard");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha de conexão ao tentar entrar.";
      setErrorText(message);
      Alert.alert("Erro no login", message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Informe seu e-mail", "Digite seu e-mail para receber o link de redefinição de senha.");
      return;
    }

    try {
      setResetLoading(true);
      const siteUrl =
        process.env.EXPO_PUBLIC_SITE_URL ??
        (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
      const redirectTo = `${siteUrl.replace(/\/+$/, "")}/login`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        Alert.alert("Erro ao enviar e-mail", error.message);
        return;
      }

      Alert.alert("E-mail enviado", "Verifique sua caixa de entrada para redefinir sua senha.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível solicitar redefinição de senha.";
      Alert.alert("Erro", message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      Alert.alert("Informe seu e-mail", "Digite seu e-mail para reenviar a confirmação de cadastro.");
      return;
    }

    try {
      setResendLoading(true);
      const siteUrl =
        process.env.EXPO_PUBLIC_SITE_URL ??
        (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
      const emailRedirectTo = `${siteUrl.replace(/\/+$/, "")}/login`;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo },
      });
      if (error) {
        Alert.alert("Erro ao reenviar", error.message);
        return;
      }

      Alert.alert("Confirmação reenviada", "Verifique seu e-mail e clique no link para liberar o login.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível reenviar a confirmação.";
      Alert.alert("Erro", message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Entrar" subtitle="Acesse sua conta InGenium" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          <View
            style={{
              marginTop: spacing.md,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: spacing.md,
            }}
          >
            <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
              Entrar com e-mail
            </Text>
            <View
              style={{
                marginTop: spacing.xs,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.45)",
                backgroundColor: "rgba(255,199,0,0.10)",
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={{ color: colors.einsteinYellow, lineHeight: 20 }} weight="bold">
                Importante: confirme seu cadastro no e-mail antes de tentar entrar.
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.88)", marginTop: 2, lineHeight: 18 }}>
                Sem clicar no link de confirmação, o login não será liberado.
              </Text>
            </View>

            <TextInput
              placeholder="E-mail"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={{
                marginTop: spacing.sm,
                height: 46,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: "rgba(255,255,255,0.03)",
                color: colors.white,
                paddingHorizontal: spacing.sm,
                fontFamily: typography.fontFamily.base,
              }}
            />
            <View
              style={{
                marginTop: spacing.xs,
                height: 46,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: "rgba(255,255,255,0.03)",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <TextInput
                placeholder="Senha"
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => {
                  void handleLogin();
                }}
                style={{
                  flex: 1,
                  color: colors.white,
                  paddingHorizontal: spacing.sm,
                  fontFamily: typography.fontFamily.base,
                }}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={{ paddingHorizontal: spacing.sm, height: "100%", justifyContent: "center" }}
              >
                <Text style={{ color: colors.einsteinYellow, fontSize: 16 }}>{showPassword ? "🙈" : "👁"}</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                void handleForgotPassword();
              }}
              disabled={resetLoading}
              style={{ marginTop: spacing.xs, alignSelf: "flex-end" }}
            >
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="semibold">
                {resetLoading ? "Enviando..." : "Esqueci minha senha"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void handleResendConfirmation();
              }}
              disabled={resendLoading}
              style={{ marginTop: 6, alignSelf: "flex-end" }}
            >
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="semibold">
                {resendLoading ? "Reenviando..." : "Reenviar e-mail de confirmação"}
              </Text>
            </Pressable>
            {errorText ? (
              <Text style={{ color: "#fca5a5", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
                {errorText}
              </Text>
            ) : null}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={{
                marginTop: spacing.md,
                height: 46,
                borderRadius: radii.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.einsteinYellow,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.einsteinBlue }} weight="bold">
                {loading ? "Entrando..." : "Entrar na Liga"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push("/(auth)/termos-lgpd")} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.einsteinYellow, textAlign: "center" }} weight="semibold">
              Ainda não tem conta? Criar conta
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
