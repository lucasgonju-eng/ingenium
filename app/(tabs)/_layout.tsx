import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="olimpiadas" options={{ title: "Olimpíadas" }} />
      <Tabs.Screen name="ranking" options={{ title: "Ranking" }} />
      <Tabs.Screen name="mural" options={{ title: "Mural" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
