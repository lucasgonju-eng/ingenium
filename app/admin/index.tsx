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
  fetchMyAccessRole,
  fetchRankingAllRegisteredStudents,
  fetchRegisteredStudentsFull,
  fetchTeachersWithOlympiads,
  sendTeacherMagicLink,
  removeTeacherAssignment,
  fetchOlympiads,
  type FullStudentRow,
  type RankingStudentRow,
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

        const [studentsData, rankingData, teachersData, olympiadsData] = await Promise.all([
          fetchRegisteredStudentsFull(),
          fetchRankingAllRegisteredStudents(500),
          fetchTeachersWithOlympiads(),
          fetchOlympiads(),
        ]);
        if (!mounted) return;
        setAuthorized(true);
        setStudents(studentsData);
        setRankingRows(rankingData);
        setTeachers(teachersData);
        setOlympiads((olympiadsData ?? []).map((item: { id: string; title: string }) => ({ id: item.id, title: item.title })));
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
    if (typeof window === "undefined") return;
    const layer = (window as Window & { dataLayer?: unknown[] }).dataLayer;
    setGtmConnected(Array.isArray(layer));
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
                  {[
                    "Evento: lp_view",
                    "Evento: signup_start",
                    "Evento: terms_accept",
                    "Evento: signup_submit",
                    "Evento: login_success",
                    "Evento: admin_login_success",
                    "Evento: gestao_login_success",
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
