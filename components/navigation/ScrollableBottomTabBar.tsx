import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import { Text } from "../ui/Text";

type TabMeta = {
  label: string;
  icon: string;
};

const TAB_META: Record<string, TabMeta> = {
  dashboard: { label: "Inicio", icon: "⌂" },
  mensagens: { label: "Mensagens", icon: "✉" },
  olimpiadas: { label: "Olimpiadas", icon: "🏆" },
  "lab-games": { label: "Lab Games", icon: "◈" },
  planos: { label: "Planos", icon: "💳" },
  "xps-conquitados": { label: "XP", icon: "✦" },
  ranking: { label: "Ranking", icon: "◔" },
  mural: { label: "Mural", icon: "◌" },
  perfil: { label: "Perfil", icon: "◉" },
  feed: { label: "Feed", icon: "▦" },
};

export default function ScrollableBottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(8, insets.bottom);
  const visibleRoutes = state.routes.filter((route) => descriptors[route.key]?.options?.href !== null);

  return (
    <View
      style={{
        borderTopColor: "rgba(255,199,0,0.30)",
        borderTopWidth: 1,
        backgroundColor: colors.surfacePanel,
        paddingBottom: bottomPadding,
        paddingTop: 8,
      }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.sm, gap: spacing.xs }}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const isFocused = state.routes[state.index]?.key === route.key;
          const meta = TAB_META[route.name] ?? { label: route.name, icon: "•" };

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const tabLabelFromOptions =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : meta.label;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                {
                  minHeight: 48,
                  minWidth: 92,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: isFocused ? "rgba(255,199,0,0.45)" : "rgba(255,255,255,0.10)",
                  backgroundColor: isFocused ? "rgba(255,199,0,0.12)" : "rgba(255,255,255,0.03)",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: spacing.sm,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
            >
              <Text style={{ color: isFocused ? colors.einsteinYellow : "rgba(255,255,255,0.74)", fontSize: 16 }} weight="bold">
                {meta.icon}
              </Text>
              <Text
                style={{
                  color: isFocused ? colors.einsteinYellow : "rgba(255,255,255,0.86)",
                  fontSize: typography.small.fontSize,
                  marginTop: 1,
                }}
                weight="semibold"
                numberOfLines={1}
              >
                {tabLabelFromOptions}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
