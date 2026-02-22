import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import FAQAccordion from "./FAQAccordion";
import PlanCard from "./PlanCard";
import { planosContent } from "../content/planos";
import StitchScreenFrame from "./layout/StitchScreenFrame";
import StitchHeader from "./ui/StitchHeader";

export default function PlanosIngeniumScreen() {
  return (
    <StitchScreenFrame>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 64 }}>
        <View className="px-4 pt-2">
          <StitchHeader title="Planos" subtitle="Assinatura InGenium" variant="feed" />
        </View>

        <View className="mt-3 bg-[#000066] px-6 pb-10 pt-8">
          <View className="self-center rounded-full border border-[#FFC700]/30 bg-[#FFC700]/10 px-4 py-1">
            <Text className="text-xs font-semibold uppercase tracking-widest text-[#FFC700]">{planosContent.heroTag}</Text>
          </View>
          <Text className="mt-5 text-center text-4xl font-black text-white">{planosContent.title}</Text>
          <Text className="mt-3 text-center text-lg font-medium text-slate-200">{planosContent.subtitle}</Text>
          <Text className="mt-3 text-center text-sm leading-6 text-slate-300">{planosContent.description}</Text>
          <Pressable className="mt-6 self-center rounded-xl border border-white/20 bg-white/10 px-6 py-3">
            <Text className="font-bold text-white">{planosContent.compareCta}</Text>
          </Pressable>
        </View>

        <View className="-mt-6 gap-5 px-4">
          {planosContent.plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </View>

        <View className="mt-10 bg-slate-100/80 px-6 py-10">
          <Text className="text-center text-2xl font-black text-[#000066]">{planosContent.howItWorksTitle}</Text>
          <View className="mt-7 gap-6">
            {planosContent.howItWorks.map((step) => (
              <View key={step.title} className="items-center">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white">
                  <Text className="text-2xl text-[#000066]">★</Text>
                </View>
                <Text className="mt-3 text-center text-base font-bold text-slate-900">{step.title}</Text>
                <Text className="mt-1 text-center text-sm text-slate-500">{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-white px-8 py-14">
          <Text className="text-center text-2xl italic leading-9 text-[#000066]">{planosContent.quote}</Text>
        </View>

        <View className="bg-slate-100 px-6 py-10">
          <Text className="mb-5 text-xl font-black text-slate-900">Perguntas frequentes</Text>
          <FAQAccordion items={planosContent.faq} />
        </View>

        <View className="bg-[#000066] px-6 pb-16 pt-10">
          <Text className="text-center text-2xl font-bold text-white">{planosContent.finalTitle}</Text>
          <Pressable className="mt-7 h-14 items-center justify-center rounded-xl bg-[#FFC700]">
            <Text className="text-lg font-black text-[#000066]">{planosContent.finalCta}</Text>
          </Pressable>
          <Text className="mt-4 text-center text-sm text-slate-300">{planosContent.finalNote}</Text>
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
