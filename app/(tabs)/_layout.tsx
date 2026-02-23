import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";
import { colors } from "../../lib/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.einsteinYellow,
        tabBarInactiveTintColor: "rgba(255,255,255,0.7)",
        tabBarScrollEnabled: true,
        tabBarStyle: {
          backgroundColor: colors.surfacePanel,
          borderTopColor: "rgba(255,199,0,0.30)",
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 1,
        },
        tabBarIcon: ({ color }) => {
          let glyph = "•";
          if (route.name === "dashboard") {
            glyph = "⌂";
          } else if (route.name === "olimpiadas") {
            glyph = "🏆";
          } else if (route.name === "planos") {
            glyph = "💳";
          } else if (route.name === "ranking") {
            glyph = "◔";
          } else if (route.name === "mural") {
            glyph = "✉";
          } else if (route.name === "perfil") {
            glyph = "◉";
          } else if (route.name === "feed") {
            glyph = "▦";
          }
          return (
            <Text style={{ color, fontSize: 18, fontWeight: "700", lineHeight: 20 }}>
              {glyph}
            </Text>
          );
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="olimpiadas" options={{ title: "Olimp." }} />
      <Tabs.Screen name="planos" options={{ title: "Planos" }} />
      <Tabs.Screen name="ranking" options={{ title: "Ranking" }} />
      <Tabs.Screen name="mural" options={{ title: "Mural" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
    </Tabs>
  );
}
