import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { fetchMyAccessRole } from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

const ADMIN_LOGIN = "admin";
const ADMIN_EMAIL = "lucasgonju@gmail.com";

export default function AdminLoginScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    // Segurança: nunca redirecionar automaticamente para o admin.
    // O acesso ao painel deve ocorrer somente após login explícito nesta tela.
  }, []);

  async function handleAdminLogin() {
    setErrorText(null);
    if (!login.trim() || !password) {
      setErrorText("Preencha login e senha.");
      Alert.alert("Campos obrigatórios", "Preencha login e senha.");
      return;
    }

    const normalizedLogin = login.trim().toLowerCase();
    if (normalizedLogin !== ADMIN_LOGIN && normalizedLogin !== ADMIN_EMAIL.toLowerCase()) {
      setErrorText("Use login admin (ou o e-mail admin) para acessar o menu.");
      Alert.alert("Login inválido", "Use o login admin para acessar o menu administrativo.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password,
      });

      if (error) {
        setErrorText(error.message);
        Alert.alert("Erro no login admin", error.message);
        return;
      }

      const role = await fetchMyAccessRole();
      if (role !== "admin" && role !== "coord") {
        await supabase.auth.signOut();
        setErrorText("Esta conta não possui permissão de administrador.");
        Alert.alert("Acesso negado", "Esta conta não possui permissão de administrador.");
        return;
      }

      router.replace("/admin");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao autenticar no menu admin.";
      setErrorText(message);
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Admin" subtitle="Acesse o menu admin" variant="feed" />
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
              Login administrativo
            </Text>

            <TextInput
              placeholder="Login"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="none"
              autoComplete="username"
              value={login}
              onChangeText={(value) => {
                setLogin(value);
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
                  void handleAdminLogin();
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
                void handleAdminLogin();
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
                {loading ? "Entrando..." : "Entrar no admin"}
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
