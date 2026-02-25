import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, TextInput, View } from "react-native";
import FeedEmptyState from "../../components/feed/FeedEmptyState";
import FeedNoPermissionState from "../../components/feed/FeedNoPermissionState";
import FeedNoSessionState from "../../components/feed/FeedNoSessionState";
import FeedPostCard from "../../components/feed/FeedPostCard";
import FeedSkeleton from "../../components/feed/FeedSkeleton";
import FeedTabs from "../../components/feed/FeedTabs";
import { getMockFeedPosts } from "../../components/feed/mockFeed";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { createProfileFeedPost, deleteProfileFeedPost, fetchMyProfile, fetchProfileFeedPosts, FeedPost } from "../../lib/supabase/queries";
import { runFeedAIAudit } from "../../lib/feed/aiAudit";
import { getSessionUser } from "../../lib/supabase/session";
import { colors, radii, spacing } from "../../lib/theme/tokens";
import { router, useLocalSearchParams } from "expo-router";

type FeedUiState = "LOADING" | "NO_SESSION" | "NO_PERMISSION" | "EMPTY" | "READY";

export default function FeedScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const [state, setState] = useState<FeedUiState>("LOADING");
  const [rows, setRows] = useState<FeedPost[]>([]);
  const [hasUser, setHasUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [feedOwnerId, setFeedOwnerId] = useState<string | null>(null);
  const [feedOwnerName, setFeedOwnerName] = useState<string | null>(null);
  const [canPostOwnFeed, setCanPostOwnFeed] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [postFeedback, setPostFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const FEED_MOCK_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_FEED_MOCK === "1";

  async function load() {
    try {
      setState("LOADING");
      setLastError(null);

      const { user, error: userError } = await getSessionUser();
      setHasUser(Boolean(user));
      setCurrentUserId(user?.id ?? null);

      const queryUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
      const normalizedQueryUserId = (queryUserId ?? "").trim();
      const targetFeedOwnerId = normalizedQueryUserId || user?.id || "";
      const ownFeed = Boolean(user?.id) && user?.id === targetFeedOwnerId;
      setCanPostOwnFeed(ownFeed);
      setFeedOwnerId(targetFeedOwnerId || null);

      if (userError && !FEED_MOCK_ENABLED) {
        setLastError(userError.message ?? "Erro ao validar sessão");
      }

      if (!user && !FEED_MOCK_ENABLED) {
        setRows([]);
        setState("NO_SESSION");
        return;
      }

      if (!targetFeedOwnerId && !FEED_MOCK_ENABLED) {
        setRows([]);
        setState("NO_PERMISSION");
        return;
      }

      const ownerProfile = await fetchMyProfile(targetFeedOwnerId);
      setFeedOwnerName(ownerProfile?.full_name ?? null);

      const { data, error } = await fetchProfileFeedPosts(targetFeedOwnerId, 30);
      const msg = (error as { message?: string } | null)?.message ?? null;
      if (msg) setLastError(msg);

      if (error && !FEED_MOCK_ENABLED) {
        setRows([]);
        setState("NO_PERMISSION");
        return;
      }

      const finalPosts = FEED_MOCK_ENABLED ? getMockFeedPosts() : data;
      setRows(finalPosts);
      setState(finalPosts.length === 0 ? "EMPTY" : "READY");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar feed";
      setLastError(message);
      setRows([]);
      setState(FEED_MOCK_ENABLED ? "READY" : "NO_PERMISSION");
      if (!FEED_MOCK_ENABLED) Alert.alert("Erro", message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreatePost() {
    setPostFeedback(null);
    if (!hasUser) {
      Alert.alert("Sessão necessária", "Faça login para publicar no seu feed.");
      setPostFeedback({ kind: "error", message: "Faça login para publicar no seu feed." });
      return;
    }
    if (!canPostOwnFeed) {
      setPostFeedback({ kind: "error", message: "Você só pode publicar no seu próprio feed." });
      return;
    }

    const message = newPost.trim();
    if (!message) {
      Alert.alert("Post vazio", "Digite uma mensagem para publicar.");
      setPostFeedback({ kind: "error", message: "Digite uma mensagem para publicar." });
      return;
    }

    try {
      setPosting(true);
      const audit = await runFeedAIAudit(message);
      if (!audit.approved) {
        const feedback = `${audit.reason} (categoria: ${audit.category})`;
        Alert.alert("Conteúdo bloqueado", `${audit.reason}\n\nCategoria: ${audit.category} • Score: ${audit.score.toFixed(2)}`);
        setPostFeedback({ kind: "error", message: feedback });
        return;
      }

      const created = await createProfileFeedPost(message);
      setRows((prev) => [created, ...prev]);
      setNewPost("");
      setState("READY");
      setPostFeedback({ kind: "ok", message: "Post publicado com sucesso." });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Falha ao publicar no feed.";
      Alert.alert("Erro ao publicar", errMsg);
      setPostFeedback({ kind: "error", message: errMsg });
    } finally {
      setPosting(false);
    }
  }

  async function confirmDeletePost(postId: string) {
    try {
      if (!canPostOwnFeed) throw new Error("Você só pode excluir postagens do seu próprio feed.");
      setDeletingPostId(postId);
      await deleteProfileFeedPost(postId);
      await load();
      setPostFeedback({ kind: "ok", message: "Postagem excluída com sucesso." });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Não foi possível excluir a postagem.";
      Alert.alert("Erro ao excluir", errMsg);
      setPostFeedback({ kind: "error", message: errMsg });
    } finally {
      setDeletingPostId(null);
    }
  }

  function handleDeletePress(post: FeedPost) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const confirmed = window.confirm("Tem certeza que deseja apagar esta mensagem do seu feed?");
      if (confirmed) void confirmDeletePost(post.id);
      return;
    }

    Alert.alert(
      "Excluir postagem",
      "Tem certeza que deseja apagar esta mensagem do seu feed?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            void confirmDeletePost(post.id);
          },
        },
      ],
    );
  }

  const filteredRows = useMemo(() => rows, [rows]);

  return (
    <StitchScreenFrame>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        data={filteredRows}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
            <StitchHeader title="Feed" subtitle="Perfil do aluno" variant="feed" />
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs }}>
              {canPostOwnFeed
                ? "Seu feed pessoal"
                : `Feed de ${feedOwnerName?.trim() || "aluno"}`}
            </Text>
            <FeedTabs />
            <View
              style={{
                marginTop: spacing.sm,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.sm,
              }}
            >
              <Text style={{ color: colors.white, marginBottom: spacing.xs }} weight="semibold">
                {canPostOwnFeed ? "Compartilhar no seu feed" : "Visualização do feed"}
              </Text>
              <TextInput
                value={newPost}
                onChangeText={setNewPost}
                editable={!posting && hasUser && canPostOwnFeed}
                multiline
                numberOfLines={4}
                maxLength={400}
                placeholder={
                  hasUser
                    ? canPostOwnFeed
                      ? "Escreva sua postagem..."
                      : "Apenas o dono deste feed pode publicar aqui"
                    : "Faça login para publicar no feed"
                }
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={{
                  minHeight: 92,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: colors.white,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  textAlignVertical: "top",
                }}
              />
              <View style={{ marginTop: spacing.xs, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                  Auditoria IA ativa para conteúdo adequado a menores de 12 anos.
                </Text>
                <Pressable
                  onPress={() => {
                    void handleCreatePost();
                  }}
                  disabled={posting || !hasUser || !canPostOwnFeed}
                  style={{
                    height: 36,
                    borderRadius: radii.md,
                    paddingHorizontal: spacing.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.einsteinYellow,
                    opacity: posting || !hasUser || !canPostOwnFeed ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: colors.einsteinBlue }} weight="bold">
                    {posting ? "Publicando..." : "Postar"}
                  </Text>
                </Pressable>
              </View>
              {postFeedback ? (
                <Text
                  style={{
                    marginTop: spacing.xs,
                    color: postFeedback.kind === "ok" ? "#9EE6B8" : "#FFB4B4",
                    fontSize: 12,
                  }}
                >
                  {postFeedback.message}
                </Text>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: spacing.md }}>
            <FeedPostCard
              authorName={item.author_name?.trim() || "Comunidade InGenium"}
              authorAvatar={item.author_avatar}
              body={item.content}
              createdAt={item.created_at}
              kind={(item as FeedPost & { kind?: "announcement" | "highlight" | "tip" }).kind}
              title={(item as FeedPost & { title?: string }).title}
              ctaLabel={(item as FeedPost & { ctaLabel?: string }).ctaLabel}
              badge={(item as FeedPost & { badge?: string }).badge}
            />
            {canPostOwnFeed && currentUserId && item.author_id === currentUserId && item.feed_owner_id === feedOwnerId ? (
              <View style={{ marginTop: spacing.xs, alignItems: "flex-end" }}>
                <Pressable
                  disabled={deletingPostId === item.id}
                  onPress={() => handleDeletePress(item)}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.25)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    opacity: deletingPostId === item.id ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#FFB4B4", fontSize: 12 }} weight="semibold">
                    {deletingPostId === item.id ? "Excluindo..." : "Excluir minha postagem"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          state === "LOADING" ? (
            <FeedSkeleton />
          ) : state === "NO_SESSION" ? (
            <FeedNoSessionState
              onLogin={() => router.push("/(auth)/login")}
              onSignup={() => router.push("/(auth)/cadastro")}
            />
          ) : state === "NO_PERMISSION" ? (
            <FeedNoPermissionState onBack={() => router.push("/(marketing)")} />
          ) : (
            <FeedEmptyState />
          )
        }
      />
    </StitchScreenFrame>
  );
}
