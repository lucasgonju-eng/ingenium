import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../ui/Text";
import { colors } from "../../lib/theme/tokens";

export default function DashboardActions() {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
      <Pressable
        onPress={() => router.push("/(tabs)/ranking")}
        style={{
          flex: 1,
          paddingVertical: 12,
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
        onPress={() => router.push("/(tabs)/olimpiadas")}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.14)",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white" }} weight="semibold">
          Ver Olimpíadas
        </Text>
      </Pressable>
    </View>
  );
}
