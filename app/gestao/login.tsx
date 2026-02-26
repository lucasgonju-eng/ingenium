import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { fetchMyAccessRole } from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

export default function GestaoLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleGestaoLogin() {
    setErrorText(null);
    if (!email.trim() || !password) {
      setErrorText("Preencha e-mail e senha.");
      Alert.alert("Campos obrigatórios", "Preencha e-mail e senha.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErrorText(error.message);
        Alert.alert("Erro no login", error.message);
        return;
      }

      const role = await fetchMyAccessRole();
      if (role !== "gestao" && role !== "admin") {
        await supabase.auth.signOut();
        setErrorText("Esta conta não possui permissão de Gestão.");
        Alert.alert("Acesso negado", "Esta conta não possui permissão de Gestão.");
        return;
      }

      router.replace("/gestao");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao autenticar no menu gestão.";
      setErrorText(message);
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMagicLink() {
    setErrorText(null);
    if (!email.trim()) {
      setErrorText("Informe o e-mail para receber o link.");
      Alert.alert("E-mail obrigatório", "Informe o e-mail da coordenadora.");
      return;
    }

    try {
      setSendingMagicLink(true);
      const targetEmail = email.trim().toLowerCase();
      const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
      const redirectTo = `${siteUrl.replace(/\/+$/, "")}/gestao/login-link`;

      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (error) throw error;

      Alert.alert("Link enviado", "Enviamos um link de acesso para o e-mail informado.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível enviar o magic link.";
      setErrorText(message);
      Alert.alert("Erro", message);
    } finally {
      setSendingMagicLink(false);
    }
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Gestão" subtitle="Acesso das coordenadoras" variant="feed" />
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
              Login de Gestão
            </Text>

            <TextInput
              placeholder="E-mail"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errorText) setErrorText(null);
              }}
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
                autoComplete="current-password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorText) setErrorText(null);
                }}
                onSubmitEditing={() => {
                  void handleGestaoLogin();
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
                void handleGestaoLogin();
              }}
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
                {loading ? "Entrando..." : "Entrar na Gestão"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void handleSendMagicLink();
              }}
              disabled={sendingMagicLink}
              style={{
                marginTop: spacing.xs,
                height: 44,
                borderRadius: radii.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: colors.borderSoft,
                opacity: sendingMagicLink ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.white }} weight="semibold">
                {sendingMagicLink ? "Enviando link..." : "Receber link de acesso"}
              </Text>
            </Pressable>

            {errorText ? (
              <Text style={{ color: "#fca5a5", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
                {errorText}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
