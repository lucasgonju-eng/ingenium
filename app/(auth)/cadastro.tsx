import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { getLocalSignupTermsAcceptance } from "../../lib/legal/signupTermsState";
import { trackEvent } from "../../lib/analytics/gtm";
import {
  sendStudentPendingStatusEmail,
  submitStudentSignupPendingRequest,
  validateStudentEnrollment2026,
} from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

const SERIES_OPTIONS = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatWhatsapp(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function CadastroScreen() {
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState<(typeof SERIES_OPTIONS)[number] | "">("");
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsReady, setTermsReady] = useState(false);

  useEffect(() => {
    trackEvent("signup_screen_view", { page_type: "signup", platform: "web" });
    const termsState = getLocalSignupTermsAcceptance();
    if (!termsState?.accepted || !termsState.termsVersionId || !termsState.termsHash) {
      router.replace("/(auth)/termos-lgpd");
      return;
    }
    setTermsReady(true);
  }, []);

  const handleSignUp = async () => {
    if (!nome || !serie || !cpf || !matricula || !email || !password) {
      Alert.alert("Campos obrigatórios", "Preencha nome completo, série, CPF, matrícula, e-mail e senha.");
      return;
    }
    if (onlyDigits(matricula).length < 4) {
      Alert.alert("Matrícula inválida", "Informe a matrícula completa do aluno.");
      return;
    }

    if (onlyDigits(cpf).length !== 11) {
      Alert.alert("CPF inválido", "Digite um CPF válido com 11 números.");
      return;
    }

    const siteUrl =
      process.env.EXPO_PUBLIC_SITE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
    const emailRedirectTo = `${siteUrl.replace(/\/+$/, "")}/login`;

    try {
      setLoading(true);
      const termsState = getLocalSignupTermsAcceptance();
      if (!termsState?.accepted || !termsState.termsVersionId || !termsState.termsHash) {
        Alert.alert("Aceite obrigatorio", "Voce precisa aceitar os Termos e LGPD antes de criar a conta.");
        router.replace("/(auth)/termos-lgpd");
        return;
      }

      const enrollmentValidation = await validateStudentEnrollment2026({
        full_name: nome.trim(),
        enrollment_number: onlyDigits(matricula),
      });
      if (!enrollmentValidation.is_match) {
        let pendingRequestId: string | null = null;
        try {
          pendingRequestId = await submitStudentSignupPendingRequest({
            full_name: nome.trim(),
            email: email.trim(),
            cpf: onlyDigits(cpf),
            whatsapp: onlyDigits(whatsapp) || null,
            grade: serie || null,
            enrollment_number: onlyDigits(matricula),
            mismatch_reason: enrollmentValidation.reason,
          });
        } catch {
          // Não impede o bloqueio do cadastro caso o registro CRM falhe.
        }
        try {
          await sendStudentPendingStatusEmail({
            action: "pending_created",
            fullName: nome.trim(),
            candidateEmail: email.trim(),
            enrollmentNumber: onlyDigits(matricula),
            grade: serie || null,
            reason: enrollmentValidation.reason,
          });
        } catch {
          // Não impede o bloqueio do cadastro caso o e-mail falhe.
        }
        Alert.alert(
          "Inscrição em validação",
          "Não conseguimos confirmar automaticamente sua matrícula. Sua inscrição ficou pendente e será validada pela equipe do InGenium. Você receberá um e-mail quando a validação for concluída.",
        );
        trackEvent("signup_enrollment_pending", {
          reason: enrollmentValidation.reason,
          enrollment_number: onlyDigits(matricula),
          pending_request_id: pendingRequestId,
        });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: nome.trim(),
            grade: serie,
            cpf: onlyDigits(cpf),
            enrollment_number: onlyDigits(matricula),
            whatsapp: onlyDigits(whatsapp) || null,
            role: "student",
          },
        },
      });

      if (error) {
        const msg = String(error.message ?? "").toLowerCase();
        if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit") || msg.includes("too many requests")) {
          Alert.alert(
            "Limite de envio atingido",
            "Muitas confirmações foram solicitadas em pouco tempo. Aguarde alguns minutos e tente novamente ou use outro horário.",
          );
          return;
        }
        Alert.alert("Erro no cadastro", error.message);
        trackEvent("signup_error", { message: error.message });
        return;
      }

      trackEvent("signup_submit", { method: "email_password", role: "student" });
      Alert.alert(
        "Confirme sua inscrição",
        "Enviamos um e-mail de confirmação. Confirme o link para liberar seu primeiro login.",
      );
      router.replace("/(auth)/login");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao criar conta.";
      Alert.alert("Erro no cadastro", message);
    } finally {
      setLoading(false);
    }
  };

  if (!termsReady) {
    return (
      <StitchScreenFrame>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
            Validando aceite dos Termos e LGPD...
          </Text>
        </View>
      </StitchScreenFrame>
    );
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Criar conta" subtitle="Cadastro de aluno" variant="feed" />
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
              Cadastro do aluno
            </Text>

            <TextInput
              placeholder="Nome completo"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={nome}
              onChangeText={setNome}
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
            <Pressable
              onPress={() => setShowSeries((v) => !v)}
              style={{
                marginTop: spacing.xs,
                minHeight: 46,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: "rgba(255,255,255,0.03)",
                paddingHorizontal: spacing.sm,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: serie ? colors.white : "rgba(255,255,255,0.45)" }}>
                {serie || "Série"}
              </Text>
            </Pressable>
            {showSeries ? (
              <View
                style={{
                  marginTop: spacing.xs,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfacePanel,
                  overflow: "hidden",
                }}
              >
                {SERIES_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setSerie(option);
                      setShowSeries(false);
                    }}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.sm,
                      borderTopWidth: option === SERIES_OPTIONS[0] ? 0 : 1,
                      borderTopColor: colors.borderSoft,
                    }}
                  >
                    <Text style={{ color: colors.white }}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TextInput
              placeholder="CPF"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="number-pad"
              value={cpf}
              onChangeText={(value) => setCpf(formatCpf(value))}
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
            <TextInput
              placeholder="Número de matrícula"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="number-pad"
              value={matricula}
              onChangeText={(value) => setMatricula(onlyDigits(value))}
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
            <TextInput
              placeholder="E-mail"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
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
            <TextInput
              placeholder="WhatsApp (opcional)"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={(value) => setWhatsapp(formatWhatsapp(value))}
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
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.sm, lineHeight: 20 }}>
              Você receberá um e-mail de confirmação logo após criar sua conta.
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
                Importante: abra seu e-mail e clique no link de confirmação.
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.88)", marginTop: 2, lineHeight: 18 }}>
                Sem essa confirmação, seu primeiro login fica bloqueado.
              </Text>
            </View>

            <Pressable
              onPress={handleSignUp}
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
                {loading ? "Criando conta..." : "Criar conta"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push("/(auth)/login")} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.einsteinYellow, textAlign: "center" }} weight="semibold">
              Já tem conta? Entrar
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
