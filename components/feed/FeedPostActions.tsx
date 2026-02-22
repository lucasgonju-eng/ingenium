import React from "react";
import { Pressable, View } from "react-native";
import { spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

type Props = {
  likes?: number;
  comments?: number;
};

export default function FeedPostActions({ likes = 0, comments = 0 }: Props) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm, alignItems: "center" }}>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ color: "rgba(255,255,255,0.56)" }}>♡</Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: typography.small.fontSize }} weight="bold">
            {likes}
          </Text>
        </Pressable>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ color: "rgba(255,255,255,0.56)" }}>💬</Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: typography.small.fontSize }} weight="bold">
            {comments}
          </Text>
        </Pressable>
        <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ color: "rgba(255,255,255,0.56)" }}>↗</Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: typography.small.fontSize }} weight="bold">
            18
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
