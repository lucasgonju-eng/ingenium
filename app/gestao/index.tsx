import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import AdminCoreDashboard, { getAdminCoreTabs } from "../../components/admin/AdminCoreDashboard";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import {
  assignTeacherToOlympiad,
  createTeacher,
  fetchMyAccessRole,
  fetchOlympiads,
  fetchRankingAllRegisteredStudents,
  fetchRegisteredStudentsFull,
  sendTeacherMagicLink,
  fetchTeachersWithOlympiads,
  removeTeacherAssignment,
  type FullStudentRow,
  type RankingStudentRow,
  type TeacherRow,
} from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";

type GestaoTab = ReturnType<typeof getAdminCoreTabs>[number]["key"];

export default function GestaoDashboardPlaceholder() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [activeTab, setActiveTab] = useState<GestaoTab>("dashboard");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
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
  const [olympiadSelectionByTeacher, setOlympiadSelectionByTeacher] = useState<Record<string, string>>({});
  const [teacherCreationFeedback, setTeacherCreationFeedback] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/gestao/login");
          return;
        }

        const role = await fetchMyAccessRole();
        if (role !== "gestao" && role !== "admin") {
          if (!mounted) return;
          setAuthorized(false);
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
        setMustChangePassword(Boolean(user.user_metadata?.admin_must_change_password));
        setStudents(studentsData);
        setRankingRows(rankingData);
        setTeachers(teachersData);
        setOlympiads((olympiadsData ?? []).map((item: { id: string; title: string }) => ({ id: item.id, title: item.title })));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  async function reloadTeachers() {
    const teachersData = await fetchTeachersWithOlympiads();
    setTeachers(teachersData);
  }

  async function handleChangePasswordNow() {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Campos obrigatórios", "Preencha nova senha e confirmação.");
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
      if (error) throw error;
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
      setTeacherCreationFeedback(null);
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
      setTeacherCreationFeedback(
        `Cadastro realizado com sucesso para ${teacherEmail.trim()}. O professor deve abrir o e-mail e concluir o acesso pelo magic link.`,
      );
      Alert.alert("Professor(a) salvo", "Cadastro atualizado e magic link enviado.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao salvar professor(a).";
      setTeacherCreationFeedback(null);
      Alert.alert("Erro", message);
    } finally {
      setSavingTeacher(false);
    }
  }

  function handleConfirmCreateTeacher() {
    Alert.alert(
      "Confirmar cadastro de professor",
      "Deseja revisar os dados antes de enviar ou confirmar o envio do magic link agora?",
      [
        {
          text: "Editar",
          style: "cancel",
        },
        {
          text: "Confirmar envio",
          style: "default",
          onPress: () => {
            void handleCreateTeacher();
          },
        },
      ],
    );
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

  return (
    <StitchScreenFrame>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <StitchHeader title="Gestão" subtitle="Painel de coordenadoras" variant="feed" />
        </View>
        {!loading && authorized && !mustChangePassword ? (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
            <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
              {getAdminCoreTabs().map((tab) => {
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
        ) : null}
        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
          {loading ? (
            <View style={{ alignItems: "center", marginTop: spacing.lg }}>
              <ActivityIndicator color={colors.einsteinYellow} />
            </View>
          ) : !authorized ? (
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
                Acesso restrito
              </Text>
              <Pressable onPress={() => router.replace("/gestao/login")} style={{ marginTop: spacing.sm }}>
                <Text style={{ color: colors.einsteinYellow }} weight="semibold">
                  Ir para login de Gestão
                </Text>
              </Pressable>
            </View>
          ) : mustChangePassword ? (
            <View
              style={{
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: "rgba(255,199,0,0.45)",
                backgroundColor: colors.surfacePanel,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: colors.white }} weight="bold">
                Primeiro acesso da Gestão
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs }}>
                Defina sua senha para continuar.
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
          ) : (
            <AdminCoreDashboard
              activeTab={activeTab}
              students={students}
              rankingRows={rankingRows}
              teachers={teachers}
              teacherFullName={teacherFullName}
              teacherDisplayName={teacherDisplayName}
              teacherEmail={teacherEmail}
              teacherArea={teacherArea}
              selectedCreateOlympiadId={selectedCreateOlympiadId}
              teacherPendingOlympiadName={teacherPendingOlympiadName}
              teacherCreationFeedback={activeTab === "professores" ? teacherCreationFeedback : null}
              olympiadSelectionByTeacher={olympiadSelectionByTeacher}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              savingPassword={savingPassword}
              savingTeacher={savingTeacher}
              assigningTeacherId={assigningTeacherId}
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
                handleConfirmCreateTeacher();
              }}
              onAssignTeacher={(teacherId, olympiadId) => {
                void handleAssignTeacher(teacherId, olympiadId);
              }}
              onRemoveAssignment={(assignmentId) => {
                void handleRemoveAssignment(assignmentId);
              }}
              onUpdatePassword={() => {
                void handleChangePasswordNow();
              }}
              onOpenProfileSettings={() => {
                router.push("/(tabs)/perfil");
              }}
            />
          )}
        </View>
      </ScrollView>
    </StitchScreenFrame>
  );
}
