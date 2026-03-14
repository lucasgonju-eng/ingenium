import { LinearGradient } from "expo-linear-gradient";
import { router, useNavigation, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AvatarWithFallback from "../ui/AvatarWithFallback";
import { Text } from "../ui/Text";
import { supabase } from "../../lib/supabase/client";
import { fetchMyProfile } from "../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type Props = {
  children: React.ReactNode;
  maxWidth?: number;
};

export default function StitchScreenFrame({ children, maxWidth = 430 }: Props) {
  const navigation = useNavigation();
  const contentWidthStyle = Platform.OS === "web" ? { width: "100%" as const, maxWidth, flex: 1 } : { width: "100%" as const, flex: 1 };
  const canGoBack = navigation.canGoBack();
  const pathname = usePathname();
  const logoSize = 82;
  const logoBottomSpacing = spacing.xs;
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullName, setFullName] = useState("Aluno");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isMarketingHome = pathname === "/" || pathname === "/(marketing)";

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          const message = String(userError.message ?? "").toLowerCase();
          if (message.includes("user from sub claim in jwt does not exist")) {
            await supabase.auth.signOut({ scope: "local" });
            if (!mounted) return;
            setIsAuthenticated(false);
            setFullName("Aluno");
            setAvatarUrl(null);
            return;
          }
          throw userError;
        }
        const user = userData.user ?? null;
        if (!mounted) return;

        if (!user) {
          setIsAuthenticated(false);
          setFullName("Aluno");
          setAvatarUrl(null);
          return;
        }

        setIsAuthenticated(true);
        const fallbackName =
          String(user.user_metadata?.full_name ?? "").trim() ||
          user.email?.split("@")[0] ||
          "Aluno";
        setFullName(fallbackName);

        try {
          const profile = await fetchMyProfile(user.id);
          if (!mounted) return;
          setFullName(profile?.full_name?.trim() || fallbackName);
          setAvatarUrl(profile?.avatar_url ?? null);
        } catch {
          if (!mounted) return;
          setAvatarUrl(null);
        }
      } catch {
        if (!mounted) return;
        setIsAuthenticated(false);
        setFullName("Aluno");
        setAvatarUrl(null);
      }
    }

    void loadProfile();
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  function handleBack() {
    if (canGoBack) {
      router.back();
      return;
    }
    router.replace("/(marketing)");
  }

  function handleOpenProfile() {
    setMenuOpen(false);
    router.push("/(tabs)/perfil");
  }

  async function handleSignOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/(marketing)");
  }

  return (
    <LinearGradient
      colors={[colors.bgCanvas, colors.bgStart, colors.bgMid, colors.bgEnd]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={{ flex: 1 }}
    >
      <View pointerEvents="none" style={depthBackgroundStyle}>
        <View style={depthOrbTopStyle} />
        <View style={depthOrbCenterStyle} />
        <View style={depthOrbBottomStyle} />
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View
            style={{
              width: "100%",
              alignItems: "center",
              height: logoSize + spacing.sm + logoBottomSpacing,
              justifyContent: "flex-end",
              marginBottom: logoBottomSpacing,
            }}
          >
            <View style={logoPlateStyle}>
              <Image source={require("../../assets/ingenium-logo.webp")} style={{ width: logoSize, height: logoSize }} resizeMode="contain" />
            </View>
          </View>
          {menuOpen ? <Pressable onPress={() => setMenuOpen(false)} style={StyleSheet.absoluteFillObject} /> : null}
          <View
            style={{
              position: "absolute",
              top: spacing.sm,
              zIndex: 30,
              width: "100%",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: Platform.OS === "web" ? maxWidth : undefined,
                paddingHorizontal: spacing.sm,
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              {isMarketingHome ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Pressable
                    onPress={() => router.push("/gestao/login")}
                    hitSlop={8}
                    style={({ pressed }) => [topChipStyle, pressed ? topChipPressedStyle : null]}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: typography.small.fontSize }} weight="semibold">
                      Gestão
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push("/professor/login")}
                    hitSlop={8}
                    style={({ pressed }) => [topChipStyle, pressed ? topChipPressedStyle : null]}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: typography.small.fontSize }} weight="semibold">
                      Professores
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleBack}
                  hitSlop={8}
                  style={({ pressed }) => [topChipStyle, pressed ? topChipPressedStyle : null]}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: typography.small.fontSize }} weight="semibold">
                    ← Voltar
                  </Text>
                </Pressable>
              )}

              <View style={{ alignItems: "flex-end" }}>
                {isMarketingHome ? (
                  <Pressable
                    onPress={() => router.push("/admin/login")}
                    style={{
                      height: 18,
                      paddingHorizontal: 2,
                      marginBottom: spacing.xxs,
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.22)", fontSize: 10 }} weight="semibold">
                      admin
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setMenuOpen((prev) => !prev)}
                  hitSlop={8}
                  style={({ pressed }) => [avatarButtonStyle, pressed ? avatarButtonPressedStyle : null]}
                >
                  <AvatarWithFallback fullName={fullName} avatarUrl={avatarUrl} size={32} />
                </Pressable>

                {menuOpen ? (
                  <View
                    style={{
                      marginTop: 6,
                      minWidth: 132,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderDefault,
                      backgroundColor: colors.surfaceGlass,
                      ...shallowPanelShadow,
                      overflow: "hidden",
                    }}
                  >
                    {isAuthenticated ? (
                      <>
                        <Pressable
                          onPress={handleOpenProfile}
                          style={{
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.sm,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.borderDefault,
                          }}
                        >
                          <Text style={{ color: colors.textPrimary }} weight="semibold">
                            Perfil
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            void handleSignOut();
                          }}
                          style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }}
                        >
                          <Text style={{ color: colors.textSecondary }} weight="semibold">
                            Sair
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setMenuOpen(false);
                          router.replace("/(auth)/login");
                        }}
                        style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }}
                      >
                        <Text style={{ color: colors.textPrimary }} weight="semibold">
                          Entrar
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <View style={contentWidthStyle}>{children}</View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const depthBackgroundStyle = {
  ...StyleSheet.absoluteFillObject,
  overflow: "hidden" as const,
};

const depthOrbTopStyle = {
  position: "absolute" as const,
  top: -120,
  right: -80,
  width: 300,
  height: 300,
  borderRadius: 300,
  backgroundColor: "rgba(255,199,0,0.10)",
};

const depthOrbCenterStyle = {
  position: "absolute" as const,
  top: 220,
  left: -120,
  width: 320,
  height: 320,
  borderRadius: 320,
  backgroundColor: "rgba(59,130,246,0.10)",
};

const depthOrbBottomStyle = {
  position: "absolute" as const,
  bottom: -140,
  right: -100,
  width: 330,
  height: 330,
  borderRadius: 330,
  backgroundColor: "rgba(120,111,255,0.09)",
};

const logoPlateStyle = {
  width: 102,
  height: 102,
  borderRadius: radii.xxl,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.03)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: "#020617",
  shadowOpacity: 0.36,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

const topChipStyle = {
  minHeight: 36,
  borderRadius: radii.pill,
  paddingHorizontal: spacing.sm,
  backgroundColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.18)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const topChipPressedStyle = {
  backgroundColor: "rgba(255,255,255,0.16)",
  transform: [{ scale: 0.98 }],
};

const avatarButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.24)",
  backgroundColor: "rgba(255,255,255,0.10)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const avatarButtonPressedStyle = {
  backgroundColor: "rgba(255,255,255,0.16)",
  transform: [{ scale: 0.98 }],
};

const shallowPanelShadow = {
  shadowColor: "#020617",
  shadowOpacity: 0.28,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
};
