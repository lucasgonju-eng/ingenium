import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, View } from "react-native";
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
import { fetchFeedPosts, FeedPost } from "../../lib/supabase/queries";
import { getSessionUser } from "../../lib/supabase/session";
import { colors, radii, spacing } from "../../lib/theme/tokens";
import { router } from "expo-router";

type FeedUiState = "LOADING" | "NO_SESSION" | "NO_PERMISSION" | "EMPTY" | "READY";

export default function MuralScreen() {
  const [state, setState] = useState<FeedUiState>("LOADING");
  const [rows, setRows] = useState<FeedPost[]>([]);
  const [hasUser, setHasUser] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const FEED_MOCK_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_FEED_MOCK === "1";

  async function load() {
    try {
      setState("LOADING");
      setLastError(null);

      const { user, error: userError } = await getSessionUser();
      setHasUser(Boolean(user));

      if (userError && !FEED_MOCK_ENABLED) {
        setLastError(userError.message ?? "Erro ao validar sessão");
      }

      if (!user && !FEED_MOCK_ENABLED) {
        setRows([]);
        setState("NO_SESSION");
        return;
      }

      const { data, error } = await fetchFeedPosts(30);
      const msg = (error as { message?: string } | null)?.message ?? null;
      if (msg) setLastError(msg);

      if (error && !FEED_MOCK_ENABLED) {
        const normalized = msg?.toLowerCase?.() ?? "";
        if (
          normalized.includes("permission") ||
          normalized.includes("not authorized") ||
          normalized.includes("row")
        ) {
          setRows([]);
          setState("NO_PERMISSION");
          return;
        }

        setRows([]);
        setState("NO_PERMISSION");
        return;
      }

      const finalPosts = FEED_MOCK_ENABLED ? getMockFeedPosts() : data;
      setRows(finalPosts);
      setState(finalPosts.length === 0 ? "EMPTY" : "READY");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar mural";
      setLastError(message);
      setRows([]);
      setState(FEED_MOCK_ENABLED ? "READY" : "NO_PERMISSION");
      if (!FEED_MOCK_ENABLED) Alert.alert("Erro", message);
    } finally {
      // no-op
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    return rows;
  }, [rows]);

  const devStrip =
    __DEV__ ? (
      <View
        style={{
          marginHorizontal: spacing.md,
          marginTop: spacing.xs,
          paddingHorizontal: spacing.xs,
          paddingVertical: 4,
          borderRadius: radii.sm,
          backgroundColor: "rgba(0,0,0,0.28)",
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>
          {`DEV — state=${state} user=${hasUser ? "yes" : "no"} posts=${rows.length} err=${lastError ?? "-"}`}
        </Text>
      </View>
    ) : null;

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
            <StitchHeader
              title="Mural"
              subtitle="Ingenium Einstein"
              variant="feed"
            />

            {devStrip}

            <FeedTabs />
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: spacing.md }}>
            <FeedPostCard
              authorName="Comunidade Ingenium"
              body={item.content}
              createdAt={item.created_at}
              kind={(item as FeedPost & { kind?: "announcement" | "highlight" | "tip" }).kind}
              title={(item as FeedPost & { title?: string }).title}
              ctaLabel={(item as FeedPost & { ctaLabel?: string }).ctaLabel}
              badge={(item as FeedPost & { badge?: string }).badge}
            />
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
