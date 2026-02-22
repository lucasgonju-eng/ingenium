import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { FaqItem } from "../content/planos";

type Props = {
  items: FaqItem[];
};

export default function FAQAccordion({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <View className="gap-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <View key={item.question} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Pressable onPress={() => setOpenIndex(open ? null : index)} className="flex-row items-center justify-between">
              <Text className="mr-3 flex-1 text-sm font-bold text-slate-700">{item.question}</Text>
              <Text className="text-lg font-bold text-[#000066]">{open ? "−" : "+"}</Text>
            </Pressable>
            {open ? <Text className="mt-2 text-sm leading-5 text-slate-500">{item.answer}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}
