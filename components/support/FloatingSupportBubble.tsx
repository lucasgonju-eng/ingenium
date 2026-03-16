import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { fetchMyAccessRole, notifyAdminInboxEmail, sendSupportMessage } from "../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

export default function FloatingSupportBubble() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  async function handleSend() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      Alert.alert("Campos obrigatórios", "Preencha assunto e mensagem.");
      return;
    }

    try {
      setSending(true);
      const role = await fetchMyAccessRole().catch(() => null);
      const result = await sendSupportMessage({
        title: trimmedTitle,
        body: trimmedBody,
        channel: "duvida_sugestao",
      });

      if (result.recipient_is_admin && result.recipient_email) {
        try {
          await notifyAdminInboxEmail({
            recipients: [{ email: result.recipient_email, fullName: result.recipient_name ?? "Admin" }],
            title: trimmedTitle,
            body: trimmedBody,
            senderName: result.sender_name,
            senderRole: result.sender_role,
            channel: "duvida_sugestao",
          });
        } catch {
          // Não bloqueia o envio da mensagem no app por falha de e-mail.
        }
      }

      setOpen(false);
      setTitle("");
      setBody("");
      Alert.alert("Enviado", "Sua mensagem foi enviada para a caixa do admin.");
      if (role === "admin") {
        router.push("/admin/mensagens");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao enviar mensagem.";
      Alert.alert("Erro", message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: Math.max(insets.top + 10, 12),
          left: spacing.sm,
          zIndex: 1000,
        }}
      >
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            {
              minHeight: 42,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: "rgba(255,199,0,0.50)",
              backgroundColor: "rgba(10,16,40,0.88)",
              paddingHorizontal: spacing.sm,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="bold">
            Dúvidas/Sugestões
          </Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(2,6,23,0.66)",
            justifyContent: "center",
            paddingHorizontal: spacing.md,
          }}
        >
          <View
            style={{
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
              Enviar para Admin
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.74)" }}>
              Sua mensagem vai para a caixa do admin e também para o e-mail do admin.
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Assunto"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={{
                marginTop: spacing.xs,
                height: 44,
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
              value={body}
              onChangeText={setBody}
              placeholder="Descreva sua dúvida ou sugestão"
              placeholderTextColor="rgba(255,255,255,0.45)"
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 120,
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

            <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs }}>
              <Pressable
                onPress={() => setOpen(false)}
                style={{
                  flex: 1,
                  minHeight: 42,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.white }} weight="semibold">
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleSend();
                }}
                disabled={sending}
                style={{
                  flex: 1,
                  minHeight: 42,
                  borderRadius: radii.md,
                  backgroundColor: colors.einsteinYellow,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                <Text style={{ color: colors.einsteinBlue }} weight="bold">
                  {sending ? "Enviando..." : "Enviar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
