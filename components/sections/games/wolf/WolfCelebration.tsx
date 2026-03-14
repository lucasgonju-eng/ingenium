import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Platform, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = {
  answerText: string;
};

const PARTICLE_COUNT = 8;
const USE_NATIVE_DRIVER = Platform.OS !== "web";

export default function WolfCelebration({ answerText }: Props) {
  const wolfBounce = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;
  const howlScale = useRef(new Animated.Value(0.85)).current;
  const particleProgress = useRef(Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const celebration = Animated.parallel([
      Animated.sequence([
        Animated.spring(wolfBounce, {
          toValue: 1,
          friction: 5,
          tension: 130,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wolfBounce, {
          toValue: 0.7,
          duration: 340,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 560,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.55,
            duration: 560,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
      Animated.sequence([
        Animated.timing(howlScale, {
          toValue: 1.06,
          duration: 200,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(howlScale, {
          toValue: 1,
          duration: 260,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.stagger(
        60,
        particleProgress.map((particle) =>
          Animated.timing(particle, {
            toValue: 1,
            duration: 740,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ),
      ),
    ]);

    celebration.start();

    return () => {
      celebration.stop();
      glowPulse.stopAnimation();
    };
  }, [glowPulse, howlScale, particleProgress, wolfBounce]);

  return (
    <View style={{ marginTop: spacing.sm }}>
      <LinearGradient colors={["rgba(16,185,129,0.22)", "rgba(10,86,61,0.16)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyle}>
        <View style={mascotWrapStyle}>
          <Animated.View
            pointerEvents="none"
            style={[
              glowHaloStyle,
              {
                transform: [{ scale: glowPulse.interpolate({ inputRange: [0.5, 1], outputRange: [0.88, 1.22] }) }],
                opacity: glowPulse.interpolate({ inputRange: [0.5, 1], outputRange: [0.25, 0.55] }),
              },
            ]}
          />

          {particleProgress.map((particle, idx) => {
            const xDirection = idx % 2 === 0 ? -1 : 1;
            const horizontalOffset = 12 + (idx % 4) * 10;
            return (
              <Animated.View
                key={`wolf-particle-${idx}`}
                pointerEvents="none"
                style={[
                  particleStyle,
                  {
                    transform: [
                      {
                        translateY: particle.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, -64 - idx * 2],
                        }),
                      },
                      {
                        translateX: particle.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, xDirection * horizontalOffset],
                        }),
                      },
                      {
                        scale: particle.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 1.1],
                        }),
                      },
                    ],
                    opacity: particle.interpolate({
                      inputRange: [0, 0.85, 1],
                      outputRange: [0, 0.9, 0],
                    }),
                  },
                ]}
              />
            );
          })}

          <Animated.View
            style={{
              transform: [
                {
                  translateY: wolfBounce.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, -6],
                  }),
                },
                { scale: howlScale },
              ],
            }}
          >
            <Text style={wolfEmojiStyle} weight="bold">
              🐺
            </Text>
          </Animated.View>
        </View>

        <Text style={{ color: "#d9ffe7", fontSize: typography.small.fontSize }} weight="bold">
          Acerto confirmado. Lobo em celebração.
        </Text>
        <Text style={{ color: "#e7fff3", marginTop: 4, lineHeight: 20 }} weight="semibold">
          Resposta correta: {answerText}
        </Text>
      </LinearGradient>
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: "rgba(74,222,128,0.58)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  overflow: "hidden" as const,
};

const mascotWrapStyle = {
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 96,
  marginBottom: spacing.xs,
};

const glowHaloStyle = {
  position: "absolute" as const,
  width: 104,
  height: 104,
  borderRadius: 52,
  backgroundColor: "rgba(52,211,153,0.32)",
};

const wolfEmojiStyle = {
  fontSize: 58,
  textShadowColor: "rgba(16,185,129,0.45)",
  textShadowRadius: 14,
};

const particleStyle = {
  position: "absolute" as const,
  width: 8,
  height: 8,
  borderRadius: 999,
  backgroundColor: "#86efac",
};

