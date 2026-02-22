import React, { useState } from "react";
import { Pressable, View } from "react-native";
import type { FaqItem } from "../content/planos";
import { colors, radii, spacing, typography } from "../lib/theme/tokens";
import { Text } from "./ui/Text";

type Props = {
  items: FaqItem[];
};

export default function FAQAccordion({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View style={{ gap: spacing.xs }}>
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <View
            key={item.question}
            style={{
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
            }}
          >
            <Pressable onPress={() => setOpenIndex(open ? null : index)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ marginRight: spacing.xs, flex: 1, color: colors.white, fontSize: 14 }} weight="bold">
                {item.question}
              </Text>
              <Text style={{ color: colors.einsteinYellow, fontSize: 20 }} weight="bold">
                {open ? "−" : "+"}
              </Text>
            </Pressable>
            {open ? (
              <Text style={{ marginTop: spacing.xs, color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 20 }}>
                {item.answer}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
