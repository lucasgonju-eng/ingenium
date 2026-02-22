import React from "react";
import { Text, View } from "react-native";
import type { PlanFeature } from "../content/planos";

type Props = {
  item: PlanFeature;
  highlighted?: boolean;
};

export default function FeatureItem({ item, highlighted = false }: Props) {
  const icon = item.included ? "●" : "○";
  const iconClass = item.included ? (highlighted ? "text-[#FFC700]" : "text-emerald-500") : "text-slate-400";
  const textClass = item.included
    ? highlighted || item.emphasis
      ? "text-slate-100 font-semibold"
      : "text-slate-700"
    : "text-slate-400";

  return (
    <View className="flex-row items-start gap-3">
      <Text className={`text-base leading-5 ${iconClass}`}>{icon}</Text>
      <Text className={`flex-1 text-sm ${textClass}`}>{item.label}</Text>
    </View>
  );
}
