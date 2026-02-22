import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, TextInput, View } from "react-native";
import { fetchOlympiads } from "../../lib/supabase/queries";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";
import StitchScreenFrame from "../layout/StitchScreenFrame";
import { Text } from "../ui/Text";
import StitchHeader from "../ui/StitchHeader";
import OlimpiadaCard from "./OlimpiadaCard";
import OlimpiadaStatusTabs from "./OlimpiadaStatusTabs";
import { getOlympiadStatusUI, mapOlympiadStatus, OlympiadStatus } from "./olympiadStatus";

type OlympiadRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
};

type TabKey = "open" | "ongoing" | "results";

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

export default function OlimpiadasListScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OlympiadRow[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("open");

  async function load() {
    try {
      setLoading(true);
      const data = await fetchOlympiads();
      setRows(data as OlympiadRow[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar olimpiadas";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const status = mapOlympiadStatus(row.status);
      const byTab =
        tab === "open" ? status === "open" : tab === "ongoing" ? status === "upcoming" || status === "open" : status === "closed";
      const bySearch = !q || row.title.toLowerCase().includes(q) || (row.category ?? "").toLowerCase().includes(q);
      return byTab && bySearch;
    });
  }, [rows, search, tab]);
  const listRows = useMemo(() => filteredRows.slice(1), [filteredRows]);

  if (loading) {
    return (
      <StitchScreenFrame>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: spacing.xs, color: "rgba(255,255,255,0.75)" }}>Carregando olimpiadas...</Text>
        </View>
      </StitchScreenFrame>
    );
  }

  return (
    <StitchScreenFrame>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
        data={listRows}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <View style={{ paddingTop: spacing.sm }}>
            <StitchHeader
              title="Olimpíadas"
              rightSlot={
                <View style={{ width: 40, height: 40, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <Text style={{ color: "white", fontSize: 18 }}>☰</Text>
                </View>
              }
            />

            <View
              style={{
                marginTop: spacing.sm,
                height: sizes.inputHeight,
                borderRadius: radii.xl,
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
                placeholder="Buscar olimpíadas..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, color: colors.white, fontFamily: typography.fontFamily.base }}
              />
            </View>

            <OlimpiadaStatusTabs value={tab} onChange={setTab} />

            {filteredRows.length > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                {(() => {
                  const top = filteredRows[0];
                  const status = mapOlympiadStatus(top.status);
                  const ui = getOlympiadStatusUI(status);
                  return (
                    <OlimpiadaCard
                      title={top.title}
                      subject={top.category ?? undefined}
                      status={status}
                      startAt={fmtDate(top.start_date)}
                      registrationEndAt={fmtDate(top.registration_deadline)}
                      ctaLabel={ui.ctaLabel}
                      featured
                      onPress={() => router.push(`/olimpiadas/${top.id}`)}
                    />
                  );
                })()}
                <Text style={{ marginTop: spacing.md, marginBottom: spacing.xs, color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
                  Todas as Olimpíadas
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const status = mapOlympiadStatus(item.status);
          const ui = getOlympiadStatusUI(status);
          return (
            <OlimpiadaCard
              title={item.title}
              subject={item.category ?? undefined}
              status={status as OlympiadStatus}
              startAt={fmtDate(item.start_date)}
              registrationEndAt={fmtDate(item.registration_deadline)}
              ctaLabel={ui.ctaLabel}
              onPress={() => router.push(`/olimpiadas/${item.id}`)}
            />
          );
        }}
        ListEmptyComponent={
          <View
            style={{
              marginTop: spacing.lg,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: sizes.cardPadding,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.7)", textAlign: "center" }}>
              Nenhuma competição encontrada para esse filtro.
            </Text>
          </View>
        }
      />
    </StitchScreenFrame>
  );
}
