import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { fetchMyAccessRole, fetchMyLatestAccessRequest } from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { colors, spacing } from "../../lib/theme/tokens";

export default function ProfessorLoginLinkScreen() {
  const [status, setStatus] = useState("Validando acesso...");

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        if (typeof window === "undefined") {
          setStatus("Link disponível apenas no ambiente web.");
          return;
        }

        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const query = new URLSearchParams(window.location.search);
        const type = hash.get("type") ?? query.get("type");
        const accessToken = hash.get("access_token") ?? query.get("access_token");
        const refreshToken = hash.get("refresh_token") ?? query.get("refresh_token");
        const code = query.get("code");
        const tokenHash = query.get("token_hash");

        let error: { message?: string } | null = null;
        if (accessToken && refreshToken) {
          const result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          error = result.error;
        } else if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code);
          error = result.error;
        } else if (tokenHash && type) {
          const otpType = type === "recovery" ? "recovery" : "email";
          const result = await supabase.auth.verifyOtp({
            type: otpType,
            token_hash: tokenHash,
          });
          error = result.error;
        } else {
          setStatus("Token de acesso ausente.");
          return;
        }

        if (error) {
          setStatus("Link inválido ou expirado.");
          return;
        }

        const role = await fetchMyAccessRole();
        if (role !== "teacher") {
          const latestRequest = await fetchMyLatestAccessRequest();
          if (latestRequest?.status === "pending") {
            setStatus("Cadastro pendente de confirmação do administrador.");
            return;
          }
          if (latestRequest?.status === "rejected") {
            setStatus("Cadastro reprovado pelo administrador. Entre em contato com a equipe InGenium.");
            return;
          }
          await supabase.auth.signOut();
          setStatus("Conta sem permissão de professor.");
          return;
        }

        if (window.history?.replaceState) {
          window.history.replaceState({}, document.title, "/(tabs)/perfil");
        }

        if (!mounted) return;
        router.replace("/(tabs)/perfil");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Falha ao processar link.";
        setStatus(message);
        Alert.alert("Erro", message);
      }
    }

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StitchScreenFrame>
      <View style={{ flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, alignItems: "center" }}>
        <StitchHeader title="Professor" subtitle="Acesso por link seguro" variant="feed" />
        <View style={{ marginTop: spacing.lg, alignItems: "center", gap: spacing.sm }}>
          <ActivityIndicator color={colors.einsteinYellow} />
          <Text style={{ color: "rgba(255,255,255,0.82)", textAlign: "center" }}>{status}</Text>
        </View>
      </View>
    </StitchScreenFrame>
  );
}
