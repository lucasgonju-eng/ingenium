import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { notifyAdminNewAccessRequest, sendTeacherCandidateMagicLink } from "../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

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

export default function ProfessorSignupScreen() {
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [subjectArea, setSubjectArea] = useState("");
  const [intendedOlympiad, setIntendedOlympiad] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!fullName.trim() || !displayName.trim() || !email.trim() || !cpf.trim() || !subjectArea.trim() || !intendedOlympiad.trim()) {
      Alert.alert("Campos obrigatórios", "Preencha todos os dados para solicitar cadastro.");
      return;
    }
    if (onlyDigits(cpf).length !== 11) {
      Alert.alert("CPF inválido", "Digite um CPF válido com 11 números.");
      return;
    }

    try {
      setLoading(true);
      await sendTeacherCandidateMagicLink({
        email: email.trim(),
        full_name: fullName.trim(),
        display_name: displayName.trim(),
        cpf: onlyDigits(cpf),
        subject_area: subjectArea.trim(),
        intended_olympiad: intendedOlympiad.trim(),
      });
      try {
        await notifyAdminNewAccessRequest({
          requestType: "teacher",
          fullName: fullName.trim(),
          displayName: displayName.trim(),
          candidateEmail: email.trim(),
          cpf: onlyDigits(cpf),
          subjectArea: subjectArea.trim(),
          intendedOlympiad: intendedOlympiad.trim(),
        });
      } catch {
        // Não bloqueia o cadastro do professor se o aviso ao admin falhar.
      }

      Alert.alert(
        "Cadastro recebido",
        "Enviamos um magic link para seu e-mail. Após entrar, seu perfil ficará em análise até confirmação do administrador.",
      );
      router.replace("/professor/login-link");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao enviar cadastro de professor.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Professores" subtitle="Cadastro de acesso docente" variant="feed" />
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
              Solicitar acesso de professor
            </Text>

            <TextInput
              placeholder="Nome completo"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={fullName}
              onChangeText={setFullName}
              style={inputStyle}
            />
            <TextInput
              placeholder="Nome exibido"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={displayName}
              onChangeText={setDisplayName}
              style={inputStyle}
            />
            <TextInput
              placeholder="E-mail"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={inputStyle}
            />
            <TextInput
              placeholder="CPF"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="number-pad"
              value={cpf}
              onChangeText={(value) => setCpf(formatCpf(value))}
              style={inputStyle}
            />
            <TextInput
              placeholder="Disciplina / Área"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={subjectArea}
              onChangeText={setSubjectArea}
              style={inputStyle}
            />
            <TextInput
              placeholder="Olimpíada pretendida"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={intendedOlympiad}
              onChangeText={setIntendedOlympiad}
              style={inputStyle}
            />

            <Pressable onPress={() => void handleSubmit()} disabled={loading} style={[submitBtnStyle, { opacity: loading ? 0.7 : 1 }]}>
              <Text style={{ color: colors.einsteinBlue }} weight="bold">
                {loading ? "Enviando..." : "Enviar cadastro e receber magic link"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}

const inputStyle = {
  marginTop: spacing.xs,
  height: 46,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  color: colors.white,
  paddingHorizontal: spacing.sm,
  fontFamily: typography.fontFamily.base,
};

const submitBtnStyle = {
  marginTop: spacing.md,
  height: 46,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.einsteinYellow,
};
