import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Image, Platform, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = {
  answerText: string;
};

const PARTICLE_COUNT = 8;
const USE_NATIVE_DRIVER = Platform.OS !== "web";
const ENABLE_MOTION = true;
const WOLF_MASCOT = require("../../../../assets/wolf-silver.png");

export default function WolfCelebration({ answerText }: Props) {
  const wolfJump = useRef(new Animated.Value(0)).current;
  const wolfTilt = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.6)).current;
  const wolfScale = useRef(new Animated.Value(0.86)).current;
  const ringPulse = useRef(new Animated.Value(0.8)).current;
  const particleProgress = useRef(Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!ENABLE_MOTION) {
      wolfJump.setValue(0.6);
      wolfTilt.setValue(0);
      glowPulse.setValue(0.82);
      wolfScale.setValue(1);
      ringPulse.setValue(1);
      particleProgress.forEach((particle) => particle.setValue(1));
      return;
    }

    const celebration = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(wolfTilt, {
            toValue: 1,
            duration: 360,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(wolfTilt, {
            toValue: -1,
            duration: 620,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(wolfTilt, {
            toValue: 0,
            duration: 320,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
      Animated.sequence([
        Animated.spring(wolfJump, {
          toValue: 1,
          friction: 4.2,
          tension: 160,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(wolfJump, {
              toValue: 0.75,
              duration: 460,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(wolfJump, {
              toValue: 1,
              duration: 460,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
        ),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulse, {
            toValue: 1.05,
            duration: 520,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(ringPulse, {
            toValue: 0.84,
            duration: 620,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 520,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.6,
            duration: 560,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
      Animated.sequence([
        Animated.spring(wolfScale, {
          toValue: 1.08,
          friction: 5.5,
          tension: 150,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wolfScale, {
          toValue: 1,
          duration: 280,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.stagger(
        72,
        particleProgress.map((particle) =>
          Animated.loop(
            Animated.sequence([
              Animated.timing(particle, {
                toValue: 1,
                duration: 780,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.timing(particle, {
                toValue: 0,
                duration: 0,
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ]),
          ),
        ),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(wolfScale, {
            toValue: 1.03,
            duration: 640,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(wolfScale, {
            toValue: 1,
            duration: 640,
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
  }, [glowPulse, particleProgress, ringPulse, wolfJump, wolfScale, wolfTilt]);

  return (
    <View style={{ marginTop: spacing.sm }}>
      <LinearGradient colors={["rgba(15,23,64,0.95)", "rgba(9,45,78,0.65)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyle}>
        <View style={mascotWrapStyle}>
          <Animated.View
            pointerEvents="none"
            style={[
              ringStyle,
              {
                transform: [{ scale: ringPulse }],
                opacity: glowPulse.interpolate({ inputRange: [0.6, 1], outputRange: [0.28, 0.58] }),
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              glowHaloStyle,
              {
                transform: [{ scale: glowPulse.interpolate({ inputRange: [0.6, 1], outputRange: [0.92, 1.28] }) }],
                opacity: glowPulse.interpolate({ inputRange: [0.6, 1], outputRange: [0.2, 0.56] }),
              },
            ]}
          />
          {particleProgress.map((particle, idx) => {
            const xDirection = idx % 2 === 0 ? -1 : 1;
            const horizontalOffset = 14 + (idx % 4) * 13;
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
                          outputRange: [16, -70 - idx * 4],
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
                          outputRange: [0.58, 1.18],
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
                  translateY: wolfJump.interpolate({
                    inputRange: [0, 1],
                    outputRange: [9, -11],
                  }),
                },
                {
                  rotate: wolfTilt.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ["-9deg", "0deg", "8deg"],
                  }),
                },
                { scale: wolfScale },
              ],
            }}
          >
            <Image source={WOLF_MASCOT} style={wolfImageStyle} resizeMode="contain" />
          </Animated.View>
        </View>

        <Text style={{ color: "#d9ffe7", fontSize: typography.small.fontSize, lineHeight: 20 }} weight="bold">
          Resposta correta: {answerText}
        </Text>
      </LinearGradient>
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: "rgba(255,199,0,0.34)",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  overflow: "hidden" as const,
};

const mascotWrapStyle = {
  alignItems: "center" as const,
  justifyContent: "center" as const,
  minHeight: 132,
  marginBottom: spacing.xs,
  overflow: "hidden" as const,
};

const ringStyle = {
  position: "absolute" as const,
  width: 152,
  height: 152,
  borderRadius: 76,
  borderWidth: 1.5,
  borderColor: "rgba(255,199,0,0.50)",
  backgroundColor: "rgba(255,199,0,0.06)",
};

const glowHaloStyle = {
  position: "absolute" as const,
  width: 130,
  height: 130,
  borderRadius: 65,
  backgroundColor: "rgba(56,189,248,0.26)",
};

const wolfImageStyle = {
  width: 118,
  height: 118,
  shadowColor: colors.goldBase,
  shadowOpacity: 0.42,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 4 },
};

const particleStyle = {
  position: "absolute" as const,
  width: 9,
  height: 9,
  borderRadius: 999,
  backgroundColor: "rgba(255,215,91,0.95)",
};

