import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import {
  assignTeacherToOlympiad,
  createTeacher,
  deleteTeacher,
  fetchSaasAnalyticsOverview,
  fetchMyAccessRole,
  fetchRankingAllRegisteredStudents,
  fetchRegisteredStudentsFull,
  fetchTeachersWithOlympiads,
  sendTeacherMagicLink,
  removeTeacherAssignment,
  fetchOlympiads,
  type FullStudentRow,
  type RankingStudentRow,
  type SaasAnalyticsOverview,
  type TeacherRow,
} from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { trackEvent } from "../../lib/analytics/gtm";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import AdminCoreDashboard, { getAdminCoreTabs } from "../../components/admin/AdminCoreDashboard";

type AdminTab = ReturnType<typeof getAdminCoreTabs>[number]["key"] | "gtm";
const ADMIN_TABS: Array<{ key: AdminTab; label: string }> = [
  ...getAdminCoreTabs(),
  { key: "gtm", label: "GTM" },
];
type GtmObservedEvent = {
  event: string;
  eventTime: string | null;
  eventSource: "app" | "gtm";
  payloadPreview: string;
};

function getEventTimeFromDataLayerItem(item: Record<string, unknown>): string | null {
  if (typeof item.sent_at === "string" && item.sent_at.trim()) return item.sent_at;
  if (typeof item.event_at === "string" && item.event_at.trim()) return item.event_at;
  if (typeof item["gtm.start"] === "number") {
    try {
      return new Date(item["gtm.start"]).toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function summarizeDataLayerPayload(item: Record<string, unknown>): string {
  const ignoredKeys = new Set(["event", "gtm.uniqueEventId", "gtm.start"]);
  const preferredKeys = [
    "source",
    "screen",
    "path",
    "role",
    "user_id",
    "sent_at",
    "event_at",
    "locale",
    "app_version",
    "app_platform",
  ];
  const pieces: string[] = [];

  for (const key of preferredKeys) {
    if (ignoredKeys.has(key)) continue;
    const value = item[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      pieces.push(`${key}=${String(value)}`);
    }
  }

  if (pieces.length === 0) {
    const fallbackKeys = Object.keys(item).filter((key) => !ignoredKeys.has(key));
    for (const key of fallbackKeys.slice(0, 4)) {
      const value = item[key];
      if (value === null || value === undefined) continue;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        pieces.push(`${key}=${String(value)}`);
      }
    }
  }

  return pieces.length ? pieces.join(" | ") : "sem campos adicionais relevantes";
}

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [students, setStudents] = useState<FullStudentRow[]>([]);
  const [rankingRows, setRankingRows] = useState<RankingStudentRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [olympiads, setOlympiads] = useState<Array<{ id: string; title: string }>>([]);
  const [teacherFullName, setTeacherFullName] = useState("");
  const [teacherDisplayName, setTeacherDisplayName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherArea, setTeacherArea] = useState("");
  const [selectedCreateOlympiadId, setSelectedCreateOlympiadId] = useState("");
  const [teacherPendingOlympiadName, setTeacherPendingOlympiadName] = useState("");
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [olympiadSelectionByTeacher, setOlympiadSelectionByTeacher] = useState<Record<string, string>>({});
  const [errorText, setErrorText] = useState<string | null>(null);
  const [gtmConnected, setGtmConnected] = useState(false);
  const [gtmLastEventAt, setGtmLastEventAt] = useState<string | null>(null);
  const [gtmLastEventName, setGtmLastEventName] = useState<string | null>(null);
  const [gtmEventCount, setGtmEventCount] = useState(0);
  const [gtmRecentEvents, setGtmRecentEvents] = useState<GtmObservedEvent[]>([]);
  const [saasAnalytics, setSaasAnalytics] = useState<SaasAnalyticsOverview | null>(null);
  const [analyticsPeriodDays, setAnalyticsPeriodDays] = useState<7 | 30 | 90>(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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
        if (role !== "admin") {
          if (!mounted) return;
          setAuthorized(false);
          setErrorText("Acesso restrito. Entre com uma conta administradora.");
          return;
        }

        const [studentsData, rankingData, teachersData, olympiadsData, analyticsData] = await Promise.all([
          fetchRegisteredStudentsFull(),
          fetchRankingAllRegisteredStudents(500),
          fetchTeachersWithOlympiads(),
          fetchOlympiads(),
          fetchSaasAnalyticsOverview(30),
        ]);
        if (!mounted) return;
        setAuthorized(true);
        setStudents(studentsData);
        setRankingRows(rankingData);
        setTeachers(teachersData);
        setOlympiads((olympiadsData ?? []).map((item: { id: string; title: string }) => ({ id: item.id, title: item.title })));
        setSaasAnalytics(analyticsData);
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

  useEffect(() => {
    let mounted = true;
    async function reloadAnalyticsByPeriod() {
      if (!authorized) return;
      try {
        setAnalyticsLoading(true);
        const analyticsData = await fetchSaasAnalyticsOverview(analyticsPeriodDays);
        if (!mounted) return;
        setSaasAnalytics(analyticsData);
      } catch {
        // Não bloqueia o dashboard por falha pontual de analytics.
      } finally {
        if (mounted) setAnalyticsLoading(false);
      }
    }
    void reloadAnalyticsByPeriod();
    return () => {
      mounted = false;
    };
  }, [authorized, analyticsPeriodDays]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    type GtmWindow = Window & {
      dataLayer?: Array<Record<string, unknown>>;
      google_tag_manager?: Record<string, unknown>;
    };
    type DataLayerItem = Record<string, unknown>;
    type PatchedDataLayer = Array<DataLayerItem> & {
      __ingeniumPatchedPush?: boolean;
      __ingeniumOriginalPush?: (...items: DataLayerItem[]) => number;
    };
    const GTM_ID = "GTM-TNHK5MSV";

    const readGtmState = () => {
      const win = window as GtmWindow;
      const layer = Array.isArray(win.dataLayer) ? win.dataLayer : [];
      const hasScript = Boolean(
        document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`),
      );
      const hasContainerObject = Boolean(win.google_tag_manager?.[GTM_ID]);

      setGtmConnected(hasScript || hasContainerObject);
      setGtmEventCount(layer.length);

      const observedEvents: GtmObservedEvent[] = [];
      for (let i = layer.length - 1; i >= 0; i -= 1) {
        const item = layer[i];
        if (item && typeof item.event === "string" && item.event.trim()) {
          const eventSource: "app" | "gtm" = item.event.startsWith("gtm.") ? "gtm" : "app";
          const eventTime = getEventTimeFromDataLayerItem(item);
          const payloadPreview = summarizeDataLayerPayload(item);
          observedEvents.push({
            event: item.event,
            eventTime,
            eventSource,
            payloadPreview,
          });
          if (observedEvents.length >= 8) break;
        }
      }
      setGtmRecentEvents(observedEvents);
      setGtmLastEventName(observedEvents[0]?.event ?? null);
    };

    const patchDataLayerPush = () => {
      const win = window as GtmWindow;
      if (!Array.isArray(win.dataLayer)) {
        win.dataLayer = [];
      }
      const layer = win.dataLayer as PatchedDataLayer;
      if (layer.__ingeniumPatchedPush) {
        return;
      }
      const originalPush = layer.push.bind(layer);
      layer.__ingeniumOriginalPush = originalPush as (...items: DataLayerItem[]) => number;
      layer.push = ((...items: DataLayerItem[]) => {
        const result = originalPush(...items);
        readGtmState();
        return result;
      }) as typeof layer.push;
      layer.__ingeniumPatchedPush = true;
    };

    patchDataLayerPush();
    readGtmState();

    const script = document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`);
    const onScriptLoad = () => {
      patchDataLayerPush();
      readGtmState();
    };
    if (script) {
      script.addEventListener("load", onScriptLoad);
    }

    return () => {
      if (script) {
        script.removeEventListener("load", onScriptLoad);
      }
      const win = window as GtmWindow;
      const layer = Array.isArray(win.dataLayer) ? (win.dataLayer as PatchedDataLayer) : null;
      if (layer?.__ingeniumPatchedPush && layer.__ingeniumOriginalPush) {
        layer.push = layer.__ingeniumOriginalPush as typeof layer.push;
        delete layer.__ingeniumOriginalPush;
        delete layer.__ingeniumPatchedPush;
      }
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

  async function reloadTeachers() {
    const teachersData = await fetchTeachersWithOlympiads();
    setTeachers(teachersData);
  }

  async function handleCreateTeacher() {
    if (!teacherFullName.trim() || !teacherDisplayName.trim() || !teacherEmail.trim()) {
      Alert.alert("Campos obrigatórios", "Informe nome completo, nome de exibição e e-mail.");
      return;
    }
    if (selectedCreateOlympiadId === "pending" && !teacherPendingOlympiadName.trim()) {
      Alert.alert("Campo obrigatório", "Informe o nome da olimpíada pendente.");
      return;
    }
    try {
      setSavingTeacher(true);
      await sendTeacherMagicLink({
        email: teacherEmail.trim(),
        full_name: teacherFullName.trim(),
        display_name: teacherDisplayName.trim(),
        subject_area: teacherArea.trim() || null,
      });
      await createTeacher({
        full_name: teacherFullName.trim(),
        display_name: teacherDisplayName.trim(),
        email: teacherEmail.trim(),
        subject_area: teacherArea.trim() || null,
        olympiad_id: selectedCreateOlympiadId && selectedCreateOlympiadId !== "pending" ? selectedCreateOlympiadId : null,
        pending_olympiad_name: selectedCreateOlympiadId === "pending" ? teacherPendingOlympiadName.trim() : null,
      });
      setTeacherFullName("");
      setTeacherDisplayName("");
      setTeacherEmail("");
      setTeacherArea("");
      setSelectedCreateOlympiadId("");
      setTeacherPendingOlympiadName("");
      await reloadTeachers();
      Alert.alert("Professor(a) salvo", "Cadastro atualizado e magic link enviado.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao salvar professor(a).";
      Alert.alert("Erro", message);
    } finally {
      setSavingTeacher(false);
    }
  }

  async function handleAssignTeacher(teacherId: string, olympiadId: string) {
    try {
      setAssigningTeacherId(teacherId);
      const teacher = teachers.find((item) => item.id === teacherId);
      await assignTeacherToOlympiad({
        teacher_profile_id: teacherId,
        olympiad_id: olympiadId,
        display_name: teacher?.display_name ?? null,
        subject_area: teacher?.subject_area ?? null,
      });
      await reloadTeachers();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao vincular professor(a).";
      Alert.alert("Erro", message);
    } finally {
      setAssigningTeacherId(null);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    try {
      await removeTeacherAssignment({ assignment_id: assignmentId });
      await reloadTeachers();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao remover vínculo.";
      Alert.alert("Erro", message);
    }
  }

  async function handleDeleteTeacher(teacherId: string) {
    try {
      setDeletingTeacherId(teacherId);
      await deleteTeacher(teacherId);
      await reloadTeachers();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao excluir professor(a).";
      Alert.alert("Erro", message);
    } finally {
      setDeletingTeacherId(null);
    }
  }

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
                {errorText ?? "Faça login com usuário admin para acessar este painel."}
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
              <AdminCoreDashboard
                activeTab="dashboard"
                students={students}
                rankingRows={rankingRows}
                teachers={teachers}
                teacherFullName={teacherFullName}
                teacherDisplayName={teacherDisplayName}
                teacherEmail={teacherEmail}
                teacherArea={teacherArea}
                selectedCreateOlympiadId={selectedCreateOlympiadId}
                teacherPendingOlympiadName={teacherPendingOlympiadName}
                olympiadSelectionByTeacher={olympiadSelectionByTeacher}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                savingPassword={savingPassword}
                savingTeacher={savingTeacher}
                assigningTeacherId={assigningTeacherId}
                deletingTeacherId={deletingTeacherId}
                olympiads={olympiads}
                onTeacherFullNameChange={setTeacherFullName}
                onTeacherDisplayNameChange={setTeacherDisplayName}
                onTeacherEmailChange={setTeacherEmail}
                onTeacherAreaChange={setTeacherArea}
                onCreateOlympiadChange={(value) => {
                  setSelectedCreateOlympiadId(value);
                  if (value !== "pending") setTeacherPendingOlympiadName("");
                }}
                onTeacherPendingOlympiadNameChange={setTeacherPendingOlympiadName}
                onTeacherOlympiadSelectionChange={(teacherId, olympiadId) => {
                  setOlympiadSelectionByTeacher((prev) => ({ ...prev, [teacherId]: olympiadId }));
                }}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onSaveTeacher={() => {
                  void handleCreateTeacher();
                }}
                onAssignTeacher={(teacherId, olympiadId) => {
                  void handleAssignTeacher(teacherId, olympiadId);
                }}
                onRemoveAssignment={(assignmentId) => {
                  void handleRemoveAssignment(assignmentId);
                }}
                onDeleteTeacher={(teacherId) => {
                  void handleDeleteTeacher(teacherId);
                }}
                onUpdatePassword={() => {
                  void handleChangePasswordNow();
                }}
                onOpenProfileSettings={() => {
                  router.push("/(tabs)/perfil");
                }}
              />
            ) : null}

            {activeTab === "alunos" ? (
              <AdminCoreDashboard
                activeTab="alunos"
                students={students}
                rankingRows={rankingRows}
                teachers={teachers}
                teacherFullName={teacherFullName}
                teacherDisplayName={teacherDisplayName}
                teacherEmail={teacherEmail}
                teacherArea={teacherArea}
                selectedCreateOlympiadId={selectedCreateOlympiadId}
                teacherPendingOlympiadName={teacherPendingOlympiadName}
                olympiadSelectionByTeacher={olympiadSelectionByTeacher}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                savingPassword={savingPassword}
                savingTeacher={savingTeacher}
                assigningTeacherId={assigningTeacherId}
                deletingTeacherId={deletingTeacherId}
                olympiads={olympiads}
                onTeacherFullNameChange={setTeacherFullName}
                onTeacherDisplayNameChange={setTeacherDisplayName}
                onTeacherEmailChange={setTeacherEmail}
                onTeacherAreaChange={setTeacherArea}
                onCreateOlympiadChange={(value) => {
                  setSelectedCreateOlympiadId(value);
                  if (value !== "pending") setTeacherPendingOlympiadName("");
                }}
                onTeacherPendingOlympiadNameChange={setTeacherPendingOlympiadName}
                onTeacherOlympiadSelectionChange={(teacherId, olympiadId) => {
                  setOlympiadSelectionByTeacher((prev) => ({ ...prev, [teacherId]: olympiadId }));
                }}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onSaveTeacher={() => {
                  void handleCreateTeacher();
                }}
                onAssignTeacher={(teacherId, olympiadId) => {
                  void handleAssignTeacher(teacherId, olympiadId);
                }}
                onRemoveAssignment={(assignmentId) => {
                  void handleRemoveAssignment(assignmentId);
                }}
                onDeleteTeacher={(teacherId) => {
                  void handleDeleteTeacher(teacherId);
                }}
                onUpdatePassword={() => {
                  void handleChangePasswordNow();
                }}
                onOpenProfileSettings={() => {
                  router.push("/(tabs)/perfil");
                }}
              />
            ) : null}

            {activeTab === "professores" ? (
              <AdminCoreDashboard
                activeTab="professores"
                students={students}
                rankingRows={rankingRows}
                teachers={teachers}
                teacherFullName={teacherFullName}
                teacherDisplayName={teacherDisplayName}
                teacherEmail={teacherEmail}
                teacherArea={teacherArea}
                selectedCreateOlympiadId={selectedCreateOlympiadId}
                teacherPendingOlympiadName={teacherPendingOlympiadName}
                olympiadSelectionByTeacher={olympiadSelectionByTeacher}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                savingPassword={savingPassword}
                savingTeacher={savingTeacher}
                assigningTeacherId={assigningTeacherId}
                deletingTeacherId={deletingTeacherId}
                olympiads={olympiads}
                onTeacherFullNameChange={setTeacherFullName}
                onTeacherDisplayNameChange={setTeacherDisplayName}
                onTeacherEmailChange={setTeacherEmail}
                onTeacherAreaChange={setTeacherArea}
                onCreateOlympiadChange={(value) => {
                  setSelectedCreateOlympiadId(value);
                  if (value !== "pending") setTeacherPendingOlympiadName("");
                }}
                onTeacherPendingOlympiadNameChange={setTeacherPendingOlympiadName}
                onTeacherOlympiadSelectionChange={(teacherId, olympiadId) => {
                  setOlympiadSelectionByTeacher((prev) => ({ ...prev, [teacherId]: olympiadId }));
                }}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onSaveTeacher={() => {
                  void handleCreateTeacher();
                }}
                onAssignTeacher={(teacherId, olympiadId) => {
                  void handleAssignTeacher(teacherId, olympiadId);
                }}
                onRemoveAssignment={(assignmentId) => {
                  void handleRemoveAssignment(assignmentId);
                }}
                onDeleteTeacher={(teacherId) => {
                  void handleDeleteTeacher(teacherId);
                }}
                onUpdatePassword={() => {
                  void handleChangePasswordNow();
                }}
                onOpenProfileSettings={() => {
                  router.push("/(tabs)/perfil");
                }}
              />
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
                <Text style={{ color: colors.white }} weight="bold">GTM (Google Tag Manager)</Text>
                <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: spacing.xs, lineHeight: 20 }}>
                  Status da instalação e teste rápido de evento para validar o recebimento no Tag Assistant/GA4.
                </Text>
                <View
                  style={{
                    marginTop: spacing.sm,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: gtmConnected ? "rgba(34,197,94,0.45)" : "rgba(252,165,165,0.45)",
                    backgroundColor: gtmConnected ? "rgba(34,197,94,0.08)" : "rgba(252,165,165,0.08)",
                    padding: spacing.sm,
                  }}
                >
                  <Text style={{ color: gtmConnected ? "#86efac" : "#fecaca" }} weight="bold">
                    {gtmConnected ? "GTM detectado no navegador" : "GTM não detectado no navegador"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.82)", marginTop: 4 }}>
                    Container: GTM-TNHK5MSV
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                    Último evento de teste: {gtmLastEventAt ?? "ainda não enviado"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                    Último evento no dataLayer: {gtmLastEventName ?? "não identificado"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                    Total de pushes no dataLayer: {gtmEventCount}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    const eventAt = new Date().toISOString();
                    trackEvent("gtm_admin_test_event", {
                      source: "admin_dashboard",
                      sent_at: eventAt,
                    });
                    setGtmLastEventAt(eventAt);
                    Alert.alert("Evento enviado", "Disparamos gtm_admin_test_event para validação no GTM/GA4.");
                  }}
                  style={{
                    marginTop: spacing.sm,
                    height: 42,
                    borderRadius: radii.md,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                  }}
                >
                  <Text style={{ color: colors.white }} weight="semibold">Enviar evento de teste</Text>
                </Pressable>
                <View style={{ marginTop: spacing.sm, gap: 8 }}>
                  <Text style={{ color: "rgba(255,255,255,0.88)" }} weight="bold">
                    Últimos eventos capturados (tempo real)
                  </Text>
                  {gtmRecentEvents.length ? (
                    gtmRecentEvents.map((item, index) => (
                      <View
                        key={`${item.event}-${item.eventTime ?? "sem-data"}-${index}`}
                        style={{
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.borderSoft,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ color: "rgba(255,255,255,0.92)" }} weight="semibold">
                          Evento: {item.event}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                          Origem: {item.eventSource === "app" ? "App InGenium" : "Infra GTM"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 2 }}>
                          Horário: {item.eventTime ?? "sem carimbo de data neste evento"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 2 }}>
                          Resumo: {item.payloadPreview}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.borderSoft,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                        Nenhum evento identificado no dataLayer ainda.
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ marginTop: spacing.md, gap: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.xs }}>
                    <Text style={{ color: "rgba(255,255,255,0.88)" }} weight="bold">
                      Inteligência SaaS
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {[7, 30, 90].map((days) => {
                        const active = analyticsPeriodDays === days;
                        return (
                          <Pressable
                            key={`period-${days}`}
                            onPress={() => setAnalyticsPeriodDays(days as 7 | 30 | 90)}
                            style={{
                              borderRadius: radii.pill,
                              borderWidth: 1,
                              borderColor: active ? "rgba(255,199,0,0.45)" : colors.borderSoft,
                              backgroundColor: active ? "rgba(255,199,0,0.16)" : "rgba(255,255,255,0.04)",
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                            }}
                          >
                            <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                              {days}d
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  {analyticsLoading ? (
                    <Text style={{ color: "rgba(255,255,255,0.66)" }}>
                      Atualizando período...
                    </Text>
                  ) : null}
                  <View
                    style={{
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.92)" }} weight="semibold">
                      KPIs
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.74)", marginTop: 2 }}>
                      Período: últimos {analyticsPeriodDays} dias |{" "}
                      Eventos: {saasAnalytics?.total_events ?? 0} | Sessões: {saasAnalytics?.total_sessions ?? 0} | Usuários ativos:{" "}
                      {saasAnalytics?.active_users ?? 0}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.92)" }} weight="semibold">
                      Páginas mais acessadas
                    </Text>
                    {(saasAnalytics?.top_pages ?? []).slice(0, 5).map((row) => (
                      <Text key={`page-${row.page_path}`} style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                        {row.page_path}: {row.visits}
                      </Text>
                    ))}
                  </View>
                  <View
                    style={{
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.92)" }} weight="semibold">
                      Horários de pico
                    </Text>
                    {(saasAnalytics?.peak_hours ?? []).slice(0, 5).map((row) => (
                      <Text key={`peak-${row.hour_slot}`} style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                        {row.hour_slot}: {row.events}
                      </Text>
                    ))}
                  </View>
                  <View
                    style={{
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.92)" }} weight="semibold">
                      Dispositivos e localização
                    </Text>
                    {(saasAnalytics?.devices ?? []).slice(0, 3).map((row) => (
                      <Text key={`device-${row.device}`} style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                        {row.device}: {row.events}
                      </Text>
                    ))}
                    {(saasAnalytics?.countries ?? []).slice(0, 3).map((row) => (
                      <Text key={`country-${row.country_name}`} style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                        {row.country_name}: {row.events}
                      </Text>
                    ))}
                  </View>
                  <View
                    style={{
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.03)",
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.92)" }} weight="semibold">
                      Logins mais e menos ativos
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.74)", marginTop: 2 }} weight="semibold">
                      Mais ativos
                    </Text>
                    {(saasAnalytics?.most_accessed_logins ?? []).slice(0, 3).map((row) => (
                      <Text key={`most-${row.user_id}`} style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                        {row.full_name}: {row.accesses}
                      </Text>
                    ))}
                    <Text style={{ color: "rgba(255,255,255,0.74)", marginTop: 4 }} weight="semibold">
                      Menos ativos
                    </Text>
                    {(saasAnalytics?.least_accessed_logins ?? []).slice(0, 3).map((row) => (
                      <Text key={`least-${row.user_id}`} style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                        {row.full_name}: {row.accesses}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {activeTab === "perfil" ? (
              <AdminCoreDashboard
                activeTab="perfil"
                students={students}
                rankingRows={rankingRows}
                teachers={teachers}
                teacherFullName={teacherFullName}
                teacherDisplayName={teacherDisplayName}
                teacherEmail={teacherEmail}
                teacherArea={teacherArea}
                selectedCreateOlympiadId={selectedCreateOlympiadId}
                teacherPendingOlympiadName={teacherPendingOlympiadName}
                olympiadSelectionByTeacher={olympiadSelectionByTeacher}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                savingPassword={savingPassword}
                savingTeacher={savingTeacher}
                assigningTeacherId={assigningTeacherId}
                deletingTeacherId={deletingTeacherId}
                olympiads={olympiads}
                onTeacherFullNameChange={setTeacherFullName}
                onTeacherDisplayNameChange={setTeacherDisplayName}
                onTeacherEmailChange={setTeacherEmail}
                onTeacherAreaChange={setTeacherArea}
                onCreateOlympiadChange={(value) => {
                  setSelectedCreateOlympiadId(value);
                  if (value !== "pending") setTeacherPendingOlympiadName("");
                }}
                onTeacherPendingOlympiadNameChange={setTeacherPendingOlympiadName}
                onTeacherOlympiadSelectionChange={(teacherId, olympiadId) => {
                  setOlympiadSelectionByTeacher((prev) => ({ ...prev, [teacherId]: olympiadId }));
                }}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onSaveTeacher={() => {
                  void handleCreateTeacher();
                }}
                onAssignTeacher={(teacherId, olympiadId) => {
                  void handleAssignTeacher(teacherId, olympiadId);
                }}
                onRemoveAssignment={(assignmentId) => {
                  void handleRemoveAssignment(assignmentId);
                }}
                onDeleteTeacher={(teacherId) => {
                  void handleDeleteTeacher(teacherId);
                }}
                onUpdatePassword={() => {
                  void handleChangePasswordNow();
                }}
                onOpenProfileSettings={() => {
                  router.push("/(tabs)/perfil");
                }}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </StitchScreenFrame>
  );
}
