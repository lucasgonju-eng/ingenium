import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

      router.replace("/(tabs)/dashboard");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha de conexão ao tentar entrar.";
      setErrorText(message);
      Alert.alert("Erro no login", message);
    } finally {
      setLoading(false);
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
            <TextInput
              placeholder="Senha"
              placeholderTextColor="rgba(255,255,255,0.45)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => {
                void handleLogin();
              }}
              style={{
                marginTop: spacing.xs,
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

          <Pressable onPress={() => router.push("/(auth)/cadastro")} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.einsteinYellow, textAlign: "center" }} weight="semibold">
              Ainda não tem conta? Criar conta
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
