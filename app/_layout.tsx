import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { initGtm } from "../lib/analytics/gtm";
import FloatingSupportBubble from "../components/support/FloatingSupportBubble";

export default function RootLayout() {
  useEffect(() => {
    initGtm();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <FloatingSupportBubble />
    </View>
  );
}