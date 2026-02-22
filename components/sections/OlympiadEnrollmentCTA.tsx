import React from "react";
import { Pressable } from "react-native";
import { Text } from "../ui/Text";
import { colors, radii, shadows, sizes, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  ctaLabel: string;
  ctaDisabled: boolean;
  onPress: () => void;
};

export default function OlympiadEnrollmentCTA({ ctaLabel, ctaDisabled, onPress }: Props) {
  return (
    <Pressable
      disabled={ctaDisabled}
      onPress={onPress}
      style={{
        marginTop: spacing.xl,
        height: sizes.buttonHeight,
        borderRadius: radii.xl,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ctaDisabled ? "rgba(255,255,255,0.16)" : colors.einsteinBlue,
        borderWidth: ctaDisabled ? 1 : 0,
        borderColor: ctaDisabled ? colors.borderSoft : "transparent",
        ...shadows.soft,
      }}
    >
      <Text
        style={{
          color: ctaDisabled ? "rgba(255,255,255,0.75)" : colors.einsteinYellow,
          fontSize: typography.titleMd.fontSize,
        }}
        weight="bold"
      >
        {ctaLabel}
      </Text>
    </Pressable>
  );
}
