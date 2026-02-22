import React from "react";
import { View } from "react-native";
import RankingTopPodium from "./RankingTopPodium";

type RankingRow = {
  position_geral_media: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  avg_points: number;
  olympiads_count: number;
  lobo_class: "bronze" | "silver" | "gold";
};

type Props = {
  top3: RankingRow[];
};

export default function RankingPodiumSection({ top3 }: Props) {
  return (
    <View style={{ marginTop: 12 }}>
      <RankingTopPodium
        variant="geral"
        top3={top3.map((row) => ({
          position: row.position_geral_media,
          user_id: row.user_id,
          full_name: row.full_name,
          avatar_url: row.avatar_url,
          lobo_class: row.lobo_class,
          avg_points: Number(row.avg_points),
          olympiads_count: row.olympiads_count,
        }))}
      />
    </View>
  );
}
