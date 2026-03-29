import { Tabs } from "expo-router";
import React from "react";
import ScrollableBottomTabBar from "../../components/navigation/ScrollableBottomTabBar";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <ScrollableBottomTabBar {...props} />}>
      <Tabs.Screen name="dashboard" options={{ title: "Início" }} />
      <Tabs.Screen name="mensagens" options={{ title: "Mensagens" }} />
      <Tabs.Screen name="olimpiadas" options={{ title: "Olimpíadas" }} />
      <Tabs.Screen name="lab-games" options={{ title: "Lab Games" }} />
      <Tabs.Screen name="planos" options={{ title: "Planos" }} />
      <Tabs.Screen name="xps-conquitados" options={{ title: "XP" }} />
      <Tabs.Screen name="ranking" options={{ title: "Ranking" }} />
      <Tabs.Screen name="mural" options={{ title: "Mural", href: null }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed", href: null }} />
    </Tabs>
  );
}
