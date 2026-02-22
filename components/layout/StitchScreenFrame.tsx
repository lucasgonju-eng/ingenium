import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../lib/theme/tokens";

type Props = {
  children: React.ReactNode;
  maxWidth?: number;
};

export default function StitchScreenFrame({ children, maxWidth = 430 }: Props) {
  const contentWidthStyle = Platform.OS === "web" ? { width: "100%" as const, maxWidth, flex: 1 } : { width: "100%" as const, flex: 1 };

  return (
    <LinearGradient colors={[colors.bgStart, colors.bgMid, colors.bgEnd]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={contentWidthStyle}>{children}</View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
