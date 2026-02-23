import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
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
        tabBarItemStyle: {
          width: 90,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const iconSize = Math.max(size, 18);
          if (route.name === "dashboard") {
            return <Ionicons name={focused ? "home" : "home-outline"} size={iconSize} color={color} />;
          }
          if (route.name === "olimpiadas") {
            return <Ionicons name={focused ? "trophy" : "trophy-outline"} size={iconSize} color={color} />;
          }
          if (route.name === "planos") {
            return <Ionicons name={focused ? "card" : "card-outline"} size={iconSize} color={color} />;
          }
          if (route.name === "ranking") {
            return <Ionicons name={focused ? "podium" : "podium-outline"} size={iconSize} color={color} />;
          }
          if (route.name === "mural") {
            return <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={iconSize} color={color} />;
          }
          if (route.name === "perfil") {
            return <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={iconSize} color={color} />;
          }
          return <Ionicons name={focused ? "newspaper" : "newspaper-outline"} size={iconSize} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="olimpiadas" options={{ title: "Olimpíadas" }} />
      <Tabs.Screen name="planos" options={{ title: "Planos" }} />
      <Tabs.Screen name="ranking" options={{ title: "Ranking" }} />
      <Tabs.Screen name="mural" options={{ title: "Mural" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed" }} />
    </Tabs>
  );
}
