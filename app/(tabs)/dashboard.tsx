import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import DashboardActions from "../../components/sections/DashboardActions";
import DashboardHero from "../../components/sections/DashboardHero";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import {
  fetchMyProfile,
  fetchMyPoints,
  fetchMyRankGeralMedia,
  fetchOlympiads,
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
  const [name, setName] = useState("Estudante");
  const [olympiads, setOlympiads] = useState<OlympiadRow[]>([]);

  async function load() {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      let profileName = "";
      try {
        const profile = await fetchMyProfile();
        profileName = profile?.full_name?.trim() ?? "";
      } catch {
        // Se o Data API falhar temporariamente, ainda mostramos o nome pelo metadata do Auth.
      }

      const fullName =
        profileName ||
        String(userData.user?.user_metadata?.full_name ?? "").trim() ||
        userData.user?.email?.split("@")[0] ||
        "Estudante";

      setName(getFirstName(fullName));

      const [mediaRankRes, pointsRes, olympiadsRes] = await Promise.allSettled([
        fetchMyRankGeralMedia(),
        fetchMyPoints(),
        fetchOlympiads(),
      ]);

      const mediaRank = mediaRankRes.status === "fulfilled" ? mediaRankRes.value : null;
      const p = pointsRes.status === "fulfilled" ? pointsRes.value : null;
      const upcoming = olympiadsRes.status === "fulfilled" ? olympiadsRes.value : [];

      setRankInfo(mediaRank);
      setPoints(p?.total_points ?? mediaRank?.total_points_sum ?? 0);
      setCls((p?.lobo_class ?? "bronze") as LoboClass);
      setOlympiads(
        upcoming.filter((o) => o.status === "open" || o.status === "upcoming" || o.status === "published").slice(0, 5),
      );
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
          <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
            Como funciona o XP oficial
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: spacing.xs }}>
            Pontuação baseada em participação, resultado e constância.
          </Text>

          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {copy.program.xpRules.map((rule) => (
              <View key={rule.key} style={{ borderRadius: radii.md, padding: spacing.sm, backgroundColor: "rgba(0,0,0,0.2)" }}>
                <Text style={{ color: "white" }}>
                  {rule.label} • +{rule.xp.toLocaleString("pt-BR")} XP
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2, fontSize: typography.small.fontSize }}>
                  {rule.criteria}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <DashboardActions />
        </View>
      </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
