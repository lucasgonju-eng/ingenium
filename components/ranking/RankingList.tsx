import React from "react";
import { FlatList, View } from "react-native";
import { Text } from "../ui/Text";
import RankingRow from "./RankingRow";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";

type Row = {
  position: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  grade?: string | null;
  total_points: number;
  lobo_class: "bronze" | "silver" | "gold";
};

type Props = {
  rows: Row[];
  myUserId: string | null;
  headerComponent: React.ReactElement;
};

export default function RankingList({ rows, myUserId, headerComponent }: Props) {
  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      data={rows}
      keyExtractor={(item) => `${item.user_id}-${item.position}`}
      ListHeaderComponent={headerComponent}
      ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      renderItem={({ item }) => (
        <RankingRow
          position={item.position}
          userId={item.user_id}
          fullName={item.full_name}
          avatarUrl={item.avatar_url}
          loboClass={item.lobo_class}
          totalPoints={Number(item.total_points)}
          isMe={item.user_id === myUserId}
        />
      )}
      ListEmptyComponent={
        <View
          style={{
            marginHorizontal: spacing.md,
            marginTop: spacing.md,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            padding: sizes.cardPadding,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: typography.subtitle.fontSize,
              textAlign: "center",
            }}
          >
            Sem ranking disponivel no momento.
          </Text>
        </View>
      }
    />
  );
}
