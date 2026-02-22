import React from "react";
import { Pressable, Text, View } from "react-native";
import type { PlanItem } from "../content/planos";
import FeatureItem from "./FeatureItem";

type Props = {
  plan: PlanItem;
  onPress?: (plan: PlanItem) => void;
};

export default function PlanCard({ plan, onPress }: Props) {
  const isPro = plan.highlighted;

  return (
    <View className={`rounded-2xl p-6 ${isPro ? "border-2 border-[#FFC700] bg-slate-900" : "border border-slate-200 bg-white"}`}>
      {plan.badge ? (
        <View className="mb-4 self-center rounded-full bg-[#FFC700] px-3 py-1">
          <Text className="text-[10px] font-black uppercase tracking-widest text-[#000066]">{plan.badge}</Text>
        </View>
      ) : null}

      <Text className={`text-xs font-bold uppercase tracking-wider ${isPro ? "text-[#FFC700]" : "text-slate-500"}`}>{plan.title}</Text>
      <View className="mt-1 flex-row items-end">
        <Text className={`text-4xl font-black ${isPro ? "text-white" : "text-slate-900"}`}>{plan.price}</Text>
        {plan.period ? <Text className="ml-1 pb-1 text-lg font-medium text-slate-500">{plan.period}</Text> : null}
      </View>
      {plan.subtitle ? <Text className="mt-1 text-xs italic text-slate-400">{plan.subtitle}</Text> : null}

      <View className="mt-6 gap-3">
        {plan.features.map((feature) => (
          <FeatureItem key={`${plan.id}-${feature.label}`} item={feature} highlighted={isPro} />
        ))}
      </View>

      <Pressable
        onPress={() => onPress?.(plan)}
        className={`mt-6 h-12 items-center justify-center rounded-xl ${isPro ? "bg-[#FFC700]" : "border-2 border-[#000066]"}`}
      >
        <Text className={`font-bold ${isPro ? "text-[#000066]" : "text-[#000066]"}`}>{plan.cta}</Text>
      </Pressable>
    </View>
  );
}
