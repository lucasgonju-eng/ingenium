import React from "react";
import { Pressable, View } from "react-native";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

type Props = {
  onLogin: () => void;
  onSignup: () => void;
};

export default function FeedNoSessionState({ onLogin, onSignup }: Props) {
  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSoft,
        backgroundColor: colors.surfacePanel,
        padding: sizes.cardPadding,
      }}
    >
      <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
        Entre para ver o mural
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: spacing.xs }}>
        O mural é exclusivo para participantes logados.
      </Text>
      <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm }}>
        <Pressable
          onPress={onLogin}
          style={{
            flex: 1,
            height: sizes.buttonHeight,
            borderRadius: radii.md,
            backgroundColor: colors.einsteinYellow,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.einsteinBlue, fontSize: typography.small.fontSize }} weight="bold">
            Entrar
          </Text>
        </Pressable>
        <Pressable
          onPress={onSignup}
          style={{
            flex: 1,
            height: sizes.buttonHeight,
            borderRadius: radii.md,
            backgroundColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="bold">
            Criar conta
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
