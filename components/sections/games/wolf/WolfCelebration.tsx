import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Platform, View } from "react-native";
import { radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = { answerText: string };

const FIREWORK_COLORS = ["#fbbf24", "#f59e0b", "#fde68a", "#67e8f9", "#c4b5fd", "#fca5a5"] as const;
const FIREWORK_VECTORS = [
  { x: 0, y: -64 },
  { x: 30, y: -56 },
  { x: 52, y: -24 },
  { x: 60, y: 0 },
  { x: 50, y: 28 },
  { x: 24, y: 52 },
  { x: 0, y: 62 },
  { x: -22, y: 54 },
  { x: -48, y: 30 },
  { x: -60, y: 0 },
  { x: -52, y: -26 },
  { x: -28, y: -54 },
] as const;
const USE_NATIVE_DRIVER = Platform.OS !== "web";
const ENABLE_MOTION = true;

export default function WolfCelebration({ answerText }: Props) {
  const burstProgress = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!ENABLE_MOTION) {
      burstProgress.setValue(1);
      glowPulse.setValue(0.9);
      return;
    }

    const celebration = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(burstProgress, {
            toValue: 1,
            duration: 860,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.delay(120),
          Animated.timing(burstProgress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 480,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.56,
            duration: 520,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
    ]);

    celebration.start();

    return () => {
      celebration.stop();
      glowPulse.stopAnimation();
    };
  }, [burstProgress, glowPulse]);

  return (
    <View style={{ marginTop: spacing.sm }}>
      <LinearGradient colors={["rgba(14,20,54,0.98)", "rgba(25,42,88,0.9)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyle}>
        <View style={fireworksWrapStyle}>
          <Animated.View
            pointerEvents="none"
            style={[
              fireworkHaloOuterStyle,
              {
                transform: [{ scale: glowPulse.interpolate({ inputRange: [0.55, 1], outputRange: [0.9, 1.34] }) }],
                opacity: glowPulse.interpolate({ inputRange: [0.55, 1], outputRange: [0.18, 0.46] }),
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              fireworkHaloInnerStyle,
              {
                transform: [{ scale: glowPulse.interpolate({ inputRange: [0.55, 1], outputRange: [0.88, 1.22] }) }],
                opacity: glowPulse.interpolate({ inputRange: [0.55, 1], outputRange: [0.12, 0.4] }),
              },
            ]}
          />

          {FIREWORK_VECTORS.map((vector, idx) => {
            const color = FIREWORK_COLORS[idx % FIREWORK_COLORS.length];
            return (
              <Animated.View
                key={`spark-primary-${idx}`}
                pointerEvents="none"
                style={[
                  sparkStyle,
                  { backgroundColor: color },
                  {
                    transform: [
                      {
                        translateX: burstProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, vector.x],
                        }),
                      },
                      {
                        translateY: burstProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, vector.y],
                        }),
                      },
                      {
                        scale: burstProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1],
                        }),
                      },
                    ],
                    opacity: burstProgress.interpolate({
                      inputRange: [0, 0.08, 0.84, 1],
                      outputRange: [0, 1, 0.8, 0],
                    }),
                  },
                ]}
              />
            );
          })}

          {FIREWORK_VECTORS.map((vector, idx) => {
            const color = FIREWORK_COLORS[(idx + 3) % FIREWORK_COLORS.length];
            return (
              <Animated.View
                key={`spark-secondary-${idx}`}
                pointerEvents="none"
                style={[
                  sparkSecondaryStyle,
                  { backgroundColor: color },
                  {
                    transform: [
                      {
                        translateX: burstProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, vector.x * 0.62],
                        }),
                      },
                      {
                        translateY: burstProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, vector.y * 0.62],
                        }),
                      },
                      {
                        scale: burstProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.95],
                        }),
                      },
                    ],
                    opacity: burstProgress.interpolate({
                      inputRange: [0, 0.05, 0.74, 1],
                      outputRange: [0, 0.9, 0.6, 0],
                    }),
                  },
                ]}
              />
            );
          })}

          <Animated.View
            pointerEvents="none"
            style={[
              burstCoreStyle,
              {
                transform: [{ scale: burstProgress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.16] }) }],
                opacity: burstProgress.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 1, 0] }),
              },
            ]}
          >
            <View style={burstCoreDotStyle} />
          </Animated.View>
        </View>

        <Text style={{ color: "#e6edff", fontSize: typography.small.fontSize, lineHeight: 20 }} weight="bold">
          Resposta correta: {answerText}
        </Text>
      </LinearGradient>
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: "rgba(129,140,248,0.44)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  overflow: "hidden" as const,
};

const fireworksWrapStyle = {
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 138,
  marginBottom: spacing.xs,
  overflow: "hidden" as const,
};

const fireworkHaloOuterStyle = {
  position: "absolute" as const,
  width: 156,
  height: 156,
  borderRadius: 78,
  backgroundColor: "rgba(99,102,241,0.16)",
};

const fireworkHaloInnerStyle = {
  position: "absolute" as const,
  width: 114,
  height: 114,
  borderRadius: 57,
  backgroundColor: "rgba(251,191,36,0.14)",
};

const sparkStyle = {
  position: "absolute" as const,
  width: 6,
  height: 10,
  borderRadius: 999,
};

const sparkSecondaryStyle = {
  position: "absolute" as const,
  width: 4,
  height: 7,
  borderRadius: 999,
};

const burstCoreStyle = {
  width: 42,
  height: 42,
  borderRadius: 999,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const burstCoreDotStyle = {
  width: 18,
  height: 18,
  borderRadius: 999,
  backgroundColor: "rgba(254,240,138,0.94)",
};

