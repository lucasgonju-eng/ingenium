import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { canonicalCatalogScreens } from "../../lib/stitch/canonicalScreens";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

export default function StitchCatalogIndexScreen() {
  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Catálogo Stitch" subtitle="Telas canônicas auxiliares" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
          {canonicalCatalogScreens.map((screen) => (
            <Pressable
              key={screen.route}
              onPress={() => router.push(screen.route as never)}
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.sm,
              }}
            >
              <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
                {screen.title}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4, fontSize: 11 }}>{screen.screenId}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
