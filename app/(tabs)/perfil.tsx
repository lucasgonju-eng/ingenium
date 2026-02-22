import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import AvatarWithFallback from "../../components/ui/AvatarWithFallback";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import { fetchMyProfile, upsertMyProfile } from "../../lib/supabase/queries";
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
  const [className, setClassName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [{ data: userData }, profile] = await Promise.all([supabase.auth.getUser(), fetchMyProfile()]);
      const metadata = userData.user?.user_metadata ?? {};
      setUserId(userData.user?.id ?? null);

      setFullName(profile?.full_name ?? metadata.full_name ?? "");
      setGrade((profile?.grade ?? metadata.grade ?? "") as (typeof SERIES_OPTIONS)[number] | "");
      setCpf(formatCpf(String(metadata.cpf ?? "")));
      setWhatsapp(formatWhatsapp(String(metadata.whatsapp ?? "")));
      setEmail(userData.user?.email ?? "");
      setClassName(profile?.class_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar seu perfil.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
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
    try {
      setSaving(true);
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
          whatsapp: onlyDigits(whatsapp) || null,
        },
      });
      if (error) throw error;
      Alert.alert("Perfil atualizado", "Seus dados foram salvos com sucesso.");
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
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permissão necessária", "Permita acesso à galeria para alterar sua foto.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]?.uri) return;

      setSaving(true);
      const asset = result.assets[0];
      const uri = asset.uri;
      const ext = normalizeFileExt(uri.split(".").pop());
      const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("ext", ext);

      if (Platform.OS === "web" && "file" in asset && asset.file) {
        formData.append("avatar", asset.file, `avatar.${ext}`);
      } else {
        formData.append("avatar", { uri, name: `avatar.${ext}`, type: contentType } as unknown as Blob);
      }

      const uploadEndpoint = `${getPublicSiteUrl()}/upload-avatar.php`;
      const uploadResponse = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const uploadJson = (await uploadResponse.json()) as { ok?: boolean; url?: string; error?: string };
      if (!uploadResponse.ok || !uploadJson?.ok || !uploadJson.url) {
        throw new Error(uploadJson?.error || "Falha no upload para Hostinger.");
      }

      const publicUrl = uploadJson.url;
      setAvatarUrl(publicUrl);
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
          <StitchHeader title="Perfil" subtitle="Configurações e conta" variant="feed" />
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
