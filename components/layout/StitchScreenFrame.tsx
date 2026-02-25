import { LinearGradient } from "expo-linear-gradient";
import { router, useNavigation, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AvatarWithFallback from "../ui/AvatarWithFallback";
import { Text } from "../ui/Text";
import { hasAcceptedLatestTerms } from "../../lib/legal/consent";
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
  const logoSize = 92;
  const logoBottomSpacing = 4;
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullName, setFullName] = useState("Aluno");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        const acceptedLatest = await hasAcceptedLatestTerms();
        if (!acceptedLatest && pathname !== "/(auth)/termos-lgpd") {
          router.replace("/(auth)/termos-lgpd");
          return;
        }
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
    <LinearGradient colors={[colors.bgStart, colors.bgMid, colors.bgEnd]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View
            style={{
              width: "100%",
              alignItems: "center",
              height: logoSize + logoBottomSpacing,
              justifyContent: "center",
              marginBottom: logoBottomSpacing,
            }}
          >
            <Image
              source={require("../../assets/ingenium-logo.webp")}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
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
              <Pressable
                onPress={handleBack}
                style={{
                  height: 34,
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing.sm,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.white, fontSize: typography.small.fontSize }} weight="semibold">
                  ← Voltar
                </Text>
              </Pressable>

              <View style={{ alignItems: "flex-end" }}>
                <Pressable
                  onPress={() => setMenuOpen((prev) => !prev)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
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
                      borderColor: colors.borderSoft,
                      backgroundColor: colors.surfacePanel,
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
                            borderBottomColor: colors.borderSoft,
                          }}
                        >
                          <Text style={{ color: colors.white }} weight="semibold">
                            Perfil
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            void handleSignOut();
                          }}
                          style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }}
                        >
                          <Text style={{ color: "rgba(255,255,255,0.92)" }} weight="semibold">
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
                        <Text style={{ color: colors.white }} weight="semibold">
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
