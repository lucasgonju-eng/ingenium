import React, { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";

type AvatarWithFallbackProps = {
  fullName: string | null | undefined;
  avatarUrl?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
};

function getInitials(name: string | null | undefined) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "??";
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function AvatarWithFallback({
  fullName,
  avatarUrl,
  size = 40,
  backgroundColor = colors.avatarBg,
  textColor = colors.avatarText,
}: AvatarWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const initials = useMemo(() => getInitials(fullName), [fullName]);
  const showImage = Boolean(avatarUrl && !imageError);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <Text
          style={{
            color: textColor,
            fontWeight: "600",
            fontSize: Math.max(10, size * 0.38),
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const colors = {
  avatarBg: "#000066",
  avatarText: "#FFC700",
};
