import React from "react";
import { Pressable, View } from "react-native";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

type Props = {
  onBack: () => void;
};

export default function FeedNoPermissionState({ onBack }: Props) {
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
        Sem permissão para acessar o mural
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: spacing.xs }}>
        Sua conta ainda não tem acesso a esta área.
      </Text>
      <Pressable
        onPress={onBack}
        style={{
          marginTop: spacing.sm,
          height: sizes.buttonHeight,
          borderRadius: radii.md,
          backgroundColor: "rgba(255,255,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="bold">
          Voltar
        </Text>
      </Pressable>
    </View>
  );
}
