import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import AvatarWithFallback from "../../components/ui/AvatarWithFallback";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import { planosContent } from "../../content/planos";
import {
  fetchMessageRecipientsForSender,
  fetchMyAccessRole,
  fetchMyPlanProStatus,
  fetchMyProfile,
  sendStudentMessage,
  type MyPlanProStatus,
  type MessageRecipientRow,
  type MyAccessRole,
  upsertMyProfile,
} from "../../lib/supabase/queries";
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

function formatBirthDate(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseBirthDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { iso: null, isValid: false };
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { iso: null, isValid: false };
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const parsed = new Date(year, month - 1, day);
  const isValid =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day &&
    year >= 1900 &&
    year <= new Date().getFullYear();
  if (!isValid) return { iso: null, isValid: false };
  return { iso: `${yyyy}-${mm}-${dd}`, isValid: true };
}

function formatBirthDateFromStorage(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${dd}/${mm}/${yyyy}`;
  }
  return formatBirthDate(trimmed);
}

function getPublicSiteUrl() {
  const raw =
    process.env.EXPO_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
  return raw.replace(/\/+$/, "");
}

function normalizeFileExt(ext: string | undefined) {
  const value = String(ext ?? "").toLowerCase();
  if (value === "png" || value === "webp") return value;
  return "jpg";
}

function contentTypeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export default function PerfilScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSeries, setShowSeries] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState<(typeof SERIES_OPTIONS)[number] | "">("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");
  const [className, setClassName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [accessRole, setAccessRole] = useState<MyAccessRole>(null);
  const [planStatus, setPlanStatus] = useState<MyPlanProStatus>({
    isPlanPro: false,
    planTier: "free",
    source: "fallback",
  });
  const [isAdminAccount, setIsAdminAccount] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);
  const [messageRecipients, setMessageRecipients] = useState<MessageRecipientRow[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const planProFeatureList = useMemo(
    () => [
      "8 rodadas diárias no Teste dos Lobos",
      ...planosContent.plans
        .find((plan) => plan.id === "pro")
        ?.features.filter((feature) => feature.included)
        .map((feature) => feature.label) ?? [],
    ],
    [],
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [{ data: userData }, profile, accessRole, myPlanStatus] = await Promise.all([
        supabase.auth.getUser(),
        fetchMyProfile(),
        fetchMyAccessRole(),
        fetchMyPlanProStatus().catch(() => ({ isPlanPro: false, planTier: "free" as const, source: "fallback" as const })),
      ]);
      const metadata = userData.user?.user_metadata ?? {};
      setUserId(userData.user?.id ?? null);

      setFullName(profile?.full_name ?? metadata.full_name ?? "");
      setGrade((profile?.grade ?? metadata.grade ?? "") as (typeof SERIES_OPTIONS)[number] | "");
      setCpf(formatCpf(String(metadata.cpf ?? "")));
      setWhatsapp(formatWhatsapp(String(metadata.whatsapp ?? "")));
      setBirthDate(formatBirthDateFromStorage(String(metadata.birth_date ?? "")));
      setEnrollmentNumber(onlyDigits(String(metadata.enrollment_number ?? "")));
      setEmail(userData.user?.email ?? "");
      setClassName(profile?.class_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      setAccessRole(accessRole);
      setPlanStatus(myPlanStatus);
      setIsAdminAccount(accessRole === "admin" || accessRole === "coord");
      if (accessRole === "teacher" || accessRole === "coord" || accessRole === "gestao" || accessRole === "admin") {
        const recipients = await fetchMessageRecipientsForSender().catch(() => []);
        setMessageRecipients(recipients);
      } else {
        setMessageRecipients([]);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar seu perfil.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  };

  const canSendMessages = accessRole === "teacher" || accessRole === "coord" || accessRole === "gestao" || accessRole === "admin";
  const selectedRecipient = messageRecipients.find((recipient) => recipient.id === selectedRecipientId) ?? null;
  const filteredRecipients = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    if (!query) return messageRecipients.slice(0, 8);
    return messageRecipients
      .filter((recipient) => {
        const name = String(recipient.full_name ?? "").toLowerCase();
        const gradeValue = String(recipient.grade ?? "").toLowerCase();
        return name.includes(query) || gradeValue.includes(query);
      })
      .slice(0, 8);
  }, [messageRecipients, recipientQuery]);

  const handleAdminPasswordChange = async () => {
    if (!newAdminPassword || !confirmAdminPassword) {
      Alert.alert("Campos obrigatórios", "Preencha nova senha e confirmação.");
      return;
    }
    if (newAdminPassword.length < 8) {
      Alert.alert("Senha fraca", "Use pelo menos 8 caracteres.");
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      Alert.alert("Confirmação inválida", "A confirmação da senha não confere.");
      return;
    }

    try {
      setSavingAdminPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newAdminPassword,
        data: { admin_must_change_password: false },
      });
      if (error) throw error;
      setNewAdminPassword("");
      setConfirmAdminPassword("");
      Alert.alert("Senha atualizada", "A senha do admin foi atualizada com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível atualizar a senha.";
      Alert.alert("Erro", message);
    } finally {
      setSavingAdminPassword(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Campos obrigatórios", "Preencha nova senha e confirmação.");
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
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Senha atualizada", "Sua senha foi atualizada com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível atualizar a senha.";
      Alert.alert("Erro", message);
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleSave = async () => {
    if (!fullName.trim() || !grade || onlyDigits(cpf).length !== 11) {
      Alert.alert("Campos obrigatórios", "Preencha nome completo, série e CPF válido.");
      return;
    }
    if (birthDate.trim() && !parseBirthDateInput(birthDate).isValid) {
      Alert.alert("Data inválida", "Digite a data de nascimento no formato DD/MM/AAAA.");
      return;
    }
    if (enrollmentNumber.trim().length > 0 && enrollmentNumber.trim().length < 4) {
      Alert.alert("Matrícula inválida", "Informe a matrícula completa do aluno.");
      return;
    }
    try {
      setSaving(true);
      const parsedBirthDate = parseBirthDateInput(birthDate);
      let conqueredProfileXp = false;
      await upsertMyProfile({
        full_name: fullName,
        grade,
        class_name: className,
        avatar_url: avatarUrl,
      });
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          grade,
          cpf: onlyDigits(cpf),
          birth_date: parsedBirthDate.iso,
          enrollment_number: enrollmentNumber.trim() || null,
          whatsapp: onlyDigits(whatsapp) || null,
        },
      });
      if (error) throw error;
      const profileIsCompleteForXp =
        Boolean(fullName.trim()) &&
        Boolean(grade) &&
        onlyDigits(cpf).length === 11 &&
        Boolean(email.trim()) &&
        parsedBirthDate.isValid &&
        Boolean(enrollmentNumber.trim());
      if (profileIsCompleteForXp) {
        const { data: existingXpEvent, error: existingXpError } = await supabase
          .from("xp_events")
          .select("id")
          .eq("event_type", "complete_profile_data")
          .limit(1)
          .maybeSingle();
        if (existingXpError) {
          console.warn("[perfil] Falha ao verificar XP de perfil completo:", existingXpError.message);
        }
        const hadProfileCompleteXp = Boolean(existingXpEvent?.id);
        const { error: xpError } = await supabase.rpc("award_complete_profile_xp_once");
        if (xpError) {
          console.warn("[perfil] Falha ao conceder XP por perfil completo:", xpError.message);
        } else if (!hadProfileCompleteXp) {
          conqueredProfileXp = true;
        }
      }
      Alert.alert(
        "Perfil atualizado",
        conqueredProfileXp
          ? "Seus dados foram salvos com sucesso.\n\nVOCÊ CONQUISTOU 100XP POR COMPLETAR SEU PERFIL COMPLETAMENTE"
          : "Seus dados foram salvos com sucesso.",
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível salvar seu perfil.";
      Alert.alert("Erro", message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!userId) {
      Alert.alert("Erro", "Usuário não identificado para upload da foto.");
      return;
    }
    const hadAvatarBeforeUpload = Boolean((avatarUrl ?? "").trim());
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("user_id", userId);

      if (Platform.OS === "web") {
        const selectedFile = await new Promise<File | null>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.oncancel = () => resolve(null);
          input.click();
        });
        if (!selectedFile) {
          setSaving(false);
          return;
        }

        const ext = normalizeFileExt(selectedFile.name.split(".").pop());
        formData.append("ext", ext);
        formData.append("avatar", selectedFile, `avatar.${ext}`);
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setSaving(false);
          Alert.alert("Permissão necessária", "Permita acesso à galeria para alterar sua foto.");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        });
        if (result.canceled || !result.assets[0]?.uri) {
          setSaving(false);
          return;
        }

        const asset = result.assets[0];
        const uri = asset.uri;
        const ext = normalizeFileExt(uri.split(".").pop());
        formData.append("ext", ext);
        formData.append(
          "avatar",
          { uri, name: `avatar.${ext}`, type: contentTypeFromExt(ext) } as unknown as Blob,
        );
      }

      const uploadEndpoint = `${getPublicSiteUrl()}/upload-avatar.php`;
      const uploadResponse = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const rawResponse = await uploadResponse.text();
      let uploadJson: { ok?: boolean; url?: string; error?: string } = {};
      try {
        uploadJson = JSON.parse(rawResponse) as { ok?: boolean; url?: string; error?: string };
      } catch {
        // Em alguns 500 do servidor compartilhado, a resposta pode vir em HTML.
      }
      if (!uploadResponse.ok || !uploadJson?.ok || !uploadJson.url) {
        const serverMsg = uploadJson?.error || rawResponse.slice(0, 180);
        throw new Error(serverMsg || "Falha no upload para Hostinger.");
      }

      const publicUrl = uploadJson.url;
      setAvatarUrl(publicUrl);

      // Concede XP apenas na primeira foto de perfil para evitar duplicidade.
      if (!hadAvatarBeforeUpload) {
        const { error: xpError } = await supabase.rpc("award_profile_photo_xp_once");
        if (xpError) {
          console.warn("[perfil] Falha ao conceder XP por foto de perfil:", xpError.message);
        }
      }

      Alert.alert("Foto atualizada", "Sua nova foto foi carregada.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível enviar a foto.";
      Alert.alert("Erro ao alterar foto", `${message}\n\nVerifique o endpoint /upload-avatar.php e a pasta /imagens na Hostinger.`);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Erro ao sair", error.message);
      return;
    }
    router.replace("/(marketing)");
  };

  const handleRefreshRecipients = async () => {
    if (!canSendMessages) return;
    try {
      setLoadingRecipients(true);
      const recipients = await fetchMessageRecipientsForSender();
      setMessageRecipients(recipients);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível atualizar a lista de alunos.";
      Alert.alert("Erro", message);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleSendMessageToStudent = async () => {
    if (!canSendMessages) return;
    if (!selectedRecipientId) {
      Alert.alert("Aluno obrigatório", "Selecione um aluno para enviar a mensagem.");
      return;
    }
    if (!messageTitle.trim() || !messageBody.trim()) {
      Alert.alert("Campos obrigatórios", "Preencha título e mensagem.");
      return;
    }
    try {
      setSendingMessage(true);
      await sendStudentMessage({
        student_id: selectedRecipientId,
        title: messageTitle.trim(),
        body: messageBody.trim(),
      });
      setMessageTitle("");
      setMessageBody("");
      Alert.alert("Mensagem enviada", "A notificação foi enviada para a caixa de mensagens do aluno.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível enviar a mensagem.";
      Alert.alert("Erro", message);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <StitchScreenFrame>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: spacing.xs, color: "rgba(255,255,255,0.75)" }}>Carregando perfil...</Text>
        </View>
      </StitchScreenFrame>
    );
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title={planStatus.isPlanPro ? "Perfil Pro" : "Perfil"} subtitle="Configurações e conta" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          {planStatus.isPlanPro ? (
            <View
              style={{
                marginTop: spacing.md,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.55)",
                backgroundColor: "rgba(255,199,0,0.10)",
                padding: spacing.md,
              }}
            >
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.subtitle.fontSize }} weight="bold">
                Vantagens do Perfil Pro
              </Text>
              <View style={{ marginTop: spacing.xs, gap: 6 }}>
                {planProFeatureList.map((feature) => (
                  <Text key={feature} style={{ color: "rgba(255,255,255,0.9)", lineHeight: 20 }}>
                    • {feature}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
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
              Dados do aluno
            </Text>

            <View style={{ marginTop: spacing.sm, alignItems: "center" }}>
              <AvatarWithFallback fullName={fullName || "Aluno"} avatarUrl={avatarUrl} size={84} />
              <View style={{ marginTop: spacing.xs, flexDirection: "row", gap: spacing.xs }}>
                <Pressable
                  onPress={() => {
                    void handlePickAvatar();
                  }}
                  disabled={saving}
                  style={{
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                    Alterar foto
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAvatarUrl(null)}
                  disabled={saving}
                  style={{
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: typography.small.fontSize }} weight="semibold">
                    Remover
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.md, fontSize: typography.small.fontSize }}>
              Nome completo
            </Text>

            <TextInput
              placeholder="Nome completo"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={fullName}
              onChangeText={setFullName}
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

            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
              Série
            </Text>

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
              <Text style={{ color: grade ? colors.white : "rgba(255,255,255,0.45)" }}>{grade || "Série"}</Text>
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
                      setGrade(option);
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

            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
              CPF
            </Text>

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

            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
              Data de nascimento
            </Text>

            <TextInput
              placeholder="DD/MM/AAAA"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="number-pad"
              value={birthDate}
              onChangeText={(value) => setBirthDate(formatBirthDate(value))}
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

            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
              Número de matrícula
            </Text>

            <TextInput
              placeholder="Número de matrícula"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="number-pad"
              value={enrollmentNumber}
              onChangeText={(value) => setEnrollmentNumber(onlyDigits(value))}
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

            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
              E-mail
            </Text>

            <TextInput
              editable={false}
              value={email}
              style={{
                marginTop: spacing.xs,
                height: 46,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: "rgba(255,255,255,0.02)",
                color: "rgba(255,255,255,0.75)",
                paddingHorizontal: spacing.sm,
                fontFamily: typography.fontFamily.base,
              }}
            />

            <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
              WhatsApp (opcional)
            </Text>

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

            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.sm, lineHeight: 20 }}>
              Ao preencher todos os dados do perfil (WhatsApp opcional), você ganha +100 XP.
            </Text>

            <Pressable
              onPress={() => {
                void handleSave();
              }}
              disabled={saving}
              style={{
                marginTop: spacing.md,
                height: 46,
                borderRadius: radii.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.einsteinYellow,
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.einsteinBlue }} weight="bold">
                {saving ? "Salvando..." : "Salvar perfil"}
              </Text>
            </Pressable>
          </View>

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
              Segurança da conta
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, lineHeight: 20 }}>
              Altere sua senha de acesso para manter sua conta segura.
            </Text>

            <TextInput
              placeholder="Nova senha"
              placeholderTextColor="rgba(255,255,255,0.45)"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
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
              placeholder="Confirmar senha"
              placeholderTextColor="rgba(255,255,255,0.45)"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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

            <Pressable
              onPress={() => {
                void handlePasswordChange();
              }}
              disabled={savingPassword}
              style={{
                marginTop: spacing.md,
                height: 46,
                borderRadius: radii.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.einsteinYellow,
                opacity: savingPassword ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.einsteinBlue }} weight="bold">
                {savingPassword ? "Atualizando..." : "Atualizar senha"}
              </Text>
            </Pressable>
          </View>

          {isAdminAccount ? (
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
                Segurança do admin
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, lineHeight: 20 }}>
                Troque a senha da conta administrativa.
              </Text>

              <TextInput
                placeholder="Nova senha"
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry
                value={newAdminPassword}
                onChangeText={setNewAdminPassword}
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
                placeholder="Confirmar senha"
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry
                value={confirmAdminPassword}
                onChangeText={setConfirmAdminPassword}
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

              <Pressable
                onPress={() => {
                  void handleAdminPasswordChange();
                }}
                disabled={savingAdminPassword}
                style={{
                  marginTop: spacing.md,
                  height: 46,
                  borderRadius: radii.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.einsteinYellow,
                  opacity: savingAdminPassword ? 0.7 : 1,
                }}
              >
                <Text style={{ color: colors.einsteinBlue }} weight="bold">
                  {savingAdminPassword ? "Atualizando..." : "Atualizar senha"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {canSendMessages ? (
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
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
                  Enviar notificação ao aluno
                </Text>
                <Pressable
                  onPress={() => {
                    void handleRefreshRecipients();
                  }}
                  disabled={loadingRecipients}
                  style={{
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    opacity: loadingRecipients ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                    {loadingRecipients ? "Atualizando..." : "Atualizar alunos"}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, lineHeight: 20 }}>
                Esta mensagem será entregue na aba Mensagens do aluno.
              </Text>

              <TextInput
                placeholder="Buscar aluno por nome ou série"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={recipientQuery}
                onChangeText={setRecipientQuery}
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

              <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                {filteredRecipients.map((recipient) => {
                  const selected = recipient.id === selectedRecipientId;
                  return (
                    <Pressable
                      key={recipient.id}
                      onPress={() => {
                        setSelectedRecipientId(recipient.id);
                      }}
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: selected ? "rgba(255,199,0,0.85)" : colors.borderSoft,
                        backgroundColor: selected ? "rgba(255,199,0,0.12)" : "rgba(255,255,255,0.02)",
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: colors.white }} weight={selected ? "bold" : "semibold"}>
                        {recipient.full_name?.trim() || "Aluno sem nome"}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: typography.small.fontSize }}>
                        {recipient.grade ? `Série: ${recipient.grade}` : "Série não informada"}
                      </Text>
                    </Pressable>
                  );
                })}
                {filteredRecipients.length === 0 ? (
                  <Text style={{ color: "rgba(255,255,255,0.65)" }}>
                    Nenhum aluno encontrado para este filtro.
                  </Text>
                ) : null}
              </View>

              <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.sm, fontSize: typography.small.fontSize }}>
                Aluno selecionado
              </Text>
              <Text style={{ color: colors.white, marginTop: 2 }} weight="semibold">
                {selectedRecipient ? (selectedRecipient.full_name?.trim() || "Aluno sem nome") : "Nenhum aluno selecionado"}
              </Text>

              <TextInput
                placeholder="Título da mensagem"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={messageTitle}
                onChangeText={setMessageTitle}
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
                placeholder="Escreva a mensagem"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={messageBody}
                onChangeText={setMessageBody}
                multiline
                textAlignVertical="top"
                style={{
                  marginTop: spacing.xs,
                  minHeight: 110,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: colors.white,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                  fontFamily: typography.fontFamily.base,
                }}
              />

              <Pressable
                onPress={() => {
                  void handleSendMessageToStudent();
                }}
                disabled={sendingMessage}
                style={{
                  marginTop: spacing.md,
                  height: 46,
                  borderRadius: radii.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.einsteinYellow,
                  opacity: sendingMessage ? 0.7 : 1,
                }}
              >
                <Text style={{ color: colors.einsteinBlue }} weight="bold">
                  {sendingMessage ? "Enviando..." : "Enviar mensagem"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={handleSignOut} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.einsteinYellow, textAlign: "center" }} weight="semibold">
              Sair
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
