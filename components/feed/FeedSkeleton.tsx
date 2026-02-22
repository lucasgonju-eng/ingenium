import React from "react";
import { View } from "react-native";
import { colors, radii, sizes, spacing } from "../../lib/theme/tokens";

export default function FeedSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={{
            borderRadius: radii.lg,
            backgroundColor: colors.surfacePanel,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            padding: sizes.compactCardPadding,
          }}
        >
          <View style={{ width: "40%", height: 12, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radii.sm }} />
          <View style={{ marginTop: spacing.sm, width: "100%", height: 10, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radii.sm }} />
          <View style={{ marginTop: spacing.xs, width: "90%", height: 10, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: radii.sm }} />
        </View>
      ))}
    </View>
  );
}
