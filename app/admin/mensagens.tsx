import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import {
  fetchMyAccessRole,
  fetchMySupportMessages,
  fetchSupportRecipientsForAdmin,
  markMySupportMessagesAsRead,
  notifyAdminInboxEmail,
  sendSupportMessage,
  type SupportMessageRow,
  type SupportRecipientRow,
} from "../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

export default function AdminMensagensScreen() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [recipients, setRecipients] = useState<SupportRecipientRow[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const isWeb = Platform.OS === "web";

  const selectedRecipient = recipients.find((item) => item.id === selectedRecipientId) ?? null;
  const filteredRecipients = useMemo(() => {
    const search = recipientSearch.trim().toLowerCase();
    const base = recipients.filter((row) => row.id !== selectedRecipientId);
    if (!search) return base.slice(0, 25);
    return base
      .filter((row) => {
        const fullName = (row.full_name ?? "").toLowerCase();
        const email = (row.email ?? "").toLowerCase();
        const role = row.role.toLowerCase();
        return fullName.includes(search) || email.includes(search) || role.includes(search);
      })
      .slice(0, 25);
  }, [recipients, recipientSearch, selectedRecipientId]);
  const receivedMessages = useMemo(
    () => messages.filter((message) => message.direction === "in"),
    [messages],
  );
  const sentMessages = useMemo(
    () => messages.filter((message) => message.direction === "out"),
    [messages],
  );
  const unreadReceivedCount = useMemo(
    () => receivedMessages.filter((message) => !message.read_at).length,
    [receivedMessages],
  );

  async function loadAll() {
    const [rows, users] = await Promise.all([fetchMySupportMessages(120), fetchSupportRecipientsForAdmin()]);
    setMessages(rows);
    setRecipients(users);
  }

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const role = await fetchMyAccessRole();
        if (role !== "admin") {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        await loadAll();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Falha ao carregar mensagens do admin.";
        Alert.alert("Erro", message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSend() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!selectedRecipientId) {
      Alert.alert("Destinatário obrigatório", "Selecione um usuário para enviar a mensagem.");
      return;
    }
    if (!trimmedTitle || !trimmedBody) {
      Alert.alert("Campos obrigatórios", "Preencha assunto e mensagem.");
      return;
    }
    try {
      setSending(true);
      const result = await sendSupportMessage({
        title: trimmedTitle,
        body: trimmedBody,
        recipientId: selectedRecipientId,
        channel: "admin_inbox",
      });
      if (result.recipient_is_admin && result.recipient_email) {
        try {
          await notifyAdminInboxEmail({
            recipients: [{ email: result.recipient_email, fullName: result.recipient_name ?? "Admin" }],
            title: trimmedTitle,
            body: trimmedBody,
            senderName: result.sender_name,
            senderRole: result.sender_role,
            channel: "admin_inbox",
          });
        } catch {
          // Falha de e-mail não bloqueia caixa interna.
        }
      }
      setTitle("");
      setBody("");
      await loadAll();
      Alert.alert("Mensagem enviada", "A mensagem foi registrada na caixa de mensagens.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao enviar mensagem.";
      Alert.alert("Erro", message);
    } finally {
      setSending(false);
    }
  }

  async function handleMarkAsRead() {
    try {
      await markMySupportMessagesAsRead();
      await loadAll();
      Alert.alert("Atualizado", "Mensagens recebidas marcadas como lidas.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao marcar mensagens como lidas.";
      Alert.alert("Erro", message);
    }
  }

  if (loading) {
    return (
      <StitchScreenFrame>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.einsteinYellow} />
        </View>
      </StitchScreenFrame>
    );
  }

  if (!authorized) {
    return (
      <StitchScreenFrame>
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <View style={blockedCardStyle}>
            <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
              Acesso restrito
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: spacing.xs }}>
              Esta caixa de mensagens é exclusiva do admin.
            </Text>
            <Pressable
              onPress={() => router.replace("/admin/login")}
              style={{
                marginTop: spacing.sm,
                minHeight: 42,
                borderRadius: radii.md,
                backgroundColor: colors.einsteinYellow,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.einsteinBlue }} weight="bold">
                Entrar como admin
              </Text>
            </Pressable>
          </View>
        </View>
      </StitchScreenFrame>
    );
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ width: "100%", maxWidth: isWeb ? 1320 : undefined, alignSelf: "center" }}>
          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
            <StitchHeader title="Mensagens Admin" subtitle="Caixa organizada por recebidas e enviadas" variant="feed" />
          </View>

          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm, gap: spacing.sm }}>
            <View style={[sectionCardStyle, isWeb ? { padding: spacing.lg } : null]}>
              <Text style={{ color: colors.white }} weight="bold">
                Nova mensagem
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                Escolha o destinatário e envie a resposta ou comunicado.
              </Text>
              <TextInput
                placeholder="Pesquisar destinatário por nome, e-mail ou perfil"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={recipientSearch}
                onChangeText={setRecipientSearch}
                style={inputStyle}
              />
              {selectedRecipient ? (
                <View style={{ marginTop: spacing.xs, borderRadius: radii.md, borderWidth: 1, borderColor: "rgba(255,199,0,0.45)", backgroundColor: "rgba(255,199,0,0.10)", padding: spacing.xs }}>
                  <Text style={{ color: colors.einsteinYellow }} weight="bold">
                    Destinatário selecionado
                  </Text>
                  <Text style={{ color: colors.white, marginTop: 2 }}>
                    {selectedRecipient.full_name ?? "Sem nome"} ({selectedRecipient.role})
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: spacing.xs, gap: 6, maxHeight: isWeb ? 220 : 180 }}>
                {filteredRecipients.map((recipient) => (
                  <Pressable
                    key={recipient.id}
                    onPress={() => setSelectedRecipientId(recipient.id)}
                    style={{
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      padding: spacing.xs,
                    }}
                  >
                    <Text style={{ color: colors.white }} weight="semibold">
                      {recipient.full_name ?? "Sem nome"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: typography.small.fontSize }}>
                      {recipient.role} {recipient.email ? `• ${recipient.email}` : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                placeholder="Assunto"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={title}
                onChangeText={setTitle}
                style={inputStyle}
              />
              <TextInput
                placeholder="Mensagem"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
                style={[inputStyle, { minHeight: 110, paddingTop: spacing.sm }]}
              />
              <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs }}>
                <Pressable
                  onPress={() => {
                    void loadAll();
                  }}
                  style={secondaryButtonStyle}
                >
                  <Text style={{ color: colors.white }} weight="semibold">
                    Atualizar
                  </Text>
                </Pressable>
                <Pressable onPress={() => void handleSend()} disabled={sending} style={[primaryButtonStyle, { opacity: sending ? 0.7 : 1 }]}>
                  <Text style={{ color: colors.einsteinBlue }} weight="bold">
                    {sending ? "Enviando..." : "Enviar mensagem"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: isWeb ? "row" : "column", gap: spacing.sm, alignItems: "stretch" }}>
              <View style={[sectionCardStyle, { flex: 1 }, isWeb ? { minHeight: 420 } : null]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.white }} weight="bold">
                    Recebidas {unreadReceivedCount > 0 ? `(${unreadReceivedCount} novas)` : ""}
                  </Text>
                  <Pressable onPress={() => void handleMarkAsRead()} style={secondaryButtonStyle}>
                    <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                      Marcar lidas
                    </Text>
                  </Pressable>
                </View>
                <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                  {receivedMessages.length === 0 ? (
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>Sem mensagens recebidas.</Text>
                  ) : (
                    receivedMessages.map((message) => (
                      <View
                        key={message.id}
                        style={{
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: !message.read_at ? "rgba(255,199,0,0.70)" : colors.borderSoft,
                          backgroundColor: !message.read_at ? "rgba(255,199,0,0.10)" : "rgba(255,255,255,0.03)",
                          padding: spacing.sm,
                        }}
                      >
                        <Text style={{ color: colors.white }} weight="bold">
                          {message.title}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.74)", marginTop: 4 }}>
                          Remetente: {message.sender_name} ({message.sender_role})
                        </Text>
                        {message.sender_email ? (
                          <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 2, fontSize: typography.small.fontSize }}>
                            E-mail: {message.sender_email}
                          </Text>
                        ) : null}
                        <Text style={{ color: "rgba(255,255,255,0.88)", marginTop: 8 }}>{message.body}</Text>
                        <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 6, fontSize: typography.small.fontSize }}>
                          {new Date(message.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </Text>
                        <Pressable
                          onPress={() => {
                            setSelectedRecipientId(message.sender_id);
                            setTitle(`Re: ${message.title}`);
                          }}
                          style={{ marginTop: spacing.xs, alignSelf: "flex-start", paddingHorizontal: spacing.xs, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(255,255,255,0.08)" }}
                        >
                          <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                            Responder
                          </Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={[sectionCardStyle, { flex: 1 }, isWeb ? { minHeight: 420 } : null]}>
                <Text style={{ color: colors.white }} weight="bold">
                  Enviadas
                </Text>
                <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                  {sentMessages.length === 0 ? (
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>Sem mensagens enviadas.</Text>
                  ) : (
                    sentMessages.map((message) => (
                      <View
                        key={message.id}
                        style={{
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.borderSoft,
                          backgroundColor: "rgba(59,130,246,0.10)",
                          padding: spacing.sm,
                        }}
                      >
                        <Text style={{ color: colors.white }} weight="bold">
                          {message.title}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.74)", marginTop: 4 }}>
                          Destinatário: {message.recipient_name ?? "Usuário"} ({message.recipient_role})
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.88)", marginTop: 8 }}>{message.body}</Text>
                        <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 6, fontSize: typography.small.fontSize }}>
                          {new Date(message.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}

const blockedCardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

const sectionCardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

const inputStyle = {
  marginTop: spacing.xs,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  color: colors.white,
  minHeight: 44,
  paddingHorizontal: spacing.sm,
  fontFamily: typography.fontFamily.base,
};

const primaryButtonStyle = {
  flex: 1,
  minHeight: 42,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.einsteinYellow,
};

const secondaryButtonStyle = {
  minHeight: 38,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.08)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: spacing.sm,
};
