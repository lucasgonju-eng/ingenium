import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import AvatarWithFallback from "../../components/ui/AvatarWithFallback";
import DashboardActions from "../../components/sections/DashboardActions";
import DashboardHero from "../../components/sections/DashboardHero";
import RankingItem from "../../components/sections/RankingItem";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import {
  ensureTeacherAccessRequestFromCurrentUser,
  fetchMyAccessRole,
  fetchMyLatestAccessRequest,
  fetchMyPlanProStatus,
  fetchMyStudentMessages,
  fetchRankingAllRegisteredStudents,
  fetchRegisteredStudents,
  fetchMyProfile,
  fetchMyPoints,
  fetchMyRankGeralMedia,
  MyPlanProStatus,
  RegisteredStudentRow,
  RankingStudentRow,
  MyRankGeralMedia,
} from "../../lib/supabase/queries";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";

type LoboClass = "bronze" | "silver" | "gold";
const SERIES_FILTERS = ["Todos", "6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;
type SeriesFilter = (typeof SERIES_FILTERS)[number];

function getClassLabel(cls: LoboClass) {
  if (cls === "gold") return "Lobo de Ouro";
  if (cls === "silver") return "Lobo de Prata";
  return "Lobo de Bronze";
}

function getHeroAccent(cls: LoboClass) {
  if (cls === "gold") return "#FFD700";
  if (cls === "silver") return "#C0C0C0";
  return "#CD7F32";
}

function getProgressToNext(points: number) {
  if (points >= 20000) return { pct: 100, text: "Classe máxima atingida", next: "Ouro" };
  if (points >= 8000) {
    const pct = Math.min(100, Math.max(0, ((points - 8000) / 12000) * 100));
    return { pct, text: `+${(20000 - points).toLocaleString("pt-BR")} pts para Ouro`, next: "Ouro" };
  }
  const pct = Math.min(100, Math.max(0, (points / 8000) * 100));
  return { pct, text: `+${(8000 - points).toLocaleString("pt-BR")} pts para Prata`, next: "Prata" };
}

function getFirstName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Aluno";
  return trimmed.split(/\s+/)[0] ?? "Aluno";
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<number>(0);
  const [cls, setCls] = useState<LoboClass>("bronze");
  const [rankInfo, setRankInfo] = useState<MyRankGeralMedia | null>(null);
  const [name, setName] = useState("Aluno");
  const [studentsByGrade, setStudentsByGrade] = useState<Record<string, RegisteredStudentRow[]>>({});
  const [rankingRows, setRankingRows] = useState<RankingStudentRow[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestMessageTitle, setLatestMessageTitle] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<MyPlanProStatus>({
    isPlanPro: false,
    planTier: "free",
    source: "fallback",
  });
  const [seriesFilter, setSeriesFilter] = useState<SeriesFilter>("Todos");
  const [showTeacherPendingBanner, setShowTeacherPendingBanner] = useState(false);
  const mailPulseAnim = useRef(new Animated.Value(0)).current;
  const gradesOrder = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;

  useEffect(() => {
    if (unreadMessages <= 0) {
      mailPulseAnim.stopAnimation();
      mailPulseAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mailPulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(mailPulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [mailPulseAnim, unreadMessages]);

  async function load() {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData.user ?? null;

      let profileName = "";
      try {
        const profile = await fetchMyProfile(user?.id);
        profileName = profile?.full_name?.trim() ?? "";
      } catch {
        // Se o Data API falhar temporariamente, ainda mostramos o nome pelo metadata do Auth.
      }

      const fullName =
        profileName ||
        String(user?.user_metadata?.full_name ?? "").trim() ||
        user?.email?.split("@")[0] ||
        "Aluno";

      setName(getFirstName(fullName));

      try {
        const role = await fetchMyAccessRole();
        if (role !== "teacher") {
          const metadataPending = Boolean(user?.user_metadata?.teacher_pending);
          if (metadataPending) {
            await ensureTeacherAccessRequestFromCurrentUser();
          }
          const latestRequest = await fetchMyLatestAccessRequest();
          setShowTeacherPendingBanner(latestRequest?.status === "pending");
        } else {
          setShowTeacherPendingBanner(false);
        }
      } catch {
        setShowTeacherPendingBanner(false);
      }

      const [mediaRankRes, pointsRes, studentsRes, rankingRes, messagesRes, planStatusRes] = await Promise.allSettled([
        fetchMyRankGeralMedia(),
        fetchMyPoints(),
        fetchRegisteredStudents(),
        fetchRankingAllRegisteredStudents(500),
        fetchMyStudentMessages(20),
        fetchMyPlanProStatus(),
      ]);

      const mediaRank = mediaRankRes.status === "fulfilled" ? mediaRankRes.value : null;
      const p = pointsRes.status === "fulfilled" ? pointsRes.value : null;
      const students = studentsRes.status === "fulfilled" ? studentsRes.value : [];
      const rankingData = rankingRes.status === "fulfilled" ? rankingRes.value : [];
      const messagesData = messagesRes.status === "fulfilled" ? messagesRes.value : [];
      const currentPlanStatus =
        planStatusRes.status === "fulfilled"
          ? planStatusRes.value
          : ({ isPlanPro: false, planTier: "free", source: "fallback" } as MyPlanProStatus);
      const unread = messagesData.filter((msg) => !msg.read_at).length;
      const latestMessage = messagesData[0] ?? null;

      setRankInfo(mediaRank);
      setPoints(p?.total_points ?? mediaRank?.total_points_sum ?? 0);
      setCls((p?.lobo_class ?? "bronze") as LoboClass);
      const grouped = gradesOrder.reduce<Record<string, RegisteredStudentRow[]>>((acc, grade) => {
        acc[grade] = students.filter((s) => (s.grade ?? "").trim() === grade);
        return acc;
      }, {});
      setStudentsByGrade(grouped);
      setRankingRows(rankingData);
      setPlanStatus(currentPlanStatus);
      setUnreadMessages(unread);
      setLatestMessageTitle(latestMessage?.title ?? null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar seu desempenho";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const label = getClassLabel(cls);
  const accent = getHeroAccent(cls);
  const progress = getProgressToNext(points);
  const rankText = rankInfo?.is_eligible ? `#${rankInfo.position ?? "-"}` : "-";
  const eligibilityText =
    rankInfo === null
      ? "Ainda sem pontuação registrada. Participe de uma olimpíada para entrar no ranking."
      : rankInfo.is_eligible
        ? `Elegível: Sim • Média ${rankInfo.avg_points?.toFixed(2) ?? "-"} • Olimpíadas ${rankInfo.olympiads_count}`
        : `Elegível: Não • Faltam ${rankInfo.missing_olympiads} olimpíada(s) para entrar no ranking geral.`;
  const rankingRowsForPanel = useMemo(() => {
    if (seriesFilter === "Todos") return rankingRows;
    const filtered = rankingRows.filter((row) => (row.grade ?? "").trim() === seriesFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR");
    });
    return sorted.map((row, idx) => ({ ...row, position: idx + 1 }));
  }, [rankingRows, seriesFilter]);
  const rankingRowsByClass = useMemo(() => {
    return {
      gold: rankingRowsForPanel.filter((row) => row.lobo_class === "gold"),
      silver: rankingRowsForPanel.filter((row) => row.lobo_class === "silver"),
      bronze: rankingRowsForPanel.filter((row) => row.lobo_class === "bronze"),
    };
  }, [rankingRowsForPanel]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text tone="muted" style={{ marginTop: 8 }}>
          Carregando seu desempenho...
        </Text>
      </View>
    );
  }

  return (
    <StitchScreenFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <StitchHeader
          title="Painel"
          rightSlot={
            <Pressable
              onPress={() => {
                void load();
              }}
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radii.pill,
              }}
            >
              <Text style={{ color: "white", fontSize: typography.small.fontSize }} weight="semibold">
                Atualizar
              </Text>
            </Pressable>
          }
        />

        <View style={{ paddingHorizontal: spacing.md }}>
          <Text style={{ color: "white", fontSize: typography.titleLg.fontSize }} weight="bold">
            Bem-vindo, {name}
          </Text>
        </View>

        {planStatus.isPlanPro ? (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
            <View
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.55)",
                backgroundColor: "rgba(255,199,0,0.12)",
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ color: colors.einsteinYellow }} weight="bold">
                Plano Pro Ativo
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.88)", marginTop: 2 }}>
                Você já tem todas as vantagens do Plano Pro, incluindo 8 rodadas diárias no Teste dos Lobos.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          <Pressable
            onPress={() => router.push("/(tabs)/mensagens")}
            style={{
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: unreadMessages > 0 ? "rgba(255,199,0,0.85)" : colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
              overflow: "hidden",
            }}
          >
            {unreadMessages > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: colors.einsteinYellow,
                  opacity: mailPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.08, 0.22],
                  }),
                }}
              />
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1 }}>
                <Text style={{ color: unreadMessages > 0 ? colors.einsteinYellow : colors.white, fontSize: 20 }} weight="bold">
                  ✉
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.white }} weight="bold">
                    Caixa de Mensagens
                  </Text>
                  <Text
                    style={{ color: "rgba(255,255,255,0.75)", fontSize: typography.small.fontSize, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {latestMessageTitle ? latestMessageTitle : "Sem mensagens no momento"}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: unreadMessages > 0 ? colors.einsteinYellow : "rgba(255,255,255,0.72)",
                  fontSize: typography.small.fontSize,
                }}
                weight="semibold"
              >
                {unreadMessages > 0 ? `${unreadMessages} nova(s)` : "Sem novas"}
              </Text>
            </View>
          </Pressable>
        </View>

      {showTeacherPendingBanner ? (
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          <View
            style={{
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: "rgba(255,199,0,0.45)",
              backgroundColor: "rgba(255,199,0,0.10)",
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            <Text style={{ color: colors.einsteinYellow }} weight="bold">
              Cadastro pendente de confirmação do administrador.
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.86)", marginTop: 2 }}>
              Você já pode atualizar seus dados e foto. Seu perfil será publicado após aprovação do admin.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <DashboardHero
          loboClass={cls}
          label={label}
          accent={accent}
          points={points}
          rankText={rankText}
          progressPct={progress.pct}
          progressNext={progress.next}
          progressText={progress.text}
          eligibilityText={eligibilityText}
        />

        <View
          style={{
            marginTop: spacing.xl,
            borderRadius: radii.md,
            padding: sizes.compactCardPadding,
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: colors.borderSoft,
          }}
        >
          <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
            Ranking Geral
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            Principal foco do InGenium. Geral por padrão, com filtro por série.
          </Text>

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

          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {rankingRowsForPanel.length === 0 ? (
              <Text style={{ color: "rgba(255,255,255,0.62)" }}>Sem dados de ranking no momento.</Text>
            ) : (
              <>
                {[
                  { key: "gold", label: "Lobo de Ouro", rows: rankingRowsByClass.gold },
                  { key: "silver", label: "Lobo de Prata", rows: rankingRowsByClass.silver },
                  { key: "bronze", label: "Lobo de Bronze", rows: rankingRowsByClass.bronze },
                ].map((section) => (
                  <View key={section.key} style={{ marginTop: spacing.xs }}>
                    <Text style={{ color: colors.einsteinYellow }} weight="semibold">
                      {section.label}
                    </Text>
                    {section.rows.length === 0 ? (
                      <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 4 }}>
                        Nenhum aluno nesta classe.
                      </Text>
                    ) : (
                      <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                        {section.rows.slice(0, 10).map((row) => (
                          <View
                            key={`${section.key}-${row.user_id}-${row.position}`}
                            style={{
                              borderRadius: radii.md,
                              borderWidth: 1,
                              borderColor: colors.borderSoft,
                              backgroundColor: colors.surfacePanel,
                              padding: spacing.sm,
                            }}
                          >
                            <RankingItem
                              position={row.position}
                              fullName={row.full_name}
                              avatarUrl={row.avatar_url}
                              loboClass={row.lobo_class}
                              points={row.total_points}
                              rightLabel={row.total_points.toLocaleString("pt-BR")}
                            />
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <DashboardActions />
        </View>

        <View
          style={{
            marginTop: spacing.xl,
            borderRadius: radii.md,
            padding: sizes.compactCardPadding,
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: colors.borderSoft,
          }}
        >
          <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
            Alunos cadastrados
          </Text>
          {gradesOrder.map((grade) => {
            const students = studentsByGrade[grade] ?? [];
            return (
              <View key={grade} style={{ marginTop: spacing.sm }}>
                <Text style={{ color: colors.einsteinYellow }} weight="semibold">
                  {grade}
                </Text>
                {students.length === 0 ? (
                  <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 4, fontSize: typography.small.fontSize }}>
                    Nenhum aluno cadastrado.
                  </Text>
                ) : (
                  <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                    {students.map((student) => (
                      <View
                        key={student.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: spacing.xs,
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.borderSoft,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                        }}
                      >
                        <AvatarWithFallback
                          fullName={student.full_name ?? "Aluno"}
                          avatarUrl={student.avatar_url}
                          size={32}
                        />
                        <Text style={{ color: "white", flex: 1 }} weight="semibold">
                          {student.full_name?.trim() || "Aluno sem nome"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
