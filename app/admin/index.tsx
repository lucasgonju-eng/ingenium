import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import {
  fetchMyAccessRole,
  fetchRankingAllRegisteredStudents,
  fetchRegisteredStudents,
  type RankingStudentRow,
  type RegisteredStudentRow,
} from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type AdminTab = "dashboard" | "alunos" | "gtm";
const ADMIN_TABS: Array<{ key: AdminTab; label: string }> = [
  { key: "dashboard", label: "Visão geral" },
  { key: "alunos", label: "Alunos" },
  { key: "gtm", label: "GTM" },
];

const GRADE_ORDER = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [students, setStudents] = useState<RegisteredStudentRow[]>([]);
  const [rankingRows, setRankingRows] = useState<RankingStudentRow[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadAdminData() {
      try {
        setLoading(true);
        setErrorText(null);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/admin/login");
          return;
        }

        const mustChange = Boolean(user.user_metadata?.admin_must_change_password);
        setMustChangePassword(mustChange);

        const role = await fetchMyAccessRole();
        if (role !== "admin" && role !== "coord") {
          if (!mounted) return;
          setAuthorized(false);
          setErrorText("Acesso restrito. Entre com uma conta administradora.");
          return;
        }

        const [studentsData, rankingData] = await Promise.all([
          fetchRegisteredStudents(),
          fetchRankingAllRegisteredStudents(500),
        ]);
        if (!mounted) return;
        setAuthorized(true);
        setStudents(studentsData);
        setRankingRows(rankingData);
      } catch (e: unknown) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : "Falha ao carregar dashboard admin.";
        setErrorText(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadAdminData();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleChangePasswordNow() {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Campos obrigatórios", "Preencha senha e confirmação.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Senha fraca", "Use pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Confirmação inválida", "A confirmação da senha não confere.");
      return;
    }

    try {
      setSavingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { admin_must_change_password: false },
      });
      if (error) {
        Alert.alert("Erro", error.message);
        return;
      }
      setMustChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Senha atualizada", "A nova senha foi salva com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao atualizar senha.";
      Alert.alert("Erro", message);
    } finally {
      setSavingPassword(false);
    }
  }

  const kpis = useMemo(() => {
    const totalStudents = students.length;
    const totalXp = rankingRows.reduce((sum, row) => sum + Number(row.total_points || 0), 0);
    const avgXp = totalStudents > 0 ? Math.round(totalXp / totalStudents) : 0;
    const withXp = rankingRows.filter((row) => Number(row.total_points || 0) > 0).length;
    return { totalStudents, totalXp, avgXp, withXp };
  }, [students, rankingRows]);

  const seriesSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      const grade = (student.grade ?? "Sem série").trim() || "Sem série";
      map.set(grade, (map.get(grade) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => {
        const ai = GRADE_ORDER.indexOf(a[0] as (typeof GRADE_ORDER)[number]);
        const bi = GRADE_ORDER.indexOf(b[0] as (typeof GRADE_ORDER)[number]);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        return a[0].localeCompare(b[0], "pt-BR");
      })
      .map(([grade, count]) => ({ grade, count }));
  }, [students]);

  const loboSummary = useMemo(() => {
    const counters = { gold: 0, silver: 0, bronze: 0 };
    for (const row of rankingRows) {
      if (row.lobo_class === "gold") counters.gold += 1;
      else if (row.lobo_class === "silver") counters.silver += 1;
      else counters.bronze += 1;
    }
    return counters;
  }, [rankingRows]);

  const topStudents = useMemo(() => rankingRows.slice(0, 10), [rankingRows]);

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Admin" subtitle="Painel estratégico de alunos" variant="feed" />
        </View>

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            {ADMIN_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: active ? "rgba(255,199,0,0.45)" : colors.borderSoft,
                    backgroundColor: active ? "rgba(255,199,0,0.16)" : "rgba(255,255,255,0.04)",
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={{ marginTop: spacing.lg, alignItems: "center" }}>
            <ActivityIndicator color={colors.einsteinYellow} />
          </View>
        ) : !authorized ? (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
            <View
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
                Acesso restrito
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.xs, lineHeight: 20 }}>
                {errorText ?? "Faça login com usuário admin/coordenador para acessar este painel."}
              </Text>
              <Pressable
                onPress={() => router.replace("/admin/login")}
                style={{
                  marginTop: spacing.sm,
                  height: 44,
                  borderRadius: radii.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.einsteinYellow,
                }}
              >
                <Text style={{ color: colors.einsteinBlue }} weight="bold">
                  Entrar como admin
                </Text>
              </Pressable>
            </View>
          </View>
        ) : mustChangePassword ? (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
            <View
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.45)",
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: colors.white, fontSize: typography.subtitle.fontSize }} weight="bold">
                Primeiro acesso do admin
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, lineHeight: 20 }}>
                Defina sua senha agora para liberar o dashboard administrativo.
              </Text>

              <TextInput
                placeholder="Nova senha"
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                style={{
                  marginTop: spacing.sm,
                  height: 46,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: colors.white,
                  paddingHorizontal: spacing.sm,
                  fontFamily: typography.fontFamily.base,
                }}
              />
              <TextInput
                placeholder="Confirmar senha"
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={{
                  marginTop: spacing.xs,
                  height: 46,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  color: colors.white,
                  paddingHorizontal: spacing.sm,
                  fontFamily: typography.fontFamily.base,
                }}
              />
              <Pressable
                onPress={() => {
                  void handleChangePasswordNow();
                }}
                disabled={savingPassword}
                style={{
                  marginTop: spacing.md,
                  height: 46,
                  borderRadius: radii.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.einsteinYellow,
                  opacity: savingPassword ? 0.7 : 1,
                }}
              >
                <Text style={{ color: colors.einsteinBlue }} weight="bold">
                  {savingPassword ? "Salvando..." : "Salvar senha e continuar"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm, gap: spacing.sm }}>
            {activeTab === "dashboard" ? (
              <>
                <View
                  style={{
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: colors.surfacePanel,
                    padding: spacing.md,
                  }}
                >
                  <Text style={{ color: colors.white }} weight="bold">
                    KPIs principais
                  </Text>
                  <View style={{ marginTop: spacing.sm, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    {[
                      { label: "Alunos cadastrados", value: kpis.totalStudents.toLocaleString("pt-BR") },
                      { label: "Alunos com XP", value: kpis.withXp.toLocaleString("pt-BR") },
                      { label: "XP total", value: kpis.totalXp.toLocaleString("pt-BR") },
                      { label: "Média XP/aluno", value: kpis.avgXp.toLocaleString("pt-BR") },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          minWidth: 150,
                          flexGrow: 1,
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.borderSoft,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: spacing.sm,
                        }}
                      >
                        <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>{item.label}</Text>
                        <Text style={{ color: colors.einsteinYellow, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
                          {item.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View
                  style={{
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: colors.surfacePanel,
                    padding: spacing.md,
                  }}
                >
                  <Text style={{ color: colors.white }} weight="bold">
                    Distribuição por classe Lobo
                  </Text>
                  <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
                    {[
                      { label: "Ouro", value: loboSummary.gold, color: "#facc15" },
                      { label: "Prata", value: loboSummary.silver, color: "#d1d5db" },
                      { label: "Bronze", value: loboSummary.bronze, color: "#d97706" },
                    ].map((item) => (
                      <View
                        key={item.label}
                        style={{
                          flex: 1,
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.borderSoft,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: spacing.sm,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: item.color }} weight="bold">
                          {item.label}
                        </Text>
                        <Text style={{ color: colors.white, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
                          {item.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            {activeTab === "alunos" ? (
              <>
                <View
                  style={{
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: colors.surfacePanel,
                    padding: spacing.md,
                  }}
                >
                  <Text style={{ color: colors.white }} weight="bold">
                    Alunos por série
                  </Text>
                  <View style={{ marginTop: spacing.sm, gap: 8 }}>
                    {seriesSummary.map((row) => (
                      <View key={row.grade} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: "rgba(255,255,255,0.86)" }} weight="semibold">
                          {row.grade}
                        </Text>
                        <Text style={{ color: colors.einsteinYellow }} weight="bold">
                          {row.count}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View
                  style={{
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: colors.surfacePanel,
                    padding: spacing.md,
                  }}
                >
                  <Text style={{ color: colors.white }} weight="bold">
                    Top 10 por XP
                  </Text>
                  <View style={{ marginTop: spacing.sm, gap: 8 }}>
                    {topStudents.map((row) => (
                      <View key={row.user_id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                        <Text style={{ color: "rgba(255,255,255,0.7)", width: 28 }} weight="bold">
                          {row.position}º
                        </Text>
                        <Text style={{ color: colors.white, flex: 1 }} weight="semibold">
                          {row.full_name ?? "Sem nome"}
                        </Text>
                        <Text style={{ color: colors.einsteinYellow }} weight="bold">
                          {row.total_points.toLocaleString("pt-BR")} XP
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            {activeTab === "gtm" ? (
              <View
                style={{
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfacePanel,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.white }} weight="bold">
                  GTM (preparação)
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: spacing.xs, lineHeight: 20 }}>
                  Estrutura pronta para futura configuração de eventos e conversões no Google Tag Manager.
                </Text>
                <View style={{ marginTop: spacing.sm, gap: 8 }}>
                  {[
                    "Evento: lp_view",
                    "Evento: signup_start",
                    "Evento: terms_accept",
                    "Evento: signup_submit",
                    "Evento: email_confirmed",
                    "Evento: first_login",
                  ].map((item) => (
                    <View
                      key={item}
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.borderSoft,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: "rgba(255,255,255,0.88)" }} weight="semibold">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </StitchScreenFrame>
  );
}
