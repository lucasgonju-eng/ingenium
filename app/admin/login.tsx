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

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;
      const role = await fetchMyAccessRole();
      if (role === "admin" || role === "coord") {
        router.replace("/admin");
      }
    }
    void checkSession();
    return () => {
      mounted = false;
    };
  }, []);

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
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
