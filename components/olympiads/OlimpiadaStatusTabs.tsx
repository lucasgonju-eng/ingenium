import React from "react";
import { Pressable, View } from "react-native";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

type TabKey = "open" | "ongoing" | "results";

type Props = {
  value: TabKey;
  onChange: (value: TabKey) => void;
};

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "open", label: "Inscrições Abertas" },
  { key: "ongoing", label: "Em Andamento" },
  { key: "results", label: "Resultados" },
];

export default function OlimpiadaStatusTabs({ value, onChange }: Props) {
  return (
    <View style={{ flexDirection: "row", marginTop: spacing.sm, gap: spacing.xs }}>
      {TABS.map((tab) => {
        const active = value === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              borderRadius: radii.pill,
              backgroundColor: active ? colors.einsteinBlue : colors.surfacePanel,
              borderWidth: 1,
              borderColor: active ? colors.borderStrong : colors.borderSoft,
            }}
          >
            <Text
              style={{ color: active ? colors.white : "rgba(255,255,255,0.74)", fontSize: typography.small.fontSize }}
              weight="semibold"
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
