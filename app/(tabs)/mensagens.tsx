import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { fetchMyStudentMessages, markMyStudentMessagesAsRead, type StudentMessageRow } from "../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

export default function MensagensScreen() {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<StudentMessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [markingMessagesRead, setMarkingMessagesRead] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const unreadCount = messages.filter((message) => !message.read_at).length;

  useEffect(() => {
    if (unreadCount <= 0) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulseAnim, unreadCount]);

  const loadMessages = async () => {
    try {
      const rows = await fetchMyStudentMessages();
      setMessages(rows);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar suas mensagens.";
      Alert.alert("Erro", message);
    }
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadMessages();
      setLoading(false);
    })();
  }, []);

  const handleRefreshMessages = async () => {
    try {
      setLoadingMessages(true);
      await loadMessages();
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleMarkMessagesAsRead = async () => {
    if (unreadCount <= 0) return;
    try {
      setMarkingMessagesRead(true);
      await markMyStudentMessagesAsRead();
      setMessages((prev) => prev.map((message) => ({ ...message, read_at: message.read_at ?? new Date().toISOString() })));
      Alert.alert("Mensagens atualizadas", "Todas as mensagens foram marcadas como lidas.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Não foi possível marcar as mensagens como lidas.";
      Alert.alert("Erro", message);
    } finally {
      setMarkingMessagesRead(false);
    }
  };

  if (loading) {
    return (
      <StitchScreenFrame>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: spacing.xs, color: "rgba(255,255,255,0.75)" }}>Carregando mensagens...</Text>
        </View>
      </StitchScreenFrame>
    );
  }

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Mensagens" subtitle="Sua caixa de mensagens do InGenium" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          <View
            style={{
              marginTop: spacing.md,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: unreadCount > 0 ? "rgba(255,199,0,0.85)" : colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: spacing.md,
              overflow: "hidden",
            }}
          >
            {unreadCount > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: colors.einsteinYellow,
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.08, 0.22],
                  }),
                }}
              />
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
                Caixa de Mensagens
              </Text>
              <Text style={{ color: unreadCount > 0 ? colors.einsteinYellow : "rgba(255,255,255,0.7)" }} weight="semibold">
                {unreadCount > 0 ? `${unreadCount} nova(s)` : "Sem novas"}
              </Text>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, lineHeight: 20 }}>
              Recados enviados por professores, coordenação, gestão e diretoria.
            </Text>

            <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
              <Pressable
                onPress={() => {
                  void handleRefreshMessages();
                }}
                disabled={loadingMessages}
                style={{
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  opacity: loadingMessages ? 0.7 : 1,
                }}
              >
                <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                  {loadingMessages ? "Atualizando..." : "Atualizar"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleMarkMessagesAsRead();
                }}
                disabled={markingMessagesRead || unreadCount <= 0}
                style={{
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: unreadCount > 0 ? colors.einsteinYellow : "rgba(255,255,255,0.08)",
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                  opacity: markingMessagesRead || unreadCount <= 0 ? 0.55 : 1,
                }}
              >
                <Text
                  style={{
                    color: unreadCount > 0 ? colors.einsteinBlue : colors.white,
                    fontSize: typography.small.fontSize,
                  }}
                  weight="semibold"
                >
                  {markingMessagesRead ? "Marcando..." : "Marcar todas como lidas"}
                </Text>
              </Pressable>
            </View>

            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              {messages.length === 0 ? (
                <View
                  style={{
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: "rgba(255,255,255,0.02)",
                    padding: spacing.sm,
                  }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                    Você ainda não possui mensagens.
                  </Text>
                </View>
              ) : (
                messages.map((message) => (
                  <View
                    key={message.id}
                    style={{
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: !message.read_at ? "rgba(255,199,0,0.85)" : colors.borderSoft,
                      backgroundColor: !message.read_at ? "rgba(255,199,0,0.09)" : "rgba(255,255,255,0.02)",
                      padding: spacing.sm,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
                      <Text style={{ color: colors.white }} weight="bold">
                        {message.title}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: typography.small.fontSize }}>
                        {new Date(message.created_at).toLocaleDateString("pt-BR")}
                      </Text>
                    </View>
                    <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.78)" }}>
                      {message.body}
                    </Text>
                    <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.62)", fontSize: typography.small.fontSize }}>
                      De: {message.sender_name} ({message.sender_role})
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
