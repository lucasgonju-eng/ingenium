import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import RankingList from "../../components/ranking/RankingList";
import RankingItem from "../../components/sections/RankingItem";
import RankingEligibilityCard from "../../components/sections/RankingEligibilityCard";
import RankingTopPodium from "../../components/sections/RankingTopPodium";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { copy } from "../../content/copy";
import { supabase } from "../../lib/supabase/client";
import {
  fetchLabGamesRankingStudentRpc,
  fetchMyRankGeralMedia,
  fetchRankingAllRegisteredStudents,
  LabGamesRankingScope,
  LabGamesRankingRow,
  MyRankGeralMedia,
} from "../../lib/supabase/queries";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

const SERIES_FILTERS = ["Todos", "6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;
type SeriesFilter = (typeof SERIES_FILTERS)[number];

type RankingRow = {
  position: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  grade: string | null;
  total_points: number;
  lobo_class: "bronze" | "silver" | "gold";
};

type RankingViewId = "official" | "lab_total" | "lab_weekly" | "lab_fundamental" | "lab_medio";

const RANKING_VIEWS: Array<{ id: RankingViewId; label: string; title: string }> = [
  { id: "official", label: "Oficial", title: "Ranking Geral Oficial" },
  { id: "lab_total", label: "Lab Total", title: "Ranking Lab Games Total" },
  { id: "lab_weekly", label: "Lab Semanal", title: "Ranking Lab Games Semanal" },
  { id: "lab_fundamental", label: "Lab Fundamental", title: "Ranking Lab Games Fundamental" },
  { id: "lab_medio", label: "Lab Médio", title: "Ranking Lab Games Médio" },
];

const EMPTY_LAB_RANKINGS: Record<LabGamesRankingScope, RankingRow[]> = {
  total: [],
  weekly: [],
  fundamental: [],
  medio: [],
};

function mapLabRowsToRankingRows(rows: LabGamesRankingRow[]): RankingRow[] {
  return rows.map((row) => ({
    position: row.rank,
    user_id: row.user_id,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    grade: row.grade,
    total_points: row.lab_points,
    lobo_class: row.lobo_class,
  }));
}

function getLabScopeByView(view: RankingViewId): LabGamesRankingScope | null {
  if (view === "lab_total") return "total";
  if (view === "lab_weekly") return "weekly";
  if (view === "lab_fundamental") return "fundamental";
  if (view === "lab_medio") return "medio";
  return null;
}

export default function RankingScreen() {
  const [loading, setLoading] = useState(true);
  const [officialRows, setOfficialRows] = useState<RankingRow[]>([]);
  const [labRowsByScope, setLabRowsByScope] = useState<Record<LabGamesRankingScope, RankingRow[]>>(EMPTY_LAB_RANKINGS);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRankInfo, setMyRankInfo] = useState<MyRankGeralMedia | null>(null);
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState<SeriesFilter>("Todos");
  const [rankingView, setRankingView] = useState<RankingViewId>("official");

  const activeView = useMemo(
    () => RANKING_VIEWS.find((view) => view.id === rankingView) ?? RANKING_VIEWS[0],
    [rankingView],
  );
  const labScope = getLabScopeByView(rankingView);
  const sourceRows = labScope ? labRowsByScope[labScope] : officialRows;
  const isOfficialView = rankingView === "official";

  const rankedRows = useMemo(() => {
    if (!isOfficialView) return sourceRows;
    if (seriesFilter === "Todos") return sourceRows;

    const filtered = sourceRows.filter((row) => (row.grade ?? "").trim() === seriesFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR");
    });
    return sorted.map((row, idx) => ({ ...row, position: idx + 1 }));
  }, [isOfficialView, sourceRows, seriesFilter]);

  const top3Series = useMemo(() => rankedRows.slice(0, 3), [rankedRows]);
  const restRows = useMemo(() => rankedRows.slice(3), [rankedRows]);
  const adjustedRestRows = useMemo(() => {
    if (!myUserId) return restRows;

    const myIndex = restRows.findIndex((row) => row.user_id === myUserId);
    if (myIndex === -1) return restRows;

    const myRow = restRows[myIndex];
    const withoutMe = [...restRows.slice(0, myIndex), ...restRows.slice(myIndex + 1)];
    return [myRow, ...withoutMe];
  }, [restRows, myUserId]);
  const myRow = useMemo(
    () => rankedRows.find((row) => row.user_id === myUserId) ?? null,
    [rankedRows, myUserId],
  );

  async function load() {
    try {
      setLoading(true);
      const [
        { data: sessionData },
        officialData,
        mine,
        labTotal,
        labWeekly,
        labFundamental,
        labMedio,
      ] = await Promise.all([
        supabase.auth.getSession(),
        fetchRankingAllRegisteredStudents(500),
        fetchMyRankGeralMedia(),
        fetchLabGamesRankingStudentRpc("total", 500),
        fetchLabGamesRankingStudentRpc("weekly", 500),
        fetchLabGamesRankingStudentRpc("fundamental", 500),
        fetchLabGamesRankingStudentRpc("medio", 500),
      ]);
      setMyUserId(sessionData.session?.user?.id ?? null);
      setOfficialRows(officialData as RankingRow[]);
      setMyRankInfo(mine);
      setLabRowsByScope({
        total: mapLabRowsToRankingRows(labTotal),
        weekly: mapLabRowsToRankingRows(labWeekly),
        fundamental: mapLabRowsToRankingRows(labFundamental),
        medio: mapLabRowsToRankingRows(labMedio),
      });
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
        title={activeView.title}
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
            <Text style={{ color: colors.white, fontSize: 18 }}>↻</Text>
          </Pressable>
        }
      />

      <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
        {RANKING_VIEWS.map((view) => {
          const selected = rankingView === view.id;
          return (
            <Pressable
              key={view.id}
              onPress={() => setRankingView(view.id)}
              style={{
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                backgroundColor: selected ? colors.einsteinBlue : colors.surfacePanel,
                borderWidth: 1,
                borderColor: selected ? "rgba(255,255,255,0.22)" : colors.borderSoft,
              }}
            >
              <Text
                style={{
                  color: selected ? colors.white : "rgba(255,255,255,0.78)",
                  fontSize: typography.small.fontSize,
                }}
                weight="semibold"
              >
                {view.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

      {isOfficialView ? (
        <>
          <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            {SERIES_FILTERS.map((filter) => {
              const selected = seriesFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setSeriesFilter(filter)}
                  style={{
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                    backgroundColor: selected ? colors.einsteinBlue : colors.surfacePanel,
                    borderWidth: 1,
                    borderColor: selected ? "rgba(255,255,255,0.22)" : colors.borderSoft,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.white : "rgba(255,255,255,0.78)",
                      fontSize: typography.small.fontSize,
                    }}
                    weight="semibold"
                  >
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={{
              marginTop: spacing.sm,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: "rgba(255,199,0,0.35)",
              backgroundColor: "rgba(255,199,0,0.08)",
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text style={{ color: colors.einsteinYellow, fontSize: typography.subtitle.fontSize }} weight="bold">
              Categorias oficiais do Ranking
            </Text>
            <View
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.45)",
                backgroundColor: "rgba(255,199,0,0.16)",
                padding: spacing.sm,
              }}
            >
              <Text style={{ color: colors.einsteinYellow }} weight="bold">
                Lobo de Ouro
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.88)", marginTop: 2 }}>20.000 XP ou mais</Text>
            </View>
            <View
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: "rgba(183,198,214,0.5)",
                backgroundColor: "rgba(183,198,214,0.14)",
                padding: spacing.sm,
              }}
            >
              <Text style={{ color: "#D9E2EC" }} weight="bold">
                Lobo de Prata
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.86)", marginTop: 2 }}>8.000 a 19.999 XP</Text>
            </View>
            <View
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: "rgba(190,122,62,0.5)",
                backgroundColor: "rgba(190,122,62,0.14)",
                padding: spacing.sm,
              }}
            >
              <Text style={{ color: "#D7A273" }} weight="bold">
                Lobo de Bronze
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.84)", marginTop: 2 }}>0 a 7.999 XP</Text>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.82)" }} weight="semibold">
              Ao ultrapassar 7.999 XP, o aluno sobe para Lobo de Prata. Ao ultrapassar 19.999 XP, sobe para Lobo de Ouro.
            </Text>
          </View>

          <View
            style={{
              marginTop: spacing.sm,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
              Regras oficiais de XP
            </Text>
            {copy.program.xpRules.map((rule) => (
              <Text key={rule.key} style={{ color: "rgba(255,255,255,0.8)" }}>
                - {rule.label}: +{rule.xp.toLocaleString("pt-BR")} XP
              </Text>
            ))}
          </View>

          <RankingEligibilityCard rankInfo={myRankInfo} />
        </>
      ) : (
        <View
          style={{
            marginTop: spacing.sm,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: "rgba(95,197,255,0.4)",
            backgroundColor: "rgba(95,197,255,0.10)",
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
            Ranking exclusivo do Lab Games
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.86)" }}>
            Este ranking não se mistura com o ranking oficial. A pontuação do Lab Games continua somando no ranking geral.
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.78)" }}>
            Visualizações: total acumulado, semanal e recortes por segmento (Fundamental e Médio).
          </Text>
        </View>
      )}

      <View style={{ marginTop: spacing.sm }}>
        <RankingTopPodium
          variant="geral"
          top3={top3Series.map((row) => ({
            position: row.position,
            user_id: row.user_id,
            full_name: row.full_name,
            avatar_url: row.avatar_url,
            lobo_class: row.lobo_class,
            points: Number(row.total_points),
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
      <RankingList rows={filteredRestRows} myUserId={myUserId} headerComponent={headerComponent} />

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
            position={myRow.position}
            fullName={myRow.full_name}
            avatarUrl={myRow.avatar_url}
            loboClass={myRow.lobo_class}
            points={Number(myRow.total_points)}
            rightLabel={Number(myRow.total_points).toLocaleString("pt-BR")}
            isMe
            compact
          />
        </View>
      ) : null}
    </StitchScreenFrame>
  );
}
