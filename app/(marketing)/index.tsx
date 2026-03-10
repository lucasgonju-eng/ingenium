import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import AvatarWithFallback from "../../components/ui/AvatarWithFallback";
import { Text } from "../../components/ui/Text";
import { supabase } from "../../lib/supabase/client";
import { trackEvent } from "../../lib/analytics/gtm";
import { fetchOlympiads, fetchPublicRankingTeaser } from "../../lib/supabase/queries";
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

const WOLF_BY_CLASS = {
  gold: require("../../assets/wolf-gold.png"),
  silver: require("../../assets/wolf-silver.png"),
  bronze: require("../../assets/wolf-bronze.png"),
} as const;
const GOLD_LUX_TINT = "#C8A45D";

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
  const [showPrizePopup, setShowPrizePopup] = useState(false);

  function dismissPrizePopup() {
    setShowPrizePopup(false);
  }

  async function load() {
    try {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const ok = Boolean(data.session);
      setHasSession(ok);
      // Exibe sempre ao entrar na LP, independente de sessão/plano.
      setShowPrizePopup(true);

      const today = new Date().toISOString().slice(0, 10);
      const [teaser, olympiadsResult] = await Promise.all([
        fetchPublicRankingTeaser(10),
        fetchOlympiads(),
      ]);

      setRows(teaser as TeaserRow[]);
      const upcomingOlympiads = (olympiadsResult as LandingOlympiadRow[])
        .filter((item) => {
          if (!item.registration_deadline) return false;
          return item.registration_deadline >= today;
        })
        .sort((a, b) => {
          const da = a.registration_deadline ?? "9999-12-31";
          const db = b.registration_deadline ?? "9999-12-31";
          return da.localeCompare(db);
        })
        .slice(0, 4);
      setOlympiads(upcomingOlympiads);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar dados da página";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    trackEvent("lp_view", { page_type: "marketing_lp", platform: "web" });
    void load();
  }, []);

  const rankingRows = rows;
  const teaserList = rankingRows.slice(0, 6);

  return (
    <StitchScreenFrame>
      <>
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
                trackEvent("ranking_refresh_click", { source: "marketing_lp" });
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
              <View style={{ marginTop: spacing.xs, gap: spacing.sm }}>
                {[
                  { key: "gold", label: "Lobo de Ouro", accent: "#FFD700" },
                  { key: "silver", label: "Lobo de Prata", accent: "#D9E2EC" },
                  { key: "bronze", label: "Lobo de Bronze", accent: "#CD7F32" },
                ].map((group) => {
                  const classRows = teaserList.filter((row) => row.lobo_class === group.key);
                  return (
                    <View
                      key={`lp-ranking-${group.key}`}
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor:
                          group.key === "gold"
                            ? "rgba(255,215,0,0.45)"
                            : group.key === "silver"
                              ? "rgba(217,226,236,0.45)"
                              : "rgba(205,127,50,0.45)",
                        backgroundColor:
                          group.key === "gold"
                            ? "rgba(255,215,0,0.08)"
                            : group.key === "silver"
                              ? "rgba(217,226,236,0.08)"
                              : "rgba(205,127,50,0.08)",
                        padding: spacing.sm,
                        gap: spacing.xs,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: "#FFFFFF",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          <Image
                            source={WOLF_BY_CLASS[group.key as "gold" | "silver" | "bronze"]}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              tintColor: group.key === "gold" ? GOLD_LUX_TINT : undefined,
                            }}
                          />
                        </View>
                        <Text style={{ color: group.accent, fontSize: typography.small.fontSize }} weight="bold">
                          {group.label}
                        </Text>
                      </View>

                      {classRows.length === 0 ? (
                        <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 2 }}>Nenhum aluno nesta classe.</Text>
                      ) : (
                        classRows.map((r) => (
                          <View
                            key={`${group.key}-${r.rank}-${r.full_name ?? "sem-nome"}-list`}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingVertical: 6,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.xs }}>
                              <Text style={{ color: "rgba(255,255,255,0.76)", width: 24 }} weight="bold">
                                {r.rank}
                              </Text>
                              <AvatarWithFallback fullName={r.full_name} avatarUrl={r.avatar_url} size={32} />
                              <Text
                                style={{ color: colors.white, flex: 1 }}
                                weight="semibold"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {r.full_name ?? "Sem nome"}
                              </Text>
                            </View>
                            <Text style={{ color: group.accent }} weight="bold">
                              {r.total_points.toLocaleString("pt-BR")} pts
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>

              <Pressable
                onPress={() => {
                trackEvent("ranking_cta_click", { source: "marketing_lp", has_session: hasSession });
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
                onPress={() => {
                  trackEvent("login_cta_click", { source: "marketing_lp_top" });
                  router.push("/(auth)/login");
                }}
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
                onPress={() => {
                  trackEvent("signup_start", { source: "marketing_lp_top" });
                  router.push("/(auth)/cadastro");
                }}
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

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
            Ligas de Elite
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", lineHeight: 20 }}>
            {copy.program.xpSummary}
          </Text>
          {copy.program.tiers.map((item) => {
            const isGold = item.key === "gold";
            const isSilver = item.key === "silver";
            const wolfSource = isGold ? WOLF_BY_CLASS.gold : isSilver ? WOLF_BY_CLASS.silver : WOLF_BY_CLASS.bronze;
            const accent = isGold ? "#FFD700" : isSilver ? "#D9E2EC" : "#CD7F32";
            const border = isGold ? "rgba(255,215,0,0.55)" : isSilver ? "rgba(217,226,236,0.55)" : "rgba(205,127,50,0.55)";
            const glow = isGold ? "rgba(255,215,0,0.12)" : isSilver ? "rgba(217,226,236,0.10)" : "rgba(205,127,50,0.10)";
            return (
              <View
                key={item.title}
                style={{
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: glow,
                  padding: spacing.md,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.sm }}>
                    <View
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        borderWidth: 2,
                        borderColor: accent,
                        backgroundColor: "#FFFFFF",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={wolfSource}
                        style={{ width: "100%", height: "100%", tintColor: isGold ? GOLD_LUX_TINT : undefined }}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: accent, fontSize: typography.subtitle.fontSize }} weight="bold">
                        {item.title}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, lineHeight: 20 }}>{item.desc}</Text>
                    </View>
                  </View>
                  <Text style={{ color: accent, fontSize: 11 }} weight="semibold">
                    {item.range}
                  </Text>
                </View>
              </View>
            );
          })}
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
          {copy.program.goldAwards.map((award) => {
            const isMainAward = award === "Troféu Lobo de Ouro";
            return (
            <View
              key={award}
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: isMainAward ? "rgba(255,199,0,0.45)" : colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: isMainAward ? colors.einsteinYellow : "rgba(255,255,255,0.84)" }} weight={isMainAward ? "bold" : "regular"}>
                {award}
              </Text>
            </View>
            );
          })}
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
                    {item.category ?? "Olimpíada"} • Inscrição até {formatShortDate(item.registration_deadline)}
                  </Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.78)" }}>🔔</Text>
              </View>
            ))
          )}
          <Pressable
            onPress={() => {
              trackEvent("olympiads_cta_click", { source: "marketing_lp", has_session: hasSession });
              if (hasSession) {
                router.push("/(tabs)/olimpiadas");
                return;
              }
              router.push("/(auth)/login");
            }}
            style={{
              marginTop: spacing.xs,
              height: 42,
              borderRadius: radii.md,
              backgroundColor: "rgba(255,255,255,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.white }} weight="semibold">
              Ver todas →
            </Text>
          </Pressable>
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
              onPress={() => {
                trackEvent("login_cta_click", { source: "marketing_lp" });
                router.push("/(auth)/login");
              }}
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
              onPress={() => {
                trackEvent("signup_start", { source: "marketing_lp" });
                router.push("/(auth)/cadastro");
              }}
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

        <Modal visible={showPrizePopup} transparent animationType="fade" onRequestClose={dismissPrizePopup}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.72)",
              justifyContent: "center",
              paddingHorizontal: spacing.md,
            }}
          >
            <View
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.45)",
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: "rgba(255,199,0,0.65)",
                  backgroundColor: "rgba(255,199,0,0.2)",
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                }}
              >
                <Text style={{ color: colors.einsteinYellow, textAlign: "center", fontSize: typography.small.fontSize }} weight="bold">
                  PROMOÇÃO EXCLUSIVA PARA ALUNOS DO PLANO PRO
                </Text>
              </View>
              <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="bold">
                ETAPA 1 - COLÉGIO EINSTEIN
              </Text>
              <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
                Premiação Top 3
              </Text>

              <View style={{ gap: 4 }}>
                <Text style={{ color: "rgba(255,255,255,0.9)" }}>🥇 1º lugar: R$ 450 (cartão pré-pago/PIX prêmio)</Text>
                <Text style={{ color: "rgba(255,255,255,0.9)" }}>🥈 2º lugar: R$ 250 (voucher para tênis)</Text>
                <Text style={{ color: "rgba(255,255,255,0.9)" }}>🥉 3º lugar: R$ 100 (combo cinema + lanche)</Text>
              </View>

              <View
                style={{
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: "rgba(255,80,80,0.5)",
                  backgroundColor: "rgba(255,80,80,0.14)",
                  padding: spacing.sm,
                }}
              >
                <Text style={{ color: "#FFD7D7", textAlign: "center" }} weight="bold">
                  APENAS ALUNOS DO PLANO PRO PARTICIPAM DA PREMIAÇÃO.
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: spacing.xs }}>
                <Pressable
                  onPress={dismissPrizePopup}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: radii.md,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: colors.white }} weight="semibold">
                    Fechar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    dismissPrizePopup();
                    if (hasSession) {
                      router.push("/(tabs)/planos");
                      return;
                    }
                    router.push("/(auth)/cadastro");
                  }}
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
                    Quero Plano PRO
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </>
    </StitchScreenFrame>
  );
}
