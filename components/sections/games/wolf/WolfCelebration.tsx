import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Platform, View } from "react-native";
import { colors, radii, spacing, typography } from "../../../../lib/theme/tokens";
import { Text } from "../../../ui/Text";

type Props = { answerText: string };

const PARTICLE_COUNT = 10;
const USE_NATIVE_DRIVER = Platform.OS !== "web";
const ENABLE_MOTION = true;

export default function WolfCelebration({ answerText }: Props) {
  const wolfFloat = useRef(new Animated.Value(0)).current;
  const wolfTilt = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.64)).current;
  const wolfScale = useRef(new Animated.Value(0.86)).current;
  const ringPulse = useRef(new Animated.Value(0.82)).current;
  const eyeBlink = useRef(new Animated.Value(1)).current;
  const particleProgress = useRef(Array.from({ length: PARTICLE_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (!ENABLE_MOTION) {
      wolfFloat.setValue(1);
      wolfTilt.setValue(0);
      glowPulse.setValue(0.9);
      wolfScale.setValue(1);
      ringPulse.setValue(1);
      eyeBlink.setValue(1);
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
        Animated.spring(wolfFloat, {
          toValue: 1,
          friction: 4.6,
          tension: 150,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(wolfFloat, {
              toValue: 0.75,
              duration: 520,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(wolfFloat, {
              toValue: 1,
              duration: 520,
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
            duration: 600,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.62,
            duration: 640,
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
                duration: 900,
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
            duration: 700,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(wolfScale, {
            toValue: 1,
            duration: 700,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.delay(1600),
          Animated.timing(eyeBlink, {
            toValue: 0.18,
            duration: 90,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(eyeBlink, {
            toValue: 1,
            duration: 110,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ),
    ]);

    celebration.start();

    return () => {
      celebration.stop();
      glowPulse.stopAnimation();
      eyeBlink.stopAnimation();
    };
  }, [eyeBlink, glowPulse, particleProgress, ringPulse, wolfFloat, wolfScale, wolfTilt]);

  return (
    <View style={{ marginTop: spacing.sm }}>
      <LinearGradient colors={["rgba(6,18,62,0.97)", "rgba(7,48,112,0.9)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cardStyle}>
        <View style={mascotWrapStyle}>
          <Animated.View
            pointerEvents="none"
            style={[
              ringStyle,
              {
                transform: [{ scale: ringPulse }],
                opacity: glowPulse.interpolate({ inputRange: [0.62, 1], outputRange: [0.22, 0.54] }),
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              glowHaloStyle,
              {
                transform: [{ scale: glowPulse.interpolate({ inputRange: [0.62, 1], outputRange: [0.9, 1.26] }) }],
                opacity: glowPulse.interpolate({ inputRange: [0.62, 1], outputRange: [0.18, 0.52] }),
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
                          outputRange: [14, -74 - idx * 3],
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
                      outputRange: [0, 0.78, 0],
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
                  translateY: wolfFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, -10],
                  }),
                },
                {
                  rotate: wolfTilt.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ["-7deg", "0deg", "7deg"],
                  }),
                },
                { scale: wolfScale },
              ],
            }}
          >
            <View style={wolfHeadStyle}>
              <View style={[wolfEarStyle, wolfEarLeftStyle]}>
                <View style={wolfEarInnerStyle} />
              </View>
              <View style={[wolfEarStyle, wolfEarRightStyle]}>
                <View style={wolfEarInnerStyle} />
              </View>

              <View style={wolfForeheadMarkStyle} />

              <Animated.View style={[wolfEyeStyle, wolfEyeLeftStyle, { transform: [{ scaleY: eyeBlink }] }]}>
                <View style={wolfEyeSparkStyle} />
              </Animated.View>
              <Animated.View style={[wolfEyeStyle, wolfEyeRightStyle, { transform: [{ scaleY: eyeBlink }] }]}>
                <View style={wolfEyeSparkStyle} />
              </Animated.View>

              <View style={wolfMuzzleStyle}>
                <View style={wolfNoseStyle} />
                <View style={wolfMouthBridgeStyle} />
                <View style={wolfSmileDotStyle} />
              </View>
            </View>
          </Animated.View>
        </View>

        <Text style={{ color: "#dbe9ff", fontSize: typography.small.fontSize, lineHeight: 20 }} weight="bold">
          Resposta correta: {answerText}
        </Text>
      </LinearGradient>
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: "rgba(96,165,250,0.44)",
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
  width: 154,
  height: 154,
  borderRadius: 77,
  borderWidth: 1.5,
  borderColor: "rgba(56,189,248,0.50)",
  backgroundColor: "rgba(56,189,248,0.08)",
};

const glowHaloStyle = {
  position: "absolute" as const,
  width: 130,
  height: 130,
  borderRadius: 65,
  backgroundColor: "rgba(59,130,246,0.26)",
};

const wolfHeadStyle = {
  width: 118,
  height: 110,
  borderRadius: 56,
  backgroundColor: "#2f7bff",
  borderWidth: 2,
  borderColor: "rgba(191,219,254,0.9)",
  shadowColor: "#38bdf8",
  shadowOpacity: 0.45,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const wolfEarStyle = {
  position: "absolute" as const,
  top: -14,
  width: 34,
  height: 34,
  borderRadius: 16,
  backgroundColor: "#2563eb",
  borderWidth: 2,
  borderColor: "rgba(191,219,254,0.88)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const wolfEarLeftStyle = {
  left: 12,
  transform: [{ rotate: "-18deg" }],
};

const wolfEarRightStyle = {
  right: 12,
  transform: [{ rotate: "18deg" }],
};

const wolfEarInnerStyle = {
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: "#7dd3fc",
};

const wolfForeheadMarkStyle = {
  position: "absolute" as const,
  top: 16,
  width: 26,
  height: 14,
  borderRadius: 8,
  backgroundColor: "rgba(186,230,253,0.72)",
};

const wolfEyeStyle = {
  position: "absolute" as const,
  top: 40,
  width: 16,
  height: 12,
  borderRadius: 6,
  backgroundColor: "#082f49",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const wolfEyeLeftStyle = { left: 28 };
const wolfEyeRightStyle = { right: 28 };

const wolfEyeSparkStyle = {
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: "#f0f9ff",
};

const wolfMuzzleStyle = {
  position: "absolute" as const,
  bottom: 15,
  width: 58,
  height: 34,
  borderRadius: 17,
  backgroundColor: "#bfdbfe",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const wolfNoseStyle = {
  width: 14,
  height: 10,
  borderRadius: 5,
  backgroundColor: "#1e3a8a",
};

const wolfMouthBridgeStyle = {
  marginTop: 3,
  width: 2,
  height: 7,
  borderRadius: 2,
  backgroundColor: "#1e3a8a",
};

const wolfSmileDotStyle = {
  marginTop: 2,
  width: 12,
  height: 4,
  borderRadius: 999,
  backgroundColor: "rgba(30,58,138,0.8)",
};

const particleStyle = {
  position: "absolute" as const,
  width: 9,
  height: 9,
  borderRadius: 999,
  backgroundColor: "rgba(125,211,252,0.95)",
};

