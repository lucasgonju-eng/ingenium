import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import RankingList from "../../components/ranking/RankingList";
import RankingItem from "../../components/sections/RankingItem";
import RankingEligibilityCard from "../../components/sections/RankingEligibilityCard";
import RankingTopPodium from "../../components/sections/RankingTopPodium";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import { fetchMyRankGeralMedia, fetchRankingGeralMediaPublic, MyRankGeralMedia } from "../../lib/supabase/queries";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

type RankingRow = {
  position_geral_media: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  avg_points: number;
  olympiads_count: number;
  total_points_sum: number;
  total_points: number | null;
  lobo_class: "bronze" | "silver" | "gold";
};

export default function RankingScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRankInfo, setMyRankInfo] = useState<MyRankGeralMedia | null>(null);
  const [search, setSearch] = useState("");
  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const restRows = useMemo(() => rows.slice(3), [rows]);
  const adjustedRestRows = useMemo(() => {
    if (!myUserId) return restRows;

    const myIndex = restRows.findIndex((row) => row.user_id === myUserId);
    if (myIndex === -1) return restRows;

    const myRow = restRows[myIndex];
    const withoutMe = [...restRows.slice(0, myIndex), ...restRows.slice(myIndex + 1)];
    return [myRow, ...withoutMe];
  }, [restRows, myUserId]);
  const myRow = useMemo(
    () => rows.find((row) => row.user_id === myUserId) ?? null,
    [rows, myUserId],
  );

  async function load() {
    try {
      setLoading(true);
      const [{ data: sessionData }, data] = await Promise.all([
        supabase.auth.getSession(),
        fetchRankingGeralMediaPublic(50),
      ]);
      setMyUserId(sessionData.session?.user?.id ?? null);
      setRows(data as RankingRow[]);
      const mine = await fetchMyRankGeralMedia();
      setMyRankInfo(mine);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar ranking";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRestRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return adjustedRestRows;
    return adjustedRestRows.filter((row) => (row.full_name ?? "").toLowerCase().includes(q));
  }, [adjustedRestRows, search]);

  const headerComponent = (
    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
      <StitchHeader
        title="Ranking Geral"
        rightSlot={
          <Pressable
            onPress={() => {
              void load();
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text style={{ color: colors.white, fontSize: 18 }}>⋮</Text>
          </Pressable>
        }
      />

      <View style={{ marginTop: spacing.sm }}>
        <View
          style={{
            height: sizes.inputHeight,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.sm,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.6)", marginRight: spacing.xs }}>⌕</Text>
          <TextInput
            placeholder="Buscar aluno..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              color: colors.white,
              fontFamily: typography.fontFamily.base,
              fontSize: typography.subtitle.fontSize,
            }}
          />
        </View>
      </View>

      <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
        <Pressable
          style={{
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            backgroundColor: colors.einsteinBlue,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.22)",
          }}
        >
          <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
            Todos
          </Text>
        </Pressable>
        <Pressable
          style={{
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            backgroundColor: colors.surfacePanel,
            borderWidth: 1,
            borderColor: colors.borderSoft,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: typography.small.fontSize }} weight="semibold">
            3º Ano
          </Text>
        </Pressable>
        <Pressable
          style={{
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            backgroundColor: colors.surfacePanel,
            borderWidth: 1,
            borderColor: colors.borderSoft,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: typography.small.fontSize }} weight="semibold">
            Matemática
          </Text>
        </Pressable>
      </View>

      <RankingEligibilityCard rankInfo={myRankInfo} />

      <View style={{ marginTop: spacing.sm }}>
        <RankingTopPodium
          variant="geral"
          top3={top3.map((row) => ({
            position: row.position_geral_media,
            user_id: row.user_id,
            full_name: row.full_name,
            avatar_url: row.avatar_url,
            lobo_class: row.lobo_class,
            avg_points: Number(row.avg_points),
            olympiads_count: row.olympiads_count,
          }))}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <StitchScreenFrame>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.75)" }}>Carregando ranking...</Text>
        </View>
      </StitchScreenFrame>
    );
  }

  return (
    <StitchScreenFrame>
      <RankingList
        rows={filteredRestRows}
        myUserId={myUserId}
        headerComponent={headerComponent}
      />

      {myRow ? (
        <View
          style={{
            position: "absolute",
            left: spacing.md,
            right: spacing.md,
            bottom: spacing.md,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            backgroundColor: colors.surfaceCard,
            padding: spacing.sm,
            ...shadows.soft,
          }}
        >
          <RankingItem
            position={myRow.position_geral_media}
            fullName={myRow.full_name}
            avatarUrl={myRow.avatar_url}
            loboClass={myRow.lobo_class}
            avgPoints={Number(myRow.avg_points)}
            olympiadsCount={myRow.olympiads_count}
            rightLabel={Number(myRow.avg_points).toFixed(2)}
            isMe
            compact
          />
        </View>
      ) : null}
    </StitchScreenFrame>
  );
}
