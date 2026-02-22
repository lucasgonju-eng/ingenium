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
  fetchMyPoints,
  fetchMyRankGeralMedia,
  fetchOlympiads,
  MyRankGeralMedia,
} from "../../lib/supabase/queries";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";

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
  if (points >= 500) return { pct: 100, text: "Classe máxima atingida", next: "Ouro" };
  if (points >= 200) {
    const pct = Math.min(100, Math.max(0, ((points - 200) / 300) * 100));
    return { pct, text: `+${500 - points} pts para Ouro`, next: "Ouro" };
  }
  const pct = Math.min(100, Math.max(0, (points / 200) * 100));
  return { pct, text: `+${200 - points} pts para Prata`, next: "Prata" };
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
      const [{ data: sessionData }, mediaRank, p, upcoming] = await Promise.all([
        supabase.auth.getSession(),
        fetchMyRankGeralMedia(),
        fetchMyPoints(),
        fetchOlympiads(),
      ]);

      const fullName =
        sessionData.session?.user?.user_metadata?.full_name ??
        sessionData.session?.user?.email?.split("@")[0] ??
        "Estudante";

      setName(fullName);
      setRankInfo(mediaRank);
      setPoints(p?.total_points ?? mediaRank?.total_points_sum ?? 0);
      setCls((p?.lobo_class ?? "bronze") as LoboClass);
      setOlympiads(
        upcoming
          .filter((o) => o.status === "open" || o.status === "upcoming" || o.status === "published")
          .slice(0, 5),
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
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: typography.subtitle.fontSize }}>
            Bem-vindo de volta,
          </Text>
          <Text style={{ color: "white", fontSize: typography.titleLg.fontSize }} weight="bold">
            {name}
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
            Missões da semana
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: spacing.xs }}>
            Complete ações para acelerar sua evolução na liga.
          </Text>

          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            <View style={{ borderRadius: radii.md, padding: spacing.sm, backgroundColor: "rgba(0,0,0,0.2)" }}>
              <Text style={{ color: "white" }}>Atualizar perfil • +100 XP</Text>
            </View>
            <View style={{ borderRadius: radii.md, padding: spacing.sm, backgroundColor: "rgba(0,0,0,0.2)" }}>
              <Text style={{ color: "white" }}>Inscrever-se em 1 olimpíada • +500 XP</Text>
            </View>
            <View style={{ borderRadius: radii.md, padding: spacing.sm, backgroundColor: "rgba(0,0,0,0.2)" }}>
              <Text style={{ color: "white" }}>Concluir quiz diário • +50 XP</Text>
            </View>
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
