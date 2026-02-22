import React from "react";
import { FlatList, View } from "react-native";
import RankingItem from "./RankingItem";
import { Text } from "../ui/Text";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";

type RankingRow = {
  position_geral_media: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  avg_points: number;
  olympiads_count: number;
  total_points_sum: number;
  total_points: number | null;
  lobo_class: "bronze" | "silver" | "gold";
};

type Props = {
  rows: RankingRow[];
  myUserId: string | null;
  headerComponent?: React.ReactElement;
};

export default function RankingListSection({ rows, myUserId, headerComponent }: Props) {
  return (
    <FlatList
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
      data={rows}
      keyExtractor={(item) => item.user_id}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListHeaderComponent={headerComponent}
      renderItem={({ item }) => (
        <View
          style={{
            padding: sizes.compactCardPadding,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
          }}
        >
          <RankingItem
            position={item.position_geral_media}
            fullName={item.full_name}
            avatarUrl={item.avatar_url}
            loboClass={item.lobo_class}
            avgPoints={Number(item.avg_points)}
            olympiadsCount={item.olympiads_count}
            rightLabel={Number(item.avg_points).toFixed(2)}
            isMe={item.user_id === myUserId}
          />

          <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: typography.small.fontSize }}>
            Total acumulado: {item.total_points ?? item.total_points_sum}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.7)" }}>Sem ranking disponivel no momento.</Text>
        </View>
      }
    />
  );
}
