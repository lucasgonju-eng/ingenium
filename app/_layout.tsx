import { Stack } from "expo-router";
import { useEffect } from "react";
import { initGtm } from "../lib/analytics/gtm";

export default function RootLayout() {
  useEffect(() => {
    initGtm();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}