import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
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
  fetchRankingAllRegisteredStudents,
  fetchRegisteredStudents,
  fetchMyProfile,
  fetchMyPoints,
  fetchMyXpHistory,
  fetchMyRankGeralMedia,
  fetchOlympiads,
  MyXpHistoryRow,
  RegisteredStudentRow,
  RankingStudentRow,
  MyRankGeralMedia,
} from "../../lib/supabase/queries";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";
import { copy } from "../../content/copy";

type LoboClass = "bronze" | "silver" | "gold";
type OlympiadRow = {
  id: string;
  title: string;
  category: string | null;
  start_date: string | null;
  status: string | null;
};
const SERIES_FILTERS = ["Todos", "6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;
type SeriesFilter = (typeof SERIES_FILTERS)[number];
type XpTab = "howWorks" | "howToEarn" | "history";

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

function getXpEventLabel(eventType: string) {
  const normalized = eventType.trim().toLowerCase();
  if (normalized === "complete_profile_data") return "Perfil completo";
  if (normalized === "profile_photo_upload") return "Inserir foto de perfil";
  if (normalized === "top10_school_simulado") return "Top 10 no Simulado da Escola";
  if (normalized === "weekly_study_group_75_presence") return "Grupo de estudo semanal";
  if (normalized === "volunteer_mentorship_bronze") return "Monitoria voluntária (Lobo de Bronze)";
  if (normalized === "perfect_quarter_attendance") return "Frequência perfeita trimestral";
  return normalized.replaceAll("_", " ");
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<number>(0);
  const [cls, setCls] = useState<LoboClass>("bronze");
  const [rankInfo, setRankInfo] = useState<MyRankGeralMedia | null>(null);
  const [name, setName] = useState("Aluno");
  const [olympiads, setOlympiads] = useState<OlympiadRow[]>([]);
  const [studentsByGrade, setStudentsByGrade] = useState<Record<string, RegisteredStudentRow[]>>({});
  const [rankingRows, setRankingRows] = useState<RankingStudentRow[]>([]);
  const [xpHistoryRows, setXpHistoryRows] = useState<MyXpHistoryRow[]>([]);
  const [seriesFilter, setSeriesFilter] = useState<SeriesFilter>("Todos");
  const [showTeacherPendingBanner, setShowTeacherPendingBanner] = useState(false);
  const [xpTab, setXpTab] = useState<XpTab>("howWorks");
  const gradesOrder = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;

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

      const [mediaRankRes, pointsRes, olympiadsRes, studentsRes, rankingRes, xpHistoryRes] = await Promise.allSettled([
        fetchMyRankGeralMedia(),
        fetchMyPoints(),
        fetchOlympiads(),
        fetchRegisteredStudents(),
        fetchRankingAllRegisteredStudents(500),
        fetchMyXpHistory(200),
      ]);

      const mediaRank = mediaRankRes.status === "fulfilled" ? mediaRankRes.value : null;
      const p = pointsRes.status === "fulfilled" ? pointsRes.value : null;
      const upcoming = olympiadsRes.status === "fulfilled" ? olympiadsRes.value : [];
      const students = studentsRes.status === "fulfilled" ? studentsRes.value : [];
      const rankingData = rankingRes.status === "fulfilled" ? rankingRes.value : [];
      const xpHistoryData = xpHistoryRes.status === "fulfilled" ? xpHistoryRes.value : [];

      setRankInfo(mediaRank);
      setPoints(p?.total_points ?? mediaRank?.total_points_sum ?? 0);
      setCls((p?.lobo_class ?? "bronze") as LoboClass);
      setOlympiads(
        upcoming.filter((o) => o.status === "open" || o.status === "upcoming" || o.status === "published").slice(0, 5),
      );
      const grouped = gradesOrder.reduce<Record<string, RegisteredStudentRow[]>>((acc, grade) => {
        acc[grade] = students.filter((s) => (s.grade ?? "").trim() === grade);
        return acc;
      }, {});
      setStudentsByGrade(grouped);
      setRankingRows(rankingData);
      setXpHistoryRows(xpHistoryData);
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
  const xpRulesSortedDesc = useMemo(() => {
    return [...copy.program.xpRules].sort((a, b) => b.xp - a.xp);
  }, []);

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

        <View style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
              Próximas Olimpíadas
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/olimpiadas")}>
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="semibold">
                Ver todas
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.sm }}
          >
            {olympiads.length === 0 ? (
              <View
                style={{
                  width: 250,
                  backgroundColor: colors.surfacePanel,
                  borderRadius: radii.lg,
                  padding: sizes.compactCardPadding,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                }}
              >
                <Text style={{ color: "white" }} weight="semibold">
                  Sem olimpíadas abertas no momento
                </Text>
              </View>
            ) : (
              olympiads.map((o) => (
                <View
                  key={o.id}
                  style={{
                    width: 250,
                    backgroundColor: colors.surfacePanel,
                    borderRadius: radii.lg,
                    padding: sizes.compactCardPadding,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: typography.small.fontSize }}>
                      {o.category ?? "Categoria geral"}
                    </Text>
                    <Text style={{ color: "white", marginTop: spacing.xs, fontSize: typography.titleMd.fontSize }} weight="bold">
                      {o.title}
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.72)",
                        marginTop: spacing.xs,
                        fontSize: typography.small.fontSize,
                      }}
                    >
                      {o.start_date
                        ? new Date(o.start_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "Data a definir"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push("/(tabs)/olimpiadas")}
                    style={{
                      marginTop: spacing.sm,
                      backgroundColor: colors.einsteinBlue,
                      borderRadius: radii.md,
                      height: sizes.buttonHeight,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontSize: typography.small.fontSize }} weight="bold">
                      Abrir
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
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
          <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => setXpTab("howWorks")}
              style={{
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                backgroundColor: xpTab === "howWorks" ? colors.einsteinBlue : colors.surfacePanel,
                borderWidth: 1,
                borderColor: xpTab === "howWorks" ? "rgba(255,255,255,0.22)" : colors.borderSoft,
              }}
            >
              <Text
                style={{
                  color: xpTab === "howWorks" ? colors.white : "rgba(255,255,255,0.78)",
                  fontSize: typography.small.fontSize,
                }}
                weight="semibold"
              >
                Como funciona o XP oficial
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setXpTab("howToEarn")}
              style={{
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                backgroundColor: xpTab === "howToEarn" ? colors.einsteinBlue : colors.surfacePanel,
                borderWidth: 1,
                borderColor: xpTab === "howToEarn" ? "rgba(255,255,255,0.22)" : colors.borderSoft,
              }}
            >
              <Text
                style={{
                  color: xpTab === "howToEarn" ? colors.white : "rgba(255,255,255,0.78)",
                  fontSize: typography.small.fontSize,
                }}
                weight="semibold"
              >
                Como conseguir XP
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setXpTab("history")}
              style={{
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                backgroundColor: xpTab === "history" ? colors.einsteinBlue : colors.surfacePanel,
                borderWidth: 1,
                borderColor: xpTab === "history" ? "rgba(255,255,255,0.22)" : colors.borderSoft,
              }}
            >
              <Text
                style={{
                  color: xpTab === "history" ? colors.white : "rgba(255,255,255,0.78)",
                  fontSize: typography.small.fontSize,
                }}
                weight="semibold"
              >
                Histórico de XP
              </Text>
            </Pressable>
          </View>

          <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
            {xpTab === "howWorks"
              ? "Como funciona o XP oficial"
              : xpTab === "howToEarn"
                ? "Como conseguir XP"
                : "Histórico de XP"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: spacing.xs }}>
            {xpTab === "howWorks"
              ? "Pontuação baseada em participação, resultado e constância. Perfil completo (com data de nascimento e matrícula) também concede +100 XP."
              : xpTab === "howToEarn"
                ? "Veja as ações de ganho de XP em ordem decrescente de pontuação."
                : "Acompanhe cada conquista: ação, XP, data e informações importantes."}
          </Text>

          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {xpTab === "history" ? (
              xpHistoryRows.length === 0 ? (
                <Text style={{ color: "rgba(255,255,255,0.62)" }}>Você ainda não possui eventos no histórico de XP.</Text>
              ) : (
                xpHistoryRows.map((row) => (
                  <View key={row.id} style={{ borderRadius: radii.md, padding: spacing.sm, backgroundColor: "rgba(0,0,0,0.2)" }}>
                    <Text style={{ color: "white" }} weight="semibold">
                      {getXpEventLabel(row.event_type)} • +{row.xp_amount.toLocaleString("pt-BR")} XP
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2, fontSize: typography.small.fontSize }}>
                      Data: {new Date(row.occurred_on).toLocaleDateString("pt-BR")}
                    </Text>
                    {row.note ? (
                      <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2, fontSize: typography.small.fontSize }}>
                        Detalhe: {row.note}
                      </Text>
                    ) : null}
                    {row.source_ref ? (
                      <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 2, fontSize: typography.small.fontSize }}>
                        Referência: {row.source_ref}
                      </Text>
                    ) : null}
                  </View>
                ))
              )
            ) : (
              (xpTab === "howWorks" ? copy.program.xpRules : xpRulesSortedDesc).map((rule) => (
                <View key={rule.key} style={{ borderRadius: radii.md, padding: spacing.sm, backgroundColor: "rgba(0,0,0,0.2)" }}>
                  <Text style={{ color: "white" }}>
                    {rule.label} • +{rule.xp.toLocaleString("pt-BR")} XP
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2, fontSize: typography.small.fontSize }}>
                    {rule.criteria}
                  </Text>
                </View>
              ))
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
            Ranking Geral
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            Geral por padrão. Use os botões para ranking por série.
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
