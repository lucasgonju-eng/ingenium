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

type SectionTone = "gold" | "silver" | "bronze";
type SectionItem = {
  type: "section";
  key: string;
  title: string;
  subtitle: string;
  tone: SectionTone;
};
type RowItem = { type: "row"; key: string; row: Row };
type ListItem = SectionItem | RowItem;

function buildSectionRows(rows: Row[]): ListItem[] {
  const groups: Array<{ key: SectionTone; title: string; subtitle: string; rows: Row[] }> = [
    {
      key: "gold",
      title: "Lobo de Ouro",
      subtitle: "20.000 XP ou mais",
      rows: rows.filter((row) => row.lobo_class === "gold"),
    },
    {
      key: "silver",
      title: "Lobo de Prata",
      subtitle: "8.000 a 19.999 XP",
      rows: rows.filter((row) => row.lobo_class === "silver"),
    },
    {
      key: "bronze",
      title: "Lobo de Bronze",
      subtitle: "0 a 7.999 XP",
      rows: rows.filter((row) => row.lobo_class === "bronze"),
    },
  ];

  const result: ListItem[] = [];
  groups.forEach((group) => {
    if (group.rows.length === 0) return;
    result.push({
      type: "section",
      key: `section-${group.key}`,
      title: group.title,
      subtitle: `${group.subtitle} • ${group.rows.length} aluno(s)`,
      tone: group.key,
    });
    group.rows.forEach((row) => {
      result.push({
        type: "row",
        key: `${row.user_id}-${row.position}`,
        row,
      });
    });
  });
  return result;
}

function sectionStyles(tone: SectionTone) {
  if (tone === "gold") {
    return {
      borderColor: "rgba(255,199,0,0.45)",
      backgroundColor: "rgba(255,199,0,0.14)",
      titleColor: colors.einsteinYellow,
    };
  }
  if (tone === "silver") {
    return {
      borderColor: "rgba(183,198,214,0.55)",
      backgroundColor: "rgba(183,198,214,0.14)",
      titleColor: "#D9E2EC",
    };
  }
  return {
    borderColor: "rgba(190,122,62,0.55)",
    backgroundColor: "rgba(190,122,62,0.14)",
    titleColor: "#D7A273",
  };
}

export default function RankingList({ rows, myUserId, headerComponent }: Props) {
  const sectionedRows = buildSectionRows(rows);

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      data={sectionedRows}
      keyExtractor={(item) => item.key}
      ListHeaderComponent={headerComponent}
      ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      renderItem={({ item }) => {
        if (item.type === "section") {
          const tone = sectionStyles(item.tone);
          return (
            <View
              style={{
                marginHorizontal: spacing.md,
                marginTop: spacing.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: tone.borderColor,
                backgroundColor: tone.backgroundColor,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={{ color: tone.titleColor, fontSize: typography.subtitle.fontSize }} weight="bold">
                {item.title}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: 2 }}>{item.subtitle}</Text>
            </View>
          );
        }

        return (
          <RankingRow
            position={item.row.position}
            userId={item.row.user_id}
            fullName={item.row.full_name}
            avatarUrl={item.row.avatar_url}
            loboClass={item.row.lobo_class}
            totalPoints={Number(item.row.total_points)}
            isMe={item.row.user_id === myUserId}
          />
        );
      }}
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
