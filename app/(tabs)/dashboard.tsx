import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { Text } from "../../components/ui/Text";
import { fetchMyPoints, fetchMyRank } from "../../lib/supabase/queries";
import { colors } from "../../lib/theme/tokens";

type LoboClass = "bronze" | "silver" | "gold";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [cls, setCls] = useState<LoboClass>("bronze");

  async function load() {
    try {
      setLoading(true);
      const [r, p] = await Promise.all([fetchMyRank(), fetchMyPoints()]);
      setRank(r.rank ?? null);
      setPoints(p?.total_points ?? r.total_points ?? 0);
      setCls((p?.lobo_class ?? r.lobo_class ?? "bronze") as LoboClass);
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

  const label = cls === "gold" ? "Lobo de Ouro" : cls === "silver" ? "Lobo de Prata" : "Lobo de Bronze";

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
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
      <View style={{ padding: 16, borderRadius: 18, backgroundColor: colors.einsteinBlue }}>
        <Text style={{ color: colors.einsteinYellow, fontSize: 14 }} weight="semibold">
          Minha Classe
        </Text>
        <Text style={{ color: "white", fontSize: 22, marginTop: 6 }} weight="bold">
          {label}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.8)" }}>Pontos</Text>
            <Text style={{ color: "white", fontSize: 20 }} weight="bold">
              {points}
            </Text>
          </View>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.8)" }}>Posição</Text>
            <Text style={{ color: "white", fontSize: 20 }} weight="bold">
              #{rank ?? "-"}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={() => router.push("/(tabs)/ranking")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.einsteinYellow,
              alignItems: "center",
            }}
          >
            <Text tone="brand" weight="bold">
              Ver Ranking
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void load();
            }}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          >
            <Text style={{ color: "white" }} weight="semibold">
              ↻
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
