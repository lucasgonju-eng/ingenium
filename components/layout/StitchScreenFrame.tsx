import { LinearGradient } from "expo-linear-gradient";
import { router, useNavigation } from "expo-router";
import React from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../ui/Text";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  children: React.ReactNode;
  maxWidth?: number;
};

export default function StitchScreenFrame({ children, maxWidth = 430 }: Props) {
  const navigation = useNavigation();
  const contentWidthStyle = Platform.OS === "web" ? { width: "100%" as const, maxWidth, flex: 1 } : { width: "100%" as const, flex: 1 };
  const canGoBack = navigation.canGoBack();

  function handleBack() {
    if (canGoBack) {
      router.back();
      return;
    }
    router.replace("/(marketing)");
  }

  return (
    <LinearGradient colors={[colors.bgStart, colors.bgMid, colors.bgEnd]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: spacing.xs,
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 20,
            }}
          >
            <Image
              source={require("../../assets/ingenium-logo.webp")}
              style={{ width: 60, height: 60 }}
              resizeMode="contain"
            />
          </View>
          <View
            style={{
              position: "absolute",
              top: spacing.sm,
              left: spacing.sm,
              zIndex: 30,
            }}
          >
            <Pressable
              onPress={handleBack}
              style={{
                height: 34,
                borderRadius: radii.pill,
                paddingHorizontal: spacing.sm,
                backgroundColor: "rgba(255,255,255,0.10)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                ← Voltar
              </Text>
            </Pressable>
          </View>
          <View style={contentWidthStyle}>{children}</View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
