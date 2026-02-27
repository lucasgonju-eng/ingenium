import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import {
  assignTeacherToOlympiad,
  createTeacher,
  fetchPendingAccessRequestsAdmin,
  importStudentEnrollments2026Admin,
  listStudentEnrollments2026Admin,
  fetchSaasAnalyticsOverview,
  fetchMyAccessRole,
  fetchRankingAllRegisteredStudents,
  fetchRegisteredStudentsFull,
  fetchTeachersWithOlympiads,
  reviewAccessRequestAdmin,
  sendAccessRequestReviewEmail,
  sendTeacherMagicLink,
  removeTeacherAssignment,
  fetchOlympiads,
  hardDeleteUserAdmin,
  setUserActiveAdmin,
  type AccessRequestRow,
  type FullStudentRow,
  type RankingStudentRow,
  type SaasAnalyticsOverview,
  type StudentEnrollment2026Row,
  type TeacherRow,
} from "../../lib/supabase/queries";
import { supabase } from "../../lib/supabase/client";
import { trackEvent } from "../../lib/analytics/gtm";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import AdminCoreDashboard, { getAdminCoreTabs } from "../../components/admin/AdminCoreDashboard";

type AdminTab =
  | ReturnType<typeof getAdminCoreTabs>[number]["key"]
  | "crm-inscricoes"
  | "importacao-2026"
  | "gtm"
  | "notificacoes";
const ADMIN_TABS: Array<{ key: AdminTab; label: string }> = [
  ...getAdminCoreTabs(),
  { key: "crm-inscricoes", label: "CRM Inscrições" },
  { key: "importacao-2026", label: "Importação 2026" },
  { key: "notificacoes", label: "Notificações" },
  { key: "gtm", label: "GTM" },
];
type GtmObservedEvent = {
  event: string;
  eventTime: string | null;
  eventSource: "app" | "gtm";
  eventLabel: string;
  eventHelp: string;
  payloadPreview: string;
};

function getFriendlyEventInfo(eventName: string) {
  const map: Record<string, { label: string; help: string }> = {
    "gtm.js": {
      label: "Rastreamento iniciado",
      help: "O sistema de medição do site foi iniciado.",
    },
    "gtm.dom": {
      label: "Página pronta para leitura",
      help: "A estrutura principal da página terminou de carregar.",
    },
    "gtm.load": {
      label: "Página totalmente carregada",
      help: "Todos os recursos da página foram finalizados.",
    },
    gtm_admin_test_event: {
      label: "Teste de rastreamento do Admin",
      help: "Evento de teste disparado manualmente no painel.",
    },
    lp_view: {
      label: "Visita à página inicial",
      help: "Um usuário visualizou a landing page.",
    },
    signup_start: {
      label: "Início de cadastro",
      help: "Um usuário começou o fluxo de criação de conta.",
    },
    signup_submit: {
      label: "Cadastro enviado",
      help: "Um usuário enviou os dados de cadastro.",
    },
    terms_accept: {
      label: "Termos aceitos",
      help: "Um usuário aceitou os termos e LGPD.",
    },
    login_success: {
      label: "Login de usuário concluído",
      help: "Um acesso de usuário comum foi autenticado com sucesso.",
    },
    admin_login_success: {
      label: "Login de admin concluído",
      help: "Um acesso administrativo foi autenticado com sucesso.",
    },
    gestao_login_success: {
      label: "Login de gestão concluído",
      help: "Um acesso de gestão foi autenticado com sucesso.",
    },
  };

  const direct = map[eventName];
  if (direct) return direct;

  const normalized = eventName.replace(/_/g, " ").trim();
  const label = normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "Evento registrado";
  return {
    label,
    help: "Evento registrado pelo sistema de monitoramento.",
  };
}

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

  return pieces.length ? pieces.join(" | ") : "Sem dados adicionais relevantes para decisão.";
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
  const [teacherCreationFeedback, setTeacherCreationFeedback] = useState<string | null>(null);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);
  const [olympiadSelectionByTeacher, setOlympiadSelectionByTeacher] = useState<Record<string, string>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [gtmConnected, setGtmConnected] = useState(false);
  const [gtmLastEventAt, setGtmLastEventAt] = useState<string | null>(null);
  const [gtmLastEventName, setGtmLastEventName] = useState<string | null>(null);
  const [gtmEventCount, setGtmEventCount] = useState(0);
  const [gtmRecentEvents, setGtmRecentEvents] = useState<GtmObservedEvent[]>([]);
  const [saasAnalytics, setSaasAnalytics] = useState<SaasAnalyticsOverview | null>(null);
  const [analyticsPeriodDays, setAnalyticsPeriodDays] = useState<7 | 30 | 90>(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AccessRequestRow[]>([]);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [enrollmentImportText, setEnrollmentImportText] = useState("");
  const [enrollmentRows, setEnrollmentRows] = useState<StudentEnrollment2026Row[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentImporting, setEnrollmentImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [crmSearch, setCrmSearch] = useState("");
  const [crmDeletingUserId, setCrmDeletingUserId] = useState<string | null>(null);

  const categoryCardStyles = {
    uso: {
      borderColor: "rgba(59,130,246,0.45)",
      backgroundColor: "rgba(59,130,246,0.09)",
      titleColor: "#93c5fd",
    },
    aquisicao: {
      borderColor: "rgba(16,185,129,0.45)",
      backgroundColor: "rgba(16,185,129,0.09)",
      titleColor: "#86efac",
    },
    retencaoRisco: {
      borderColor: "rgba(245,158,11,0.45)",
      backgroundColor: "rgba(245,158,11,0.09)",
      titleColor: "#fcd34d",
    },
  } as const;

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
        setCurrentUserEmail(user.email ?? null);

        const mustChange = Boolean(user.user_metadata?.admin_must_change_password);
        setMustChangePassword(mustChange);

        const role = await fetchMyAccessRole();
        if (role !== "admin") {
          if (!mounted) return;
          setAuthorized(false);
          setErrorText("Acesso restrito. Entre com uma conta administradora.");
          return;
        }

        const [studentsData, rankingData, teachersData, olympiadsData, analyticsData, requestsData] = await Promise.all([
          fetchRegisteredStudentsFull(),
          fetchRankingAllRegisteredStudents(500),
          fetchTeachersWithOlympiads(),
          fetchOlympiads(),
          fetchSaasAnalyticsOverview(30),
          fetchPendingAccessRequestsAdmin(),
        ]);
        if (!mounted) return;
        setAuthorized(true);
        setStudents(studentsData);
        setRankingRows(rankingData);
        setTeachers(teachersData);
        setOlympiads((olympiadsData ?? []).map((item: { id: string; title: string }) => ({ id: item.id, title: item.title })));
        setSaasAnalytics(analyticsData);
        setPendingRequests(requestsData);
        try {
          const enrollmentData = await listStudentEnrollments2026Admin();
          if (mounted) setEnrollmentRows(enrollmentData);
        } catch {
          if (mounted) setEnrollmentRows([]);
        }
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
          const eventInfo = getFriendlyEventInfo(item.event);
          const payloadPreview = summarizeDataLayerPayload(item);
          observedEvents.push({
            event: item.event,
            eventTime,
            eventSource,
            eventLabel: eventInfo.label,
            eventHelp: eventInfo.help,
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

  async function reloadStudentsAndRanking() {
    const [studentsData, rankingData] = await Promise.all([
      fetchRegisteredStudentsFull(),
      fetchRankingAllRegisteredStudents(500),
    ]);
    setStudents(studentsData);
    setRankingRows(rankingData);
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

  async function handleDeleteSelectedStudents() {
    if (!selectedStudentIds.length) {
      Alert.alert("Nenhum aluno selecionado", "Marque pelo menos um aluno para desativar.");
      return;
    }
    const confirmed = typeof window !== "undefined"
      ? window.confirm(`Confirma desativar ${selectedStudentIds.length} aluno(s) selecionado(s)?`)
      : true;
    if (!confirmed) return;

    try {
      setLoading(true);
      for (const id of selectedStudentIds) {
        await setUserActiveAdmin(id, false);
      }
      setSelectedStudentIds([]);
      await reloadStudentsAndRanking();
      Alert.alert("Desativação concluída", "Alunos selecionados foram desativados com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao desativar alunos selecionados.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSelectedTeachers() {
    if (!selectedTeacherIds.length) {
      Alert.alert("Nenhum professor selecionado", "Marque pelo menos um professor para desativar.");
      return;
    }
    const confirmed = typeof window !== "undefined"
      ? window.confirm(`Confirma desativar ${selectedTeacherIds.length} professor(es) selecionado(s)?`)
      : true;
    if (!confirmed) return;

    try {
      setLoading(true);
      for (const id of selectedTeacherIds) {
        await setUserActiveAdmin(id, false);
      }
      setSelectedTeacherIds([]);
      await Promise.all([reloadTeachers(), reloadStudentsAndRanking()]);
      Alert.alert("Desativação concluída", "Professores selecionados foram desativados com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao desativar professores selecionados.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateSelectedStudents() {
    if (!selectedStudentIds.length) {
      Alert.alert("Nenhum aluno selecionado", "Marque pelo menos um aluno para reativar.");
      return;
    }
    const confirmed = typeof window !== "undefined"
      ? window.confirm(`Confirma reativar ${selectedStudentIds.length} aluno(s) selecionado(s)?`)
      : true;
    if (!confirmed) return;

    try {
      setLoading(true);
      for (const id of selectedStudentIds) {
        await setUserActiveAdmin(id, true);
      }
      setSelectedStudentIds([]);
      await reloadStudentsAndRanking();
      Alert.alert("Reativação concluída", "Alunos selecionados foram reativados com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao reativar alunos selecionados.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateSelectedTeachers() {
    if (!selectedTeacherIds.length) {
      Alert.alert("Nenhum professor selecionado", "Marque pelo menos um professor para reativar.");
      return;
    }
    const confirmed = typeof window !== "undefined"
      ? window.confirm(`Confirma reativar ${selectedTeacherIds.length} professor(es) selecionado(s)?`)
      : true;
    if (!confirmed) return;

    try {
      setLoading(true);
      for (const id of selectedTeacherIds) {
        await setUserActiveAdmin(id, true);
      }
      setSelectedTeacherIds([]);
      await Promise.all([reloadTeachers(), reloadStudentsAndRanking()]);
      Alert.alert("Reativação concluída", "Professores selecionados foram reativados com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao reativar professores selecionados.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePermanentlyDeleteSelectedTeachers() {
    if (!selectedTeacherIds.length) {
      Alert.alert("Nenhum professor selecionado", "Marque pelo menos um professor para excluir permanentemente.");
      return;
    }
    const confirmed = typeof window !== "undefined"
      ? window.confirm(
        `Esta ação é irreversível. Confirma excluir permanentemente ${selectedTeacherIds.length} professor(es) selecionado(s)?`,
      )
      : true;
    if (!confirmed) return;

    try {
      setLoading(true);
      for (const id of selectedTeacherIds) {
        await hardDeleteUserAdmin(id);
      }
      setSelectedTeacherIds([]);
      await Promise.all([reloadTeachers(), reloadStudentsAndRanking(), reloadPendingRequests()]);
      Alert.alert("Exclusão permanente concluída", "Professores selecionados foram removidos definitivamente.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao excluir professores permanentemente.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetStudentActive(studentId: string, isActive: boolean) {
    const confirmed = typeof window !== "undefined"
      ? window.confirm(isActive ? "Confirma reativar este aluno?" : "Confirma desativar este aluno?")
      : true;
    if (!confirmed) return;

    try {
      setLoading(true);
      await setUserActiveAdmin(studentId, isActive);
      await reloadStudentsAndRanking();
      Alert.alert("Status atualizado", isActive ? "Aluno reativado com sucesso." : "Aluno desativado com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao atualizar status do aluno.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetTeacherActive(teacherId: string, isActive: boolean) {
    const confirmed = typeof window !== "undefined"
      ? window.confirm(isActive ? "Confirma reativar este professor?" : "Confirma desativar este professor?")
      : true;
    if (!confirmed) return;

    try {
      setLoading(true);
      await setUserActiveAdmin(teacherId, isActive);
      await Promise.all([reloadTeachers(), reloadStudentsAndRanking()]);
      Alert.alert("Status atualizado", isActive ? "Professor reativado com sucesso." : "Professor desativado com sucesso.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao atualizar status do professor.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleHardDeleteStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    const studentName = student?.full_name?.trim() || "este aluno";
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(`Esta ação é irreversível. Confirma excluir permanentemente ${studentName}?`)
        : true;
    if (!confirmed) return;

    try {
      setCrmDeletingUserId(studentId);
      await hardDeleteUserAdmin(studentId);
      await reloadStudentsAndRanking();
      Alert.alert("Exclusão permanente concluída", `${studentName} foi removido definitivamente.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao excluir inscrição permanentemente.";
      Alert.alert("Erro", message);
    } finally {
      setCrmDeletingUserId(null);
    }
  }

  async function reloadPendingRequests() {
    const requests = await fetchPendingAccessRequestsAdmin();
    setPendingRequests(requests);
  }

  async function reloadEnrollmentRows() {
    setEnrollmentLoading(true);
    try {
      const rows = await listStudentEnrollments2026Admin();
      setEnrollmentRows(rows);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar a base de matrículas 2026.";
      Alert.alert("Erro", message);
    } finally {
      setEnrollmentLoading(false);
    }
  }

  function parseEnrollmentImportText(raw: string) {
    const cleaned = raw.replace(/^\uFEFF/, "");
    const lines = cleaned
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return [];

    const normalizeHeaderText = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return lines
      .map((line) => {
        const parts = line.split(/[;,\t|]/).map((part) => part.trim().replace(/^"|"$/g, ""));
        const colA = parts[0] ?? "";
        const colB = parts[1] ?? "";
        const colANormalized = normalizeHeaderText(colA);
        const colBNormalized = normalizeHeaderText(colB);

        const isHeaderLine =
          (colANormalized.includes("nome") && colBNormalized.includes("matric")) ||
          (colANormalized.includes("matric") && colBNormalized.includes("nome"));
        if (isHeaderLine) return null;

        const digitsA = colA.replace(/\D/g, "");
        const digitsB = colB.replace(/\D/g, "");
        const alphaA = colA.replace(/[^A-Za-zÀ-ÿ\s]/g, "").trim();
        const alphaB = colB.replace(/[^A-Za-zÀ-ÿ\s]/g, "").trim();

        // Formato principal recebido: Nome;Matricula;Serie;Turma
        if (alphaA.length >= 3 && digitsB.length >= 4) {
          return { enrollment_number: digitsB, full_name: colA.trim() };
        }
        // Fallback para formato invertido: Matricula;Nome
        if (digitsA.length >= 4 && alphaB.length >= 3) {
          return { enrollment_number: digitsA, full_name: colB.trim() };
        }
        return null;
      })
      .filter((row): row is { enrollment_number: string; full_name: string } => Boolean(row));
  }

  function openCsvPicker() {
    if (Platform.OS !== "web") {
      Alert.alert("Disponível no web", "O upload de CSV está disponível no painel web do admin.");
      return;
    }
    csvInputRef.current?.click();
  }

  async function handleCsvFileSelected(file: File | null) {
    if (!file) return;
    if (Platform.OS !== "web") return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
      // Muitos relatórios escolares vêm em Windows-1252; fallback evita nomes com caracteres quebrados.
      if (text.includes("�") || text.includes("Ã") || text.includes("§")) {
        text = new TextDecoder("windows-1252").decode(arrayBuffer);
      }
      const parsedRows = parseEnrollmentImportText(text);
      if (!parsedRows.length) {
        Alert.alert("CSV sem dados válidos", "Use colunas no formato: matrícula;nome completo.");
        return;
      }
      setEnrollmentImportText(
        parsedRows.map((row) => `${row.enrollment_number};${row.full_name}`).join("\n"),
      );
      Alert.alert("CSV carregado", `${parsedRows.length} registro(s) prontos para importação.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao ler arquivo CSV.";
      Alert.alert("Erro", message);
    } finally {
      if (csvInputRef.current) {
        csvInputRef.current.value = "";
      }
    }
  }

  async function handleImportEnrollments2026() {
    const parsedRows = parseEnrollmentImportText(enrollmentImportText);
    if (!parsedRows.length) {
      Alert.alert("Lista vazia", "Cole linhas no formato: matrícula;nome completo.");
      return;
    }

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(`Confirma importar ${parsedRows.length} registro(s) da base 2026?`)
        : true;
    if (!confirmed) return;

    try {
      setEnrollmentImporting(true);
      const result = await importStudentEnrollments2026Admin(parsedRows);
      await reloadEnrollmentRows();
      Alert.alert(
        "Importação concluída",
        `Processados: ${result.total_count} | Novos: ${result.imported_count} | Atualizados: ${result.updated_count}`,
      );
      setEnrollmentImportText("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao importar base de matrículas 2026.";
      Alert.alert("Erro", message);
    } finally {
      setEnrollmentImporting(false);
    }
  }

  async function handleReviewRequest(requestId: string, approve: boolean) {
    const confirmed = typeof window !== "undefined"
      ? window.confirm(approve ? "Confirma aprovar este cadastro?" : "Confirma reprovar este cadastro?")
      : true;
    if (!confirmed) return;

    try {
      setReviewingRequestId(requestId);
      const request = pendingRequests.find((item) => item.id === requestId);
      await reviewAccessRequestAdmin({
        request_id: requestId,
        approve,
        review_notes: approve
          ? "Parabéns, seu cadastro foi aprovado! Seja bem-vindo(a) ao InGenium!!"
          : "Cadastro não aprovado nesta etapa.",
      });
      let emailWarning: string | null = null;
      if (request?.email && request.full_name) {
        try {
        await sendAccessRequestReviewEmail({
          requestType: request.request_type,
          approved: approve,
          fullName: request.full_name,
          displayName: request.display_name,
          candidateEmail: request.email,
          subjectArea: request.subject_area,
          intendedOlympiad: request.intended_olympiad,
          adminReviewerEmail: currentUserEmail,
        });
        } catch (mailErr: unknown) {
          emailWarning = mailErr instanceof Error ? mailErr.message : "Falha ao enviar e-mail de notificação.";
        }
      }
      await Promise.all([reloadPendingRequests(), reloadTeachers()]);
      const baseMessage = approve
        ? "Solicitação aprovada com sucesso. Professor liberado."
        : "Solicitação reprovada com sucesso.";
      Alert.alert(
        approve ? "Cadastro aprovado" : "Cadastro reprovado",
        emailWarning ? `${baseMessage}\n\nAviso de e-mail: ${emailWarning}` : baseMessage,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao revisar solicitação.";
      Alert.alert("Erro", message);
    } finally {
      setReviewingRequestId(null);
    }
  }

  const crmRows = [...students]
    .filter((row) => {
      const query = crmSearch.trim().toLowerCase();
      if (!query) return true;
      const name = row.full_name?.toLowerCase() ?? "";
      const grade = row.grade?.toLowerCase() ?? "";
      const className = row.class_name?.toLowerCase() ?? "";
      return name.includes(query) || grade.includes(query) || className.includes(query) || row.id.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

  function formatCrmDate(dateValue?: string | null) {
    if (!dateValue) return "Data não disponível";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Data não disponível";
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                  void handleCreateTeacher();
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
                enableBulkDelete
                selectedStudentIds={selectedStudentIds}
                selectedTeacherIds={selectedTeacherIds}
                onToggleStudentSelection={(studentId) => {
                  setSelectedStudentIds((prev) =>
                    prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
                  );
                }}
                onToggleTeacherSelection={(teacherId) => {
                  setSelectedTeacherIds((prev) =>
                    prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId],
                  );
                }}
                onSelectAllStudents={() => setSelectedStudentIds(students.map((s) => s.id))}
                onClearStudentSelection={() => setSelectedStudentIds([])}
                onSelectAllTeachers={() => setSelectedTeacherIds(teachers.map((t) => t.id))}
                onClearTeacherSelection={() => setSelectedTeacherIds([])}
                onDeleteSelectedStudents={() => {
                  void handleDeleteSelectedStudents();
                }}
                onDeleteSelectedTeachers={() => {
                  void handleDeleteSelectedTeachers();
                }}
                onActivateSelectedStudents={() => {
                  void handleActivateSelectedStudents();
                }}
                onActivateSelectedTeachers={() => {
                  void handleActivateSelectedTeachers();
                }}
                onPermanentlyDeleteSelectedTeachers={() => {
                  void handlePermanentlyDeleteSelectedTeachers();
                }}
                onSetStudentActive={(studentId, isActive) => {
                  void handleSetStudentActive(studentId, isActive);
                }}
                onSetTeacherActive={(teacherId, isActive) => {
                  void handleSetTeacherActive(teacherId, isActive);
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
                  void handleCreateTeacher();
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
                enableBulkDelete
                selectedStudentIds={selectedStudentIds}
                selectedTeacherIds={selectedTeacherIds}
                onToggleStudentSelection={(studentId) => {
                  setSelectedStudentIds((prev) =>
                    prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
                  );
                }}
                onToggleTeacherSelection={(teacherId) => {
                  setSelectedTeacherIds((prev) =>
                    prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId],
                  );
                }}
                onSelectAllStudents={() => setSelectedStudentIds(students.map((s) => s.id))}
                onClearStudentSelection={() => setSelectedStudentIds([])}
                onSelectAllTeachers={() => setSelectedTeacherIds(teachers.map((t) => t.id))}
                onClearTeacherSelection={() => setSelectedTeacherIds([])}
                onDeleteSelectedStudents={() => {
                  void handleDeleteSelectedStudents();
                }}
                onDeleteSelectedTeachers={() => {
                  void handleDeleteSelectedTeachers();
                }}
                onActivateSelectedStudents={() => {
                  void handleActivateSelectedStudents();
                }}
                onActivateSelectedTeachers={() => {
                  void handleActivateSelectedTeachers();
                }}
                onPermanentlyDeleteSelectedTeachers={() => {
                  void handlePermanentlyDeleteSelectedTeachers();
                }}
                onSetStudentActive={(studentId, isActive) => {
                  void handleSetStudentActive(studentId, isActive);
                }}
                onSetTeacherActive={(teacherId, isActive) => {
                  void handleSetTeacherActive(teacherId, isActive);
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
                  void handleCreateTeacher();
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
                enableBulkDelete
                selectedStudentIds={selectedStudentIds}
                selectedTeacherIds={selectedTeacherIds}
                onToggleStudentSelection={(studentId) => {
                  setSelectedStudentIds((prev) =>
                    prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
                  );
                }}
                onToggleTeacherSelection={(teacherId) => {
                  setSelectedTeacherIds((prev) =>
                    prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId],
                  );
                }}
                onSelectAllStudents={() => setSelectedStudentIds(students.map((s) => s.id))}
                onClearStudentSelection={() => setSelectedStudentIds([])}
                onSelectAllTeachers={() => setSelectedTeacherIds(teachers.map((t) => t.id))}
                onClearTeacherSelection={() => setSelectedTeacherIds([])}
                onDeleteSelectedStudents={() => {
                  void handleDeleteSelectedStudents();
                }}
                onDeleteSelectedTeachers={() => {
                  void handleDeleteSelectedTeachers();
                }}
                onActivateSelectedStudents={() => {
                  void handleActivateSelectedStudents();
                }}
                onActivateSelectedTeachers={() => {
                  void handleActivateSelectedTeachers();
                }}
                onPermanentlyDeleteSelectedTeachers={() => {
                  void handlePermanentlyDeleteSelectedTeachers();
                }}
                onSetStudentActive={(studentId, isActive) => {
                  void handleSetStudentActive(studentId, isActive);
                }}
                onSetTeacherActive={(teacherId, isActive) => {
                  void handleSetTeacherActive(teacherId, isActive);
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
                <Text style={{ color: colors.white }} weight="bold">Monitoramento de acesso (GTM)</Text>
                <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: spacing.xs, lineHeight: 20 }}>
                  Acompanhamento técnico e gerencial dos eventos de uso do SaaS.
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
                    {gtmConnected ? "Rastreamento ativo no navegador" : "Rastreamento inativo no navegador"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.82)", marginTop: 4 }}>
                    Container GTM: GTM-TNHK5MSV
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                    Último teste manual: {gtmLastEventAt ?? "ainda não executado"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                    Último registro capturado: {gtmLastEventName ?? "não identificado"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
                    Total de registros capturados: {gtmEventCount}
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
                    Alert.alert("Teste executado", "Evento de teste enviado para validação de rastreamento.");
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
                  <Text style={{ color: colors.white }} weight="semibold">Executar teste de rastreamento</Text>
                </Pressable>
                <View style={{ marginTop: spacing.sm, gap: 8 }}>
                  <Text style={{ color: "rgba(255,255,255,0.88)" }} weight="bold">
                    Registros recentes (tempo real)
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
                          Evento: {item.eventLabel}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 2 }}>
                          {item.eventHelp}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                          Origem: {item.eventSource === "app" ? "App InGenium" : "Infra GTM"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.62)", marginTop: 2 }}>
                          Código técnico: {item.event}
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
                        Nenhum registro disponível no monitoramento em tempo real.
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
                      borderColor: categoryCardStyles.uso.borderColor,
                      backgroundColor: categoryCardStyles.uso.backgroundColor,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: categoryCardStyles.uso.titleColor }} weight="semibold">
                      Uso | Visão geral
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
                      borderColor: categoryCardStyles.aquisicao.borderColor,
                      backgroundColor: categoryCardStyles.aquisicao.backgroundColor,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: categoryCardStyles.aquisicao.titleColor }} weight="semibold">
                      Aquisição | Páginas de entrada mais acessadas
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
                      borderColor: categoryCardStyles.uso.borderColor,
                      backgroundColor: categoryCardStyles.uso.backgroundColor,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: categoryCardStyles.uso.titleColor }} weight="semibold">
                      Uso | Horários de pico
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
                      borderColor: categoryCardStyles.aquisicao.borderColor,
                      backgroundColor: categoryCardStyles.aquisicao.backgroundColor,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: categoryCardStyles.aquisicao.titleColor }} weight="semibold">
                      Aquisição | Dispositivos e localização
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
                      borderColor: categoryCardStyles.retencaoRisco.borderColor,
                      backgroundColor: categoryCardStyles.retencaoRisco.backgroundColor,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: categoryCardStyles.retencaoRisco.titleColor }} weight="semibold">
                      Retenção e risco | Logins mais e menos ativos
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

            {activeTab === "notificacoes" ? (
              <View
                style={{
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.borderSoft,
                  backgroundColor: colors.surfacePanel,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.white }} weight="bold">Pendências de cadastro</Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.xs }}>
                  Solicitações de professores e colaboradores aguardando decisão administrativa.
                </Text>
                <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                  {pendingRequests.length === 0 ? (
                    <View
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.borderSoft,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        padding: spacing.sm,
                      }}
                    >
                      <Text style={{ color: "rgba(255,255,255,0.78)" }}>Nenhuma pendência no momento.</Text>
                    </View>
                  ) : (
                    pendingRequests.map((request) => (
                      <View
                        key={request.id}
                        style={{
                          borderRadius: radii.md,
                          borderWidth: 1,
                          borderColor: colors.borderSoft,
                          backgroundColor: "rgba(255,255,255,0.03)",
                          padding: spacing.sm,
                        }}
                      >
                        <Text style={{ color: colors.white }} weight="semibold">
                          {request.full_name ?? "Sem nome"} ({request.request_type === "teacher" ? "Professor(a)" : "Colaborador(a)"})
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                          Exibição: {request.display_name ?? "Sem nome"} • {request.email ?? "Sem e-mail"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                          CPF: {request.cpf ?? "Não informado"} • Área: {request.subject_area ?? "Não informada"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                          Olimpíada pretendida: {request.intended_olympiad ?? "Não informada"}
                        </Text>
                        <View style={{ marginTop: spacing.xs, flexDirection: "row", gap: spacing.xs }}>
                          <Pressable
                            onPress={() => {
                              void handleReviewRequest(request.id, true);
                            }}
                            disabled={reviewingRequestId === request.id}
                            style={{
                              flex: 1,
                              height: 38,
                              borderRadius: radii.md,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: "rgba(134,239,172,0.5)",
                              backgroundColor: "rgba(20,83,45,0.25)",
                              opacity: reviewingRequestId === request.id ? 0.7 : 1,
                            }}
                          >
                            <Text style={{ color: "#86efac" }} weight="bold">
                              Aprovar
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              void handleReviewRequest(request.id, false);
                            }}
                            disabled={reviewingRequestId === request.id}
                            style={{
                              flex: 1,
                              height: 38,
                              borderRadius: radii.md,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: "rgba(252,165,165,0.5)",
                              backgroundColor: "rgba(127,29,29,0.25)",
                              opacity: reviewingRequestId === request.id ? 0.7 : 1,
                            }}
                          >
                            <Text style={{ color: "#fecaca" }} weight="bold">
                              Reprovar
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {activeTab === "crm-inscricoes" ? (
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
                  CRM Inscrições
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.xs, lineHeight: 20 }}>
                  Lista de inscrições de alunos para triagem administrativa e remoção de cadastros indevidos.
                </Text>
                <TextInput
                  placeholder="Buscar por nome, série, turma ou ID"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  value={crmSearch}
                  onChangeText={setCrmSearch}
                  style={{
                    marginTop: spacing.sm,
                    height: 44,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: colors.white,
                    paddingHorizontal: spacing.sm,
                    fontFamily: typography.fontFamily.base,
                  }}
                />

                <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                  <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                    Total exibido: {crmRows.length}
                  </Text>
                  {crmRows.length === 0 ? (
                    <View
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.borderSoft,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        padding: spacing.sm,
                      }}
                    >
                      <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                        Nenhuma inscrição encontrada para os filtros atuais.
                      </Text>
                    </View>
                  ) : (
                    crmRows.map((student) => {
                      const deleting = crmDeletingUserId === student.id;
                      return (
                        <View
                          key={`crm-${student.id}`}
                          style={{
                            borderRadius: radii.md,
                            borderWidth: 1,
                            borderColor: colors.borderSoft,
                            backgroundColor: "rgba(255,255,255,0.03)",
                            padding: spacing.sm,
                          }}
                        >
                          <Text style={{ color: colors.white }} weight="semibold">
                            {student.full_name ?? "Sem nome"}
                          </Text>
                          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
                            Série: {student.grade ?? "Não informada"} • Turma: {student.class_name ?? "Não informada"}
                          </Text>
                          <Text style={{ color: "rgba(255,255,255,0.66)", marginTop: 2 }}>
                            Inscrição: {formatCrmDate(student.created_at)}
                          </Text>
                          <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 2 }}>ID: {student.id}</Text>
                          <View style={{ marginTop: spacing.xs, flexDirection: "row", gap: spacing.xs }}>
                            <Pressable
                              onPress={() => {
                                void handleHardDeleteStudent(student.id);
                              }}
                              disabled={deleting}
                              style={{
                                height: 38,
                                borderRadius: radii.md,
                                paddingHorizontal: spacing.sm,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: "rgba(252,165,165,0.5)",
                                backgroundColor: "rgba(127,29,29,0.25)",
                                opacity: deleting ? 0.7 : 1,
                              }}
                            >
                              <Text style={{ color: "#fecaca" }} weight="bold">
                                {deleting ? "Excluindo..." : "Excluir permanentemente"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            ) : null}

            {activeTab === "importacao-2026" ? (
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
                  Base de alunos matriculados - 2026
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.xs, lineHeight: 20 }}>
                  Cole a lista completa no formato: matrícula;nome completo (uma linha por aluno).
                </Text>

                <TextInput
                  multiline
                  numberOfLines={8}
                  value={enrollmentImportText}
                  onChangeText={setEnrollmentImportText}
                  placeholder={"20260001;Maria da Silva\n20260002;João Pedro Souza"}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={{
                    marginTop: spacing.sm,
                    minHeight: 150,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.borderSoft,
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: colors.white,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.sm,
                    textAlignVertical: "top",
                    fontFamily: typography.fontFamily.base,
                  }}
                />

                <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm }}>
                  <Pressable
                    onPress={openCsvPicker}
                    style={{
                      height: 42,
                      borderRadius: radii.md,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: spacing.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <Text style={{ color: colors.white }} weight="semibold">
                      Subir CSV
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void handleImportEnrollments2026();
                    }}
                    disabled={enrollmentImporting}
                    style={{
                      height: 42,
                      borderRadius: radii.md,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: spacing.md,
                      backgroundColor: colors.einsteinYellow,
                      opacity: enrollmentImporting ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: colors.einsteinBlue }} weight="bold">
                      {enrollmentImporting ? "Importando..." : "Importar lista 2026"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void reloadEnrollmentRows();
                    }}
                    disabled={enrollmentLoading}
                    style={{
                      height: 42,
                      borderRadius: radii.md,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: spacing.md,
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      opacity: enrollmentLoading ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: colors.white }} weight="semibold">
                      Atualizar lista
                    </Text>
                  </Pressable>
                </View>
                {Platform.OS === "web" ? (
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      void handleCsvFileSelected(file);
                    }}
                  />
                ) : null}

                <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                  <Text style={{ color: "rgba(255,255,255,0.75)" }}>
                    Registros cadastrados: {enrollmentRows.length}
                  </Text>
                  {enrollmentRows.slice(0, 200).map((row) => (
                    <View
                      key={`enrollment-${row.id}`}
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.borderSoft,
                        backgroundColor: "rgba(255,255,255,0.03)",
                        padding: spacing.sm,
                      }}
                    >
                      <Text style={{ color: colors.white }} weight="semibold">
                        {row.full_name}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                        Matrícula: {row.enrollment_number} • Ano letivo: {row.school_year}
                      </Text>
                    </View>
                  ))}
                  {enrollmentRows.length > 200 ? (
                    <Text style={{ color: "rgba(255,255,255,0.6)" }}>
                      Exibindo os 200 primeiros registros. Use a atualização após nova importação.
                    </Text>
                  ) : null}
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
                teacherCreationFeedback={null}
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
                  void handleCreateTeacher();
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
            ) : null}
          </View>
        )}
      </ScrollView>
    </StitchScreenFrame>
  );
}
