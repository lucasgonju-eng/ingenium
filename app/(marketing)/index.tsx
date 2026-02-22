import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import { fetchPublicRankingTeaser } from "../../lib/supabase/queries";
import { colors, radii, shadows, spacing, typography } from "../../lib/theme/tokens";

type TeaserRow = {
  rank: number;
  full_name: string | null;
  total_points: number;
  lobo_class: "bronze" | "silver" | "gold";
};

export default function MarketingLandingScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TeaserRow[]>([]);
  const [hasSession, setHasSession] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const ok = Boolean(data.session);
      setHasSession(ok);

      const teaser = await fetchPublicRankingTeaser(10);
      setRows(teaser as TeaserRow[]);
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

  const rankingRows = rows.length > 0
    ? rows
    : [
        { rank: 1, full_name: "Ana S.", total_points: 9800, lobo_class: "gold" as const },
        { rank: 2, full_name: "João M.", total_points: 9750, lobo_class: "gold" as const },
        { rank: 3, full_name: "Beatriz L.", total_points: 9600, lobo_class: "silver" as const },
        { rank: 4, full_name: "Pedro H.", total_points: 9450, lobo_class: "silver" as const },
        { rank: 5, full_name: "Luiza M.", total_points: 9320, lobo_class: "silver" as const },
        { rank: 6, full_name: "Carlos E.", total_points: 9100, lobo_class: "bronze" as const },
      ];
  const podium = rankingRows.slice(0, 3);
  const teaserList = rankingRows.slice(3, 6);

  return (
    <StitchScreenFrame>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
      >
        <View style={{ paddingTop: spacing.xs }}>
          <Text style={{ color: colors.white, fontSize: 28 }} weight="bold">
            InGenium Einstein
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 6, lineHeight: 21 }}>
            Plataforma de olimpíadas com ranking ao vivo, ligas e recompensas para alunos de alta performance.
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
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                {podium.map((r) => {
                  const scale = r.rank === 1 ? 1 : 0.88;
                  return (
                    <View key={`${r.rank}-${r.full_name ?? "sem-nome"}`} style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }} weight="semibold">
                        {r.rank}º
                      </Text>
                      <View
                        style={{
                          marginTop: 6,
                          width: 74 * scale,
                          borderRadius: radii.md,
                          paddingVertical: 10,
                          backgroundColor: r.rank === 1 ? "rgba(255,199,0,0.18)" : "rgba(255,255,255,0.08)",
                          borderWidth: 1,
                          borderColor: r.rank === 1 ? "rgba(255,199,0,0.35)" : colors.borderSoft,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: colors.white, fontSize: 12 }} weight="bold">
                          {r.full_name ?? "Sem nome"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 10, marginTop: 2 }} weight="semibold">
                          {r.total_points.toLocaleString("pt-BR")}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={{ marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: spacing.sm }}>
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
                    <Text style={{ color: "rgba(255,255,255,0.76)", width: 24 }} weight="bold">
                      {r.rank}
                    </Text>
                    <Text style={{ color: colors.white, flex: 1 }} weight="semibold">
                      {r.full_name ?? "Sem nome"}
                    </Text>
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
            Evolua seu status e desbloqueie recompensas exclusivas.
          </Text>
          {[
            { icon: "🥇", title: "Lobo Ouro", desc: "A elite nacional. Bolsas de estudo, prêmios físicos e eventos exclusivos.", range: "15.001+ pts" },
            { icon: "🥈", title: "Lobo Prata", desc: "Competidores sérios. Acesso a mentorias e desafios semanais.", range: "5.001 - 15.000 pts" },
            { icon: "🥉", title: "Lobo Bronze", desc: "Início da jornada. Acesso a simulados básicos e ranking estadual.", range: "0 - 5.000 pts" },
          ].map((item) => (
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
            Próximas Olimpíadas
          </Text>
          {[
            { date: "Nov 12", name: "OBM - 2ª Fase", meta: "Matemática • Nacional" },
            { date: "Nov 18", name: "Olimpíada de Física", meta: "Física • Seletiva" },
            { date: "Dez 05", name: "Desafio InGenium", meta: "Geral • Online" },
          ].map((item) => (
            <View
              key={item.name}
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
                  {item.date}
                </Text>
                <Text style={{ color: colors.white, marginTop: 2 }} weight="bold">
                  {item.name}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 2, fontSize: 12 }}>{item.meta}</Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.78)" }}>🔔</Text>
            </View>
          ))}
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
