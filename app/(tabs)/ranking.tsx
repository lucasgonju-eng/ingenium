import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, View } from "react-native";
import { Text } from "../../components/ui/Text";
import { fetchRankingGeral } from "../../lib/supabase/queries";
import { colors } from "../../lib/theme/tokens";

type RankingRow = {
  rank: number;
  user_id: string;
  full_name: string | null;
  grade: string | null;
  class_name: string | null;
  total_points: number;
  lobo_class: "bronze" | "silver" | "gold";
};

function LoboBadge({ cls }: { cls: "bronze" | "silver" | "gold" }) {
  const label =
    cls === "gold" ? "Lobo de Ouro" : cls === "silver" ? "Lobo de Prata" : "Lobo de Bronze";
  const bg =
    cls === "gold"
      ? colors.einsteinYellow
      : cls === "silver"
        ? "rgba(0,0,0,0.08)"
        : "rgba(176, 110, 60, 0.18)";
  const fg = cls === "gold" ? colors.einsteinBlue : colors.black;

  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ fontSize: 12, color: fg }} weight="semibold">
        {label}
      </Text>
    </View>
  );
}

export default function RankingScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RankingRow[]>([]);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchRankingGeral(50);
      setRows(data as RankingRow[]);
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }} tone="muted">
          Carregando ranking...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 22 }} weight="bold">
          Ranking Geral
        </Text>
        <Pressable
          onPress={() => {
            void load();
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: colors.einsteinBlue,
          }}
        >
          <Text style={{ color: colors.einsteinYellow }} weight="semibold">
            Atualizar
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.user_id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.08)",
              backgroundColor: "white",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18 }} weight="bold">
                #{item.rank}
              </Text>
              <LoboBadge cls={item.lobo_class} />
            </View>

            <Text style={{ marginTop: 8, fontSize: 16 }} weight="semibold">
              {item.full_name ?? "Sem nome"}
            </Text>
            <Text tone="muted" style={{ marginTop: 2 }}>
              {item.grade ? `${item.grade}` : ""}
              {item.class_name ? ` • ${item.class_name}` : ""}
            </Text>

            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text tone="muted">Pontos</Text>
              <Text weight="bold" style={{ fontSize: 18 }}>
                {item.total_points}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}
