import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import AvatarWithFallback from "../../components/ui/AvatarWithFallback";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import { fetchPublicRankingTeaser } from "../../lib/supabase/queries";
import { colors, radii, shadows, spacing, typography } from "../../lib/theme/tokens";
import { copy } from "../../content/copy";

type TeaserRow = {
  rank: number;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  lobo_class: "bronze" | "silver" | "gold";
};

type LandingOlympiadRow = {
  id: string;
  title: string;
  category: string | null;
  status: string | null;
  registration_deadline: string | null;
};

function formatShortDate(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export default function MarketingLandingScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TeaserRow[]>([]);
  const [olympiads, setOlympiads] = useState<LandingOlympiadRow[]>([]);
  const [hasSession, setHasSession] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const ok = Boolean(data.session);
      setHasSession(ok);

      const today = new Date().toISOString().slice(0, 10);
      const [teaser, olympiadsResult] = await Promise.all([
        fetchPublicRankingTeaser(10),
        supabase
          .from("olympiads")
          .select("id,title,category,status,registration_deadline")
          .gte("registration_deadline", today)
          .order("registration_deadline", { ascending: true })
          .limit(6),
      ]);

      if (olympiadsResult.error) throw olympiadsResult.error;
      setRows(teaser as TeaserRow[]);
      setOlympiads((olympiadsResult.data ?? []) as LandingOlympiadRow[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar dados da página";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const rankingRows = rows;
  const teaserList = rankingRows.slice(0, 6);

  return (
    <StitchScreenFrame>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
      >
        <View style={{ paddingTop: spacing.xs }}>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6, lineHeight: 21 }}>
            {copy.program.headline}
          </Text>
        </View>

        <View
          style={{
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            padding: spacing.md,
            ...shadows.soft,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="bold">
                🏆 RANKING AO VIVO
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 2, fontSize: 11 }}>Atualizado</Text>
            </View>
            <Pressable
              onPress={() => {
                void load();
              }}
              style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <Text style={{ color: colors.white, fontSize: 11 }} weight="semibold">
                Atualizar
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ marginTop: spacing.md, alignItems: "center" }}>
              <ActivityIndicator color={colors.einsteinYellow} />
            </View>
          ) : rankingRows.length === 0 ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                Sem dados de ranking ao vivo no momento.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              <View style={{ marginTop: spacing.xs }}>
                {teaserList.map((r) => (
                  <View
                    key={`${r.rank}-${r.full_name ?? "sem-nome"}-list`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.xs }}>
                      <Text style={{ color: "rgba(255,255,255,0.76)", width: 24 }} weight="bold">
                        {r.rank}
                      </Text>
                      <AvatarWithFallback fullName={r.full_name} avatarUrl={r.avatar_url} size={34} />
                      <Text
                        style={{ color: colors.white, flex: 1 }}
                        weight="semibold"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {r.full_name ?? "Sem nome"}
                      </Text>
                    </View>
                    <Text style={{ color: "rgba(255,255,255,0.8)" }} weight="bold">
                      {r.total_points.toLocaleString("pt-BR")} pts
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  if (hasSession) {
                    router.push("/(tabs)/ranking");
                    return;
                  }
                  router.push("/(auth)/login");
                }}
                style={{
                  marginTop: spacing.sm,
                  height: 42,
                  borderRadius: radii.md,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.white }} weight="semibold">
                  Ver Top 100 →
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            Ligas de Elite
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", lineHeight: 20 }}>
            {copy.program.xpSummary}
          </Text>
          {copy.program.tiers.map((item) => (
            <View
              key={item.title}
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
                  {item.icon} {item.title}
                </Text>
                <Text style={{ color: colors.einsteinYellow, fontSize: 11 }} weight="semibold">
                  {item.range}
                </Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6, lineHeight: 20 }}>{item.desc}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            Como funciona o XP oficial
          </Text>
          {copy.program.xpRules.map((rule) => (
            <View
              key={rule.key}
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                <Text style={{ color: colors.white, flex: 1 }} weight="bold">
                  {rule.label}
                </Text>
                <Text style={{ color: colors.einsteinYellow }} weight="bold">
                  +{rule.xp.toLocaleString("pt-BR")} XP
                </Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, lineHeight: 20 }}>{rule.criteria}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            Premiação - Lobo de Ouro
          </Text>
          {copy.program.goldAwards.map((award) => (
            <View
              key={award}
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.84)" }}>{award}</Text>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            Ranking final - Top 3 Lobo Ouro
          </Text>
          {copy.program.goldTop3Awards.map((row) => (
            <View
              key={row.place}
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
                gap: 4,
              }}
            >
              <Text style={{ color: colors.einsteinYellow }} weight="bold">
                {row.place}
              </Text>
              {row.items.map((item) => (
                <Text key={`${row.place}-${item}`} style={{ color: "rgba(255,255,255,0.84)" }}>
                  - {item}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            Próximas Olimpíadas
          </Text>
          {loading ? (
            <View style={{ marginTop: spacing.xs, alignItems: "center" }}>
              <ActivityIndicator color={colors.einsteinYellow} />
            </View>
          ) : olympiads.length === 0 ? (
            <View
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: "rgba(255,255,255,0.03)",
                padding: spacing.md,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                Sem olimpíadas cadastradas com inscrição aberta no momento.
              </Text>
            </View>
          ) : (
            olympiads.map((item) => (
              <View
                key={item.id}
                style={{
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  padding: spacing.md,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text style={{ color: colors.einsteinYellow, fontSize: 11 }} weight="semibold">
                    {formatShortDate(item.registration_deadline)}
                  </Text>
                  <Text style={{ color: colors.white, marginTop: 2 }} weight="bold">
                    {item.title}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 2, fontSize: 12 }}>
                    {item.category ?? "Olimpíada"} {item.status ? `• ${item.status}` : ""}
                  </Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.78)" }}>🔔</Text>
              </View>
            ))
          )}
        </View>

        <View
          style={{
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: "rgba(255,199,0,0.3)",
            backgroundColor: "rgba(255,199,0,0.08)",
            padding: spacing.md,
          }}
        >
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            Não fique de fora
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: 6 }}>Junte-se à liga hoje mesmo.</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm }}>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={{
                flex: 1,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: colors.einsteinYellow,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.einsteinBlue }} weight="bold">
                Entrar na Liga
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(auth)/cadastro")}
              style={{
                flex: 1,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: "rgba(255,255,255,0.09)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.white }} weight="bold">
                Criar conta
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
