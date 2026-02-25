import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function handleRecoveryFromUrl() {
      if (Platform.OS !== "web" || typeof window === "undefined") return;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const type = hash.get("type") ?? query.get("type");
      const accessToken = hash.get("access_token") ?? query.get("access_token");
      const refreshToken = hash.get("refresh_token") ?? query.get("refresh_token");

      if (type !== "recovery" || !accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        Alert.alert("Link inválido", "O link de recuperação expirou ou já foi utilizado. Solicite um novo e-mail.");
        return;
      }

      if (!mounted) return;
      setIsRecoveryMode(true);
      if (window.history?.replaceState) {
        window.history.replaceState({}, document.title, "/admin/login");
      }
    }

    async function checkSession() {
      await handleRecoveryFromUrl();
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;
      if (isRecoveryMode) return;
      const role = await fetchMyAccessRole();
      if (role === "admin" || role === "coord") {
        router.replace("/admin");
      }
    }
    void checkSession();
    return () => {
      mounted = false;
    };
  }, [isRecoveryMode]);

  async function handleAdminLogin() {
    if (!login.trim() || !password) {
      Alert.alert("Campos obrigatórios", "Preencha login e senha.");
      return;
    }

    if (login.trim().toLowerCase() !== ADMIN_LOGIN) {
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
        Alert.alert("Erro no login admin", error.message);
        return;
      }

      const role = await fetchMyAccessRole();
      if (role !== "admin" && role !== "coord") {
        await supabase.auth.signOut();
        Alert.alert("Acesso negado", "Esta conta não possui permissão de administrador.");
        return;
      }

      router.replace("/admin");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao autenticar no menu admin.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAdminPassword() {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Campos obrigatórios", "Preencha senha e confirmação.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Senha fraca", "Use pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Confirmação inválida", "A confirmação da senha não confere.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert("Erro ao salvar senha", error.message);
        return;
      }

      const role = await fetchMyAccessRole();
      if (role !== "admin" && role !== "coord") {
        await supabase.auth.signOut();
        Alert.alert("Acesso negado", "Esta conta não possui permissão de administrador.");
        return;
      }

      Alert.alert("Senha salva", "Senha do admin atualizada com sucesso.");
      router.replace("/admin");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao salvar nova senha.";
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
              {isRecoveryMode ? "Definir senha do admin" : "Login administrativo"}
            </Text>

            {isRecoveryMode ? (
              <>
                <View
                  style={{
                    marginTop: spacing.sm,
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
                    placeholder="Nova senha"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    style={{
                      flex: 1,
                      color: colors.white,
                      paddingHorizontal: spacing.sm,
                      fontFamily: typography.fontFamily.base,
                    }}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    style={{ paddingHorizontal: spacing.sm, height: "100%", justifyContent: "center" }}
                  >
                    <Text style={{ color: colors.einsteinYellow, fontSize: 16 }}>{showNewPassword ? "🙈" : "👁"}</Text>
                  </Pressable>
                </View>
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
                    placeholder="Confirmar senha"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onSubmitEditing={() => {
                      void handleSaveAdminPassword();
                    }}
                    style={{
                      flex: 1,
                      color: colors.white,
                      paddingHorizontal: spacing.sm,
                      fontFamily: typography.fontFamily.base,
                    }}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={{ paddingHorizontal: spacing.sm, height: "100%", justifyContent: "center" }}
                  >
                    <Text style={{ color: colors.einsteinYellow, fontSize: 16 }}>{showConfirmPassword ? "🙈" : "👁"}</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    void handleSaveAdminPassword();
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
                    {loading ? "Salvando..." : "Salvar senha"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <TextInput
                  placeholder="Login"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  autoCapitalize="none"
                  value={login}
                  onChangeText={setLogin}
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
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
