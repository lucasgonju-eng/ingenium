import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import StitchScreenFrame from "../layout/StitchScreenFrame";
import StitchHeader from "../ui/StitchHeader";
import { Text } from "../ui/Text";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type Section = {
  title: string;
  body: string;
  badge?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  sections: Section[];
  ctas?: Array<{ label: string; onPress?: () => void; tone?: "primary" | "secondary" }>;
};

export default function StitchScaffoldScreen({ title, subtitle, sections, ctas }: Props) {
  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title={title} subtitle={subtitle} variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {sections.map((section) => (
            <View
              key={`${section.title}-${section.body}`}
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
                  {section.title}
                </Text>
                {section.badge ? (
                  <View style={{ borderRadius: radii.pill, backgroundColor: "rgba(255,199,0,0.15)", paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: colors.einsteinYellow, fontSize: 10 }} weight="bold">
                      {section.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, lineHeight: 20 }}>
                {section.body}
              </Text>
            </View>
          ))}

          {ctas?.length ? (
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {ctas.map((cta) => (
                <Pressable
                  key={cta.label}
                  onPress={cta.onPress}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: radii.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: cta.tone === "secondary" ? "rgba(255,255,255,0.08)" : colors.einsteinYellow,
                  }}
                >
                  <Text
                    style={{
                      color: cta.tone === "secondary" ? colors.white : colors.einsteinBlue,
                      fontSize: typography.small.fontSize,
                    }}
                    weight="bold"
                  >
                    {cta.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
