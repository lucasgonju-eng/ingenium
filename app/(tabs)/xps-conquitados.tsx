import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { fetchMyPoints, fetchMyXpHistory, MyXpHistoryRow } from "../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type XpHistoryWithRunningBalance = MyXpHistoryRow & {
  runningBalance: number;
};

function getXpEventLabel(eventType: string, note?: string | null, sourceRef?: string | null) {
  const normalizedNote = (note ?? "").trim().toLowerCase();
  const normalizedSourceRef = (sourceRef ?? "").trim().toLowerCase();
  const isPlanoProBonus =
    normalizedSourceRef.startsWith("asaas_pro_payment_") ||
    normalizedSourceRef.startsWith("asaas_planopro_bonus_2026_") ||
    normalizedNote.includes("plano pro");

  if (isPlanoProBonus) return "Bônus Plano PRO";

  const normalized = eventType.trim().toLowerCase();
  if (normalized === "complete_profile_data") return "Perfil completo";
  if (normalized === "profile_photo_upload") return "Inserir foto de perfil";
  if (normalized === "top10_school_simulado") return "Top 10 no Simulado da Escola";
  if (normalized === "weekly_study_group_75_presence") return "Grupo de estudo semanal";
  if (normalized === "volunteer_mentorship_bronze") return "Monitoria voluntária (Lobo de Bronze)";
  if (normalized === "perfect_quarter_attendance") return "Frequência perfeita trimestral";
  return normalized.replaceAll("_", " ");
}

function byChronologicalOrder(a: MyXpHistoryRow, b: MyXpHistoryRow) {
  const occurredDiff = new Date(a.occurred_on).getTime() - new Date(b.occurred_on).getTime();
  if (occurredDiff !== 0) return occurredDiff;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export default function XpsConquitadosScreen() {
  const [loading, setLoading] = useState(true);
  const [historyRows, setHistoryRows] = useState<MyXpHistoryRow[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  async function load() {
    try {
      setLoading(true);
      const [pointsRes, historyRes] = await Promise.all([fetchMyPoints(), fetchMyXpHistory(500)]);
      setTotalPoints(pointsRes?.total_points ?? 0);
      setHistoryRows(historyRes);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar histórico de XP.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const historyWithRunningBalance = useMemo<XpHistoryWithRunningBalance[]>(() => {
    const sorted = [...historyRows].sort(byChronologicalOrder);
    let runningBalance = 0;
    return sorted.map((row) => {
      runningBalance += row.xp_amount;
      return {
        ...row,
        runningBalance,
      };
    });
  }, [historyRows]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text tone="muted" style={{ marginTop: spacing.xs }}>
          Carregando histórico de XP...
        </Text>
      </View>
    );
  }

  return (
    <StitchScreenFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <StitchHeader
          title="XPs Conquitados"
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
              <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                Atualizar
              </Text>
            </Pressable>
          }
        />

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          <View
            style={{
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: "rgba(255,199,0,0.35)",
              backgroundColor: "rgba(255,199,0,0.12)",
              padding: spacing.md,
            }}
          >
            <Text style={{ color: colors.einsteinYellow, fontSize: typography.small.fontSize }} weight="bold">
              SALDO FINAL
            </Text>
            <Text style={{ color: colors.white, fontSize: typography.titleLg.fontSize, marginTop: 4 }} weight="bold">
              {totalPoints.toLocaleString("pt-BR")} XP
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
              Histórico completo das conquistas de XP, evento por evento.
            </Text>
          </View>

          {historyWithRunningBalance.length === 0 ? (
            <View
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.72)" }}>Você ainda não possui eventos no histórico de XP.</Text>
            </View>
          ) : (
            historyWithRunningBalance.map((row, idx) => (
              <View
                key={row.id}
                style={{
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfacePanel,
                  padding: spacing.md,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
                  <Text style={{ color: colors.white, flex: 1 }} weight="semibold">
                    {idx + 1}. {getXpEventLabel(row.event_type, row.note, row.source_ref)}
                  </Text>
                  <Text style={{ color: colors.einsteinYellow }} weight="bold">
                    +{row.xp_amount.toLocaleString("pt-BR")} XP
                  </Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, fontSize: typography.small.fontSize }}>
                  Data: {new Date(row.occurred_on).toLocaleDateString("pt-BR")}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.84)", marginTop: 2, fontSize: typography.small.fontSize }} weight="semibold">
                  Saldo após este evento: {row.runningBalance.toLocaleString("pt-BR")} XP
                </Text>
                {row.note ? (
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, fontSize: typography.small.fontSize }}>
                    Detalhe: {row.note}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
