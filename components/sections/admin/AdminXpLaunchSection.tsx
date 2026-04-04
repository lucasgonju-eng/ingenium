import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, TextInput, View } from "react-native";
import { Text } from "../../ui/Text";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import {
  awardXpActivityAdmin,
  createXpActivityCatalogAdmin,
  deleteXpActivityAwardAdmin,
  fetchRankingAllRegisteredStudents,
  listXpActivityAwardsAdminFiltered,
  listXpActivityAwardsAdminPage,
  listXpActivityCatalogAdmin,
  updateXpActivityAwardAdmin,
  type AdminXpActivityAwardRow,
  type AdminXpActivityCatalogRow,
  type FullStudentRow,
  type RankingStudentRow,
  type XpActivityGroup,
  type XpActivityScope,
} from "../../../lib/supabase/queries";

type Props = {
  canAccess: boolean;
  students: FullStudentRow[];
};

type XpAdminSubTab = "launch" | "history" | "log";
const HISTORY_PAGE_SIZE = 50;
const LOG_EXPORT_LIMIT = 3000;

type XpAdminBatchLogRow = {
  award_batch_id: string;
  activity_title: string;
  target_grade: string;
  award_scope: XpActivityScope;
  note: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  students_count: number;
  total_xp: number;
};

type XpLaunchStudentSummaryRow = {
  student_id: string;
  student_name: string;
  xp_before: number;
  xp_gained: number;
  xp_after: number;
};

const GROUP_OPTIONS: Array<{ value: XpActivityGroup; label: string }> = [
  { value: "fundamental", label: "Fundamental" },
  { value: "medio", label: "Médio" },
];

const GROUP_GRADE_OPTIONS: Record<XpActivityGroup, string[]> = {
  fundamental: ["6º Ano", "7º Ano", "8º Ano"],
  medio: ["9º Ano", "1ª Série", "2ª Série", "3ª Série"],
};

const SCOPE_OPTIONS: Array<{ value: XpActivityScope; label: string }> = [
  { value: "individual", label: "Individual" },
  { value: "collective", label: "Coletivo" },
];

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayShortDate() {
  return formatIsoToShortDate(getTodayIsoDate());
}

function sortStudentsByName(items: FullStudentRow[]) {
  return [...items].sort((a, b) => {
    const nameA = (a.full_name ?? "").trim().toLocaleLowerCase("pt-BR");
    const nameB = (b.full_name ?? "").trim().toLocaleLowerCase("pt-BR");
    return nameA.localeCompare(nameB, "pt-BR");
  });
}

function formatDateTime(value: string) {
  if (!value) return "Agora";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string) {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatIsoToShortDate(value: string) {
  const trimmed = String(value ?? "").trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, yyyy, mm, dd] = match;
  return `${dd}-${mm}-${yyyy.slice(-2)}`;
}

function normalizeShortDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function shortDateToIso(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, ddRaw, mmRaw, yyRaw] = match;
  const dd = Number(ddRaw);
  const mm = Number(mmRaw);
  const yy = Number(yyRaw);
  const yyyy = 2000 + yy;
  const parsed = new Date(yyyy, mm - 1, dd);
  const valid =
    parsed.getFullYear() === yyyy &&
    parsed.getMonth() === mm - 1 &&
    parsed.getDate() === dd &&
    yyyy >= 2000 &&
    yyyy <= 2099;
  if (!valid) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function isNoTaskNotificationActivityTitle(value: string) {
  const normalized = normalizeSearchValue(value);
  return normalized === "nenhuma notificacao de tarefa";
}

function csvEscapeCell(value: string | number | null | undefined) {
  const content = String(value ?? "");
  if (/[",\n;]/.test(content)) {
    return `"${content.replace(/"/g, '""')}"`;
  }
  return content;
}

export default function AdminXpLaunchSection({ canAccess, students }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<XpAdminSubTab>("launch");
  const [catalog, setCatalog] = useState<AdminXpActivityCatalogRow[]>([]);
  const [history, setHistory] = useState<AdminXpActivityAwardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingActivity, setSavingActivity] = useState(false);
  const [launchingXp, setLaunchingXp] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<XpActivityGroup>("fundamental");
  const [selectedGrade, setSelectedGrade] = useState("6º Ano");
  const [selectedClassName, setSelectedClassName] = useState("__all__");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [awardScope, setAwardScope] = useState<XpActivityScope>("individual");
  const [awardNote, setAwardNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(getTodayShortDate());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityDescription, setNewActivityDescription] = useState("");
  const [newActivityXp, setNewActivityXp] = useState("");
  const [newActivityGroup, setNewActivityGroup] = useState<XpActivityGroup>("fundamental");
  const [newActivityGrade, setNewActivityGrade] = useState("6º Ano");
  const [newActivityScope, setNewActivityScope] = useState<XpActivityScope>("individual");
  const [newActivityRecurrenceNote, setNewActivityRecurrenceNote] = useState("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyGradeFilter, setHistoryGradeFilter] = useState("__all__");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [editingXpAmount, setEditingXpAmount] = useState("");
  const [editingOccurredOn, setEditingOccurredOn] = useState(getTodayShortDate());
  const [editingNote, setEditingNote] = useState("");
  const [logRows, setLogRows] = useState<AdminXpActivityAwardRow[]>([]);
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const [editingLogBatchId, setEditingLogBatchId] = useState<string | null>(null);
  const [editingLogXpAmount, setEditingLogXpAmount] = useState("");
  const [editingLogOccurredOn, setEditingLogOccurredOn] = useState(getTodayShortDate());
  const [editingLogNote, setEditingLogNote] = useState("");
  const [savingLogBatch, setSavingLogBatch] = useState(false);
  const [removingLogBatch, setRemovingLogBatch] = useState<string | null>(null);
  const [lastLaunchSummary, setLastLaunchSummary] = useState<{
    activityTitle: string;
    occurredOn: string;
    launchAt: string;
    awardBatchId: string;
    rows: XpLaunchStudentSummaryRow[];
  } | null>(null);

  useEffect(() => {
    if (!canAccess) return;
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [catalogRows, historyPageResult, logRowsResult] = await Promise.all([
          listXpActivityCatalogAdmin(),
          listXpActivityAwardsAdminPage({
            page: 1,
            pageSize: HISTORY_PAGE_SIZE,
          }),
          listXpActivityAwardsAdminFiltered({
            limit: LOG_EXPORT_LIMIT,
            offset: 0,
            grade: null,
            search: null,
          }),
        ]);
        if (!mounted) return;
        setCatalog(catalogRows);
        setHistory(historyPageResult.rows);
        setHistoryTotalCount(historyPageResult.totalCount);
        setHistoryPage(1);
        setLogRows(logRowsResult);
      } catch (error) {
        if (!mounted) return;
        Alert.alert("Lançamento de XP", error instanceof Error ? error.message : "Não foi possível carregar os dados da aba.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [canAccess]);

  useEffect(() => {
    const allowedGrades = GROUP_GRADE_OPTIONS[selectedGroup];
    if (!allowedGrades.includes(selectedGrade)) {
      setSelectedGrade(allowedGrades[0]);
    }
  }, [selectedGroup, selectedGrade]);

  useEffect(() => {
    const allowedGrades = GROUP_GRADE_OPTIONS[newActivityGroup];
    if (!allowedGrades.includes(newActivityGrade)) {
      setNewActivityGrade(allowedGrades[0]);
    }
  }, [newActivityGroup, newActivityGrade]);

  const filteredActivities = useMemo(
    () =>
      catalog.filter(
        (activity) => activity.is_active && activity.target_group === selectedGroup && activity.target_grade === selectedGrade,
      ),
    [catalog, selectedGrade, selectedGroup],
  );

  useEffect(() => {
    if (filteredActivities.length === 0) {
      setSelectedActivityId("");
      return;
    }
    if (!filteredActivities.some((activity) => activity.id === selectedActivityId)) {
      setSelectedActivityId(filteredActivities[0].id);
    }
  }, [filteredActivities, selectedActivityId]);

  const selectedActivity = useMemo(
    () => filteredActivities.find((activity) => activity.id === selectedActivityId) ?? null,
    [filteredActivities, selectedActivityId],
  );

  useEffect(() => {
    if (selectedActivity) {
      setAwardScope(selectedActivity.default_scope);
    }
  }, [selectedActivity?.id]);

  useEffect(() => {
    if (selectedActivity && isNoTaskNotificationActivityTitle(selectedActivity.title) && awardScope !== "individual") {
      setAwardScope("individual");
    }
  }, [selectedActivity, awardScope]);

  useEffect(() => {
    if (isNoTaskNotificationActivityTitle(newActivityTitle) && newActivityScope !== "individual") {
      setNewActivityScope("individual");
    }
  }, [newActivityTitle, newActivityScope]);

  const gradeStudents = useMemo(() => {
    const items = students.filter((student) => student.grade === selectedGrade && student.is_active !== false);
    return sortStudentsByName(items);
  }, [selectedGrade, students]);

  const availableClasses = useMemo(() => {
    const values = Array.from(
      new Set(
        gradeStudents
          .map((student) => (student.class_name ?? "").trim())
          .filter((value) => value.length > 0),
      ),
    );
    return values.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [gradeStudents]);

  useEffect(() => {
    if (selectedClassName !== "__all__" && !availableClasses.includes(selectedClassName)) {
      setSelectedClassName("__all__");
    }
  }, [availableClasses, selectedClassName]);

  const visibleStudents = useMemo(() => {
    if (selectedClassName === "__all__") return gradeStudents;
    return gradeStudents.filter((student) => (student.class_name ?? "").trim() === selectedClassName);
  }, [gradeStudents, selectedClassName]);

  const trimmedStudentSearchTerm = studentSearchTerm.trim();
  const searchReady = trimmedStudentSearchTerm.length >= 3;
  const studentAutocompleteOptions = useMemo(() => {
    if (!searchReady) return [];
    const normalizedTerm = normalizeSearchValue(trimmedStudentSearchTerm);
    return visibleStudents
      .filter((student) => normalizeSearchValue(student.full_name ?? "").includes(normalizedTerm))
      .slice(0, 12);
  }, [searchReady, trimmedStudentSearchTerm, visibleStudents]);

  useEffect(() => {
    const visibleIds = new Set(visibleStudents.map((student) => student.id));
    setSelectedStudentIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [visibleStudents]);

  useEffect(() => {
    if (!canAccess) return;
    if (activeSubTab !== "history") return;
    let mounted = true;
    async function reloadHistory() {
      try {
        const historyPageResult = await listXpActivityAwardsAdminPage({
          page: historyPage,
          pageSize: HISTORY_PAGE_SIZE,
          grade: historyGradeFilter === "__all__" ? null : historyGradeFilter,
          search: historySearchTerm.trim() || null,
        });
        if (!mounted) return;
        setHistory(historyPageResult.rows);
        setHistoryTotalCount(historyPageResult.totalCount);
        if (historyPage > historyPageResult.totalPages) {
          setHistoryPage(historyPageResult.totalPages);
        }
      } catch (error) {
        if (!mounted) return;
        Alert.alert("Histórico de XP", error instanceof Error ? error.message : "Não foi possível carregar o histórico.");
      }
    }
    void reloadHistory();
    return () => {
      mounted = false;
    };
  }, [activeSubTab, canAccess, historyGradeFilter, historySearchTerm, historyPage]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyGradeFilter, historySearchTerm]);

  const selectedActivityForcesIndividual = Boolean(
    selectedActivity && isNoTaskNotificationActivityTitle(selectedActivity.title),
  );
  const effectiveAwardScope: XpActivityScope = selectedActivityForcesIndividual ? "individual" : awardScope;
  const selectedCount = effectiveAwardScope === "collective" ? visibleStudents.length : selectedStudentIds.length;
  const totalXpPreview = selectedActivity ? selectedCount * selectedActivity.xp_amount : 0;
  const historyTotalPages = Math.max(1, Math.ceil(historyTotalCount / HISTORY_PAGE_SIZE));
  const historyStartIndex = historyTotalCount === 0 ? 0 : (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
  const historyEndIndex = Math.min(historyPage * HISTORY_PAGE_SIZE, historyTotalCount);
  const logBatches = useMemo(() => {
    const grouped = new Map<string, XpAdminBatchLogRow>();
    for (const row of logRows) {
      const key = row.award_batch_id || row.award_id;
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, {
          award_batch_id: key,
          activity_title: row.activity_title,
          target_grade: row.target_grade,
          award_scope: row.award_scope,
          note: row.note ?? null,
          created_by: row.created_by,
          created_by_name: row.created_by_name ?? null,
          created_at: row.created_at,
          students_count: 1,
          total_xp: Number(row.xp_amount ?? 0),
        });
      } else {
        current.students_count += 1;
        current.total_xp += Number(row.xp_amount ?? 0);
      }
    }
    return [...grouped.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logRows]);
  const filteredLogBatches = useMemo(() => {
    const term = normalizeSearchValue(logSearchTerm);
    if (!term) return logBatches;
    return logBatches.filter((item) =>
      [
        item.activity_title,
        item.created_by_name ?? "",
        item.created_by,
        item.target_grade,
        item.note ?? "",
        item.award_batch_id,
      ]
        .map((value) => normalizeSearchValue(value))
        .some((value) => value.includes(term)),
    );
  }, [logBatches, logSearchTerm]);

  async function refreshLogsOnly() {
    const logRowsResult = await listXpActivityAwardsAdminFiltered({
      limit: LOG_EXPORT_LIMIT,
      offset: 0,
      grade: null,
      search: null,
    });
    setLogRows(logRowsResult);
  }

  async function refreshAfterChange() {
    const [catalogRows, historyPageResult, logRowsResult] = await Promise.all([
      listXpActivityCatalogAdmin(),
      listXpActivityAwardsAdminPage({
        page: historyPage,
        pageSize: HISTORY_PAGE_SIZE,
        grade: historyGradeFilter === "__all__" ? null : historyGradeFilter,
        search: historySearchTerm.trim() || null,
      }),
      listXpActivityAwardsAdminFiltered({
        limit: LOG_EXPORT_LIMIT,
        offset: 0,
        grade: null,
        search: null,
      }),
    ]);
    setCatalog(catalogRows);
    setHistory(historyPageResult.rows);
    setHistoryTotalCount(historyPageResult.totalCount);
    setLogRows(logRowsResult);
    if (historyPage > historyPageResult.totalPages) {
      setHistoryPage(historyPageResult.totalPages);
    }
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) => (prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]));
  }

  function markAllVisibleStudents() {
    setSelectedStudentIds(visibleStudents.map((student) => student.id));
  }

  function clearAllSelectedStudents() {
    setSelectedStudentIds([]);
  }

  function getAwardsByBatchId(batchId: string) {
    return logRows.filter((row) => row.award_batch_id === batchId);
  }

  function startEditingLogBatch(batchId: string) {
    const batchRows = getAwardsByBatchId(batchId);
    if (batchRows.length === 0) return;
    const first = batchRows[0];
    setEditingLogBatchId(batchId);
    setEditingLogXpAmount(String(first.xp_amount));
    setEditingLogOccurredOn(formatIsoToShortDate(first.occurred_on));
    setEditingLogNote(first.note ?? "");
  }

  function cancelEditingLogBatch() {
    setEditingLogBatchId(null);
    setEditingLogXpAmount("");
    setEditingLogOccurredOn(getTodayShortDate());
    setEditingLogNote("");
  }

  function startEditingAward(entry: AdminXpActivityAwardRow) {
    setEditingAwardId(entry.award_id);
    setEditingXpAmount(String(entry.xp_amount));
    setEditingOccurredOn(formatIsoToShortDate(entry.occurred_on));
    setEditingNote(entry.note ?? "");
  }

  function cancelEditingAward() {
    setEditingAwardId(null);
    setEditingXpAmount("");
    setEditingOccurredOn(getTodayShortDate());
    setEditingNote("");
  }

  async function refreshHistoryOnly() {
    const historyPageResult = await listXpActivityAwardsAdminPage({
      page: historyPage,
      pageSize: HISTORY_PAGE_SIZE,
      grade: historyGradeFilter === "__all__" ? null : historyGradeFilter,
      search: historySearchTerm.trim() || null,
    });
    setHistory(historyPageResult.rows);
    setHistoryTotalCount(historyPageResult.totalCount);
    await refreshLogsOnly();
    if (historyPage > historyPageResult.totalPages) {
      setHistoryPage(historyPageResult.totalPages);
    }
  }

  async function handleSaveLogBatch(batchId: string) {
    const xpAmount = Number(editingLogXpAmount);
    const occurredOnIso = shortDateToIso(editingLogOccurredOn);
    if (!Number.isFinite(xpAmount) || xpAmount <= 0) {
      Alert.alert("Log de envios", "Informe um valor de XP válido para o lote.");
      return;
    }
    if (!occurredOnIso) {
      Alert.alert("Log de envios", "Informe a data no formato DD-MM-AA.");
      return;
    }
    const batchRows = getAwardsByBatchId(batchId);
    if (batchRows.length === 0) {
      Alert.alert("Log de envios", "Lote não encontrado.");
      return;
    }
    try {
      setSavingLogBatch(true);
      for (const row of batchRows) {
        await updateXpActivityAwardAdmin({
          awardId: row.award_id,
          xpAmount: Math.round(xpAmount),
          occurredOn: occurredOnIso,
          note: editingLogNote.trim() || null,
        });
      }
      await refreshAfterChange();
      cancelEditingLogBatch();
      Alert.alert("Log de envios", "Lote atualizado com sucesso.");
    } catch (error) {
      Alert.alert("Log de envios", error instanceof Error ? error.message : "Não foi possível editar o lote.");
    } finally {
      setSavingLogBatch(false);
    }
  }

  async function handleDeleteLogBatch(batchId: string) {
    const batchRows = getAwardsByBatchId(batchId);
    if (batchRows.length === 0) {
      Alert.alert("Log de envios", "Lote não encontrado.");
      return;
    }
    const runDelete = async () => {
      try {
        setRemovingLogBatch(batchId);
        for (const row of batchRows) {
          await deleteXpActivityAwardAdmin(row.award_id);
        }
        await refreshAfterChange();
        if (editingLogBatchId === batchId) cancelEditingLogBatch();
        Alert.alert("Log de envios", "Lote removido com sucesso.");
      } catch (error) {
        Alert.alert("Log de envios", error instanceof Error ? error.message : "Não foi possível remover o lote.");
      } finally {
        setRemovingLogBatch(null);
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const confirmed = window.confirm("Deseja realmente remover todo este envio?");
      if (!confirmed) return;
      await runDelete();
      return;
    }

    Alert.alert("Remover lote", "Deseja realmente remover todo este envio?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  }

  async function handleExportLogCsv() {
    try {
      const rows = filteredLogBatches;
      if (rows.length === 0) {
        Alert.alert("Log de envios", "Não há dados para exportar com os filtros atuais.");
        return;
      }
      const header = [
        "batch_id",
        "atividade",
        "serie_alvo",
        "escopo",
        "qtd_alunos",
        "xp_total",
        "responsavel_id",
        "responsavel_nome",
        "observacao",
        "lancado_em",
      ];
      const lines = rows.map((row) =>
        [
          row.award_batch_id,
          row.activity_title,
          row.target_grade,
          row.award_scope === "collective" ? "Coletivo" : "Individual",
          row.students_count,
          row.total_xp,
          row.created_by,
          row.created_by_name ?? "",
          row.note ?? "",
          row.created_at,
        ]
          .map((item) => csvEscapeCell(item))
          .join(";"),
      );
      const csvContent = [header.join(";"), ...lines].join("\n");
      if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined") {
        Alert.alert("Log de envios", "A exportação CSV está disponível no painel web.");
        return;
      }
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      link.href = url;
      link.download = `xp-log-envios-${dateTag}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      Alert.alert("Log de envios", "Exportação concluída.");
    } catch (error) {
      Alert.alert("Log de envios", error instanceof Error ? error.message : "Não foi possível exportar o CSV.");
    }
  }

  async function handleSaveAwardEdit(awardId: string) {
    const xpAmount = Number(editingXpAmount);
    const occurredOnIso = shortDateToIso(editingOccurredOn);
    if (!Number.isFinite(xpAmount) || xpAmount <= 0) {
      Alert.alert("Histórico de XP", "Informe um valor de XP válido para salvar.");
      return;
    }
    if (!occurredOnIso) {
      Alert.alert("Histórico de XP", "Informe a data no formato DD-MM-AA.");
      return;
    }
    try {
      await updateXpActivityAwardAdmin({
        awardId,
        xpAmount: Math.round(xpAmount),
        occurredOn: occurredOnIso,
        note: editingNote.trim() || null,
      });
      await refreshHistoryOnly();
      cancelEditingAward();
      Alert.alert("Histórico de XP", "Lançamento atualizado com sucesso.");
    } catch (error) {
      Alert.alert("Histórico de XP", error instanceof Error ? error.message : "Não foi possível editar o lançamento.");
    }
  }

  async function handleDeleteAward(awardId: string) {
    Alert.alert("Excluir lançamento", "Deseja realmente excluir este lançamento de XP?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteXpActivityAwardAdmin(awardId);
              await refreshHistoryOnly();
              if (editingAwardId === awardId) cancelEditingAward();
              Alert.alert("Histórico de XP", "Lançamento excluído com sucesso.");
            } catch (error) {
              Alert.alert("Histórico de XP", error instanceof Error ? error.message : "Não foi possível excluir o lançamento.");
            }
          })();
        },
      },
    ]);
  }

  async function handleCreateActivity() {
    const title = newActivityTitle.trim();
    const xpAmount = Number(newActivityXp);

    if (!title) {
      Alert.alert("Nova atividade", "Informe o título da atividade.");
      return;
    }
    if (!Number.isFinite(xpAmount) || xpAmount <= 0) {
      Alert.alert("Nova atividade", "Informe um valor de XP válido.");
      return;
    }
    if (isNoTaskNotificationActivityTitle(title) && Math.round(xpAmount) !== 160) {
      Alert.alert("Nova atividade", 'A atividade "Nenhuma notificação de tarefa" deve valer exatamente 160 XP por aluno.');
      return;
    }

    try {
      setSavingActivity(true);
      const created = await createXpActivityCatalogAdmin({
        title,
        description: newActivityDescription.trim() || null,
        target_group: newActivityGroup,
        target_grade: newActivityGrade,
        xp_amount: Math.round(xpAmount),
        default_scope: newActivityScope,
        recurrence_note: newActivityRecurrenceNote.trim() || null,
      });
      await refreshAfterChange();
      setSelectedGroup(created.target_group);
      setSelectedGrade(created.target_grade);
      setSelectedActivityId(created.id);
      setNewActivityTitle("");
      setNewActivityDescription("");
      setNewActivityXp("");
      setNewActivityRecurrenceNote("");
      setNewActivityScope("individual");
      setShowCreateForm(false);
      Alert.alert("Nova atividade", "Atividade criada com sucesso.");
    } catch (error) {
      Alert.alert("Nova atividade", error instanceof Error ? error.message : "Não foi possível criar a atividade.");
    } finally {
      setSavingActivity(false);
    }
  }

  async function handleLaunchXp() {
    if (!selectedActivity) {
      Alert.alert("Lançamento de XP", "Selecione uma atividade.");
      return;
    }

    const occurredOnIso = shortDateToIso(occurredOn);
    if (!occurredOnIso) {
      Alert.alert("Lançamento de XP", "Informe a data da atividade no formato DD-MM-AA.");
      return;
    }

    const targetIds = effectiveAwardScope === "collective" ? visibleStudents.map((student) => student.id) : selectedStudentIds;
    if (targetIds.length === 0) {
      Alert.alert("Lançamento de XP", "Selecione ao menos um aluno para o lançamento.");
      return;
    }

    try {
      setLaunchingXp(true);
      const rankingBefore = await fetchRankingAllRegisteredStudents(5000).catch(() => []);
      const beforeByStudentId = new Map<string, number>(
        rankingBefore.map((row: RankingStudentRow) => [row.user_id, Number(row.total_points ?? 0)]),
      );
      const result = await awardXpActivityAdmin({
        activityId: selectedActivity.id,
        studentIds: targetIds,
        note: awardNote.trim() || null,
          occurredOn: occurredOnIso,
        awardScope: effectiveAwardScope,
      });
      const rankingAfter = await fetchRankingAllRegisteredStudents(5000).catch(() => []);
      const afterByStudentId = new Map<string, number>(
        rankingAfter.map((row: RankingStudentRow) => [row.user_id, Number(row.total_points ?? 0)]),
      );
      const studentsById = new Map<string, FullStudentRow>(students.map((row) => [row.id, row]));
      const summaryRows: XpLaunchStudentSummaryRow[] = targetIds.map((studentId) => {
        const xpBefore = Number(beforeByStudentId.get(studentId) ?? 0);
        const xpAfter = Number(afterByStudentId.get(studentId) ?? xpBefore);
        const computedGain = xpAfter - xpBefore;
        const xpGained = Number.isFinite(computedGain) && computedGain > 0 ? computedGain : selectedActivity.xp_amount;
        return {
          student_id: studentId,
          student_name: studentsById.get(studentId)?.full_name?.trim() || "Aluno sem nome",
          xp_before: xpBefore,
          xp_gained: xpGained,
          xp_after: xpAfter,
        };
      });
      summaryRows.sort((a, b) => a.student_name.localeCompare(b.student_name, "pt-BR"));
      await refreshAfterChange();
      setSelectedStudentIds([]);
      setAwardNote("");
      setOccurredOn(formatIsoToShortDate(occurredOnIso));
      setLastLaunchSummary({
        activityTitle: selectedActivity.title,
        occurredOn: occurredOnIso,
        launchAt: new Date().toISOString(),
        awardBatchId: result[0]?.award_batch_id ?? "sem-lote",
        rows: summaryRows,
      });
      Alert.alert(
        "Lançamento de XP",
        `${result.length} lançamento(s) registrados com ${selectedActivity.xp_amount} XP por aluno.`,
      );
    } catch (error) {
      Alert.alert("Lançamento de XP", error instanceof Error ? error.message : "Não foi possível concluir o lançamento.");
    } finally {
      setLaunchingXp(false);
    }
  }

  if (!canAccess) {
    return (
      <View style={cardStyle}>
        <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
          Lançamento de XP
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, lineHeight: 20 }}>
          Esta área é exclusiva do ADMIN principal para conceder XP por atividade.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={cardStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">
              Lançamento de XP
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: spacing.xs, lineHeight: 20 }}>
              Filtre a série, escolha uma atividade do catálogo e aplique XP individualmente ou para toda a turma filtrada.
            </Text>
          </View>
          <Pressable onPress={() => void refreshAfterChange()} style={secondaryButtonStyle}>
            <Text style={{ color: colors.white }} weight="semibold">
              Atualizar
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          {GROUP_OPTIONS.map((option) => {
            const active = selectedGroup === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setSelectedGroup(option.value)}
                style={[pillStyle, active ? pillActiveStyle : null]}
              >
                <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          {GROUP_GRADE_OPTIONS[selectedGroup].map((grade) => {
            const active = selectedGrade === grade;
            return (
              <Pressable key={grade} onPress={() => setSelectedGrade(grade)} style={[pillStyle, active ? pillActiveStyle : null]}>
                <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                  {grade}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setSelectedClassName("__all__")}
            style={[pillStyle, selectedClassName === "__all__" ? pillActiveStyle : null]}
          >
            <Text
              style={{ color: selectedClassName === "__all__" ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }}
              weight="semibold"
            >
              Todas as turmas
            </Text>
          </Pressable>
          {availableClasses.map((className) => {
            const active = selectedClassName === className;
            return (
              <Pressable key={className} onPress={() => setSelectedClassName(className)} style={[pillStyle, active ? pillActiveStyle : null]}>
                <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                  {className}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>Atividades</Text>
            <Text style={summaryValueStyle} weight="bold">
              {filteredActivities.length}
            </Text>
          </View>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>Alunos visíveis</Text>
            <Text style={summaryValueStyle} weight="bold">
              {visibleStudents.length}
            </Text>
          </View>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>XP previsto</Text>
            <Text style={summaryValueStyle} weight="bold">
              {totalXpPreview}
            </Text>
          </View>
        </View>
      </View>

      <View style={cardStyle}>
        <Text style={{ color: colors.white }} weight="bold">
          Área de XP Admin
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
          Escolha entre lançar novos XP, revisar o histórico dos alunos ou abrir o log de envios.
        </Text>
        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <Pressable onPress={() => setActiveSubTab("launch")} style={[pillStyle, activeSubTab === "launch" ? pillActiveStyle : null]}>
            <Text style={{ color: activeSubTab === "launch" ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
              Lançar XP
            </Text>
          </Pressable>
          <Pressable onPress={() => setActiveSubTab("history")} style={[pillStyle, activeSubTab === "history" ? pillActiveStyle : null]}>
            <Text style={{ color: activeSubTab === "history" ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
              Histórico de XP
            </Text>
          </Pressable>
          <Pressable onPress={() => setActiveSubTab("log")} style={[pillStyle, activeSubTab === "log" ? pillActiveStyle : null]}>
            <Text style={{ color: activeSubTab === "log" ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
              Log de envios
            </Text>
          </Pressable>
        </View>
      </View>

      {activeSubTab === "launch" ? (
      <>
      <View style={cardStyle}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white }} weight="bold">
              Catálogo da série
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
              {loading ? "Carregando atividades..." : "Escolha uma atividade para lançamento."}
            </Text>
          </View>
          <Pressable onPress={() => setShowCreateForm((prev) => !prev)} style={secondaryButtonStyle}>
            <Text style={{ color: colors.white }} weight="semibold">
              {showCreateForm ? "Fechar cadastro" : "Nova atividade"}
            </Text>
          </Pressable>
        </View>

        {filteredActivities.length === 0 && !loading ? (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={{ color: "rgba(255,255,255,0.72)" }}>
              Nenhuma atividade cadastrada para esse grupo e série.
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          {filteredActivities.map((activity) => {
            const active = selectedActivityId === activity.id;
            return (
              <Pressable key={activity.id} onPress={() => setSelectedActivityId(activity.id)} style={[activityCardStyle, active ? activityCardActiveStyle : null]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.white }} weight="bold">
                      {activity.title}
                    </Text>
                    {activity.description ? (
                      <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, lineHeight: 18 }}>
                        {activity.description}
                      </Text>
                    ) : null}
                    {activity.recurrence_note ? (
                      <Text style={{ color: colors.einsteinYellow, marginTop: 6, fontSize: 12 }}>
                        {activity.recurrence_note}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.einsteinYellow, fontSize: typography.titleMd.fontSize }} weight="bold">
                      {activity.xp_amount} XP
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>
                      Padrão: {activity.default_scope === "collective" ? "Coletivo" : "Individual"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showCreateForm ? (
        <View style={cardStyle}>
          <Text style={{ color: colors.white }} weight="bold">
            Criar nova atividade
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, lineHeight: 20 }}>
            O ADMIN pode criar atividades por grupo e série sem depender de nova migration.
          </Text>

          <Text style={fieldLabelStyle}>Grupo</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            {GROUP_OPTIONS.map((option) => {
              const active = newActivityGroup === option.value;
              return (
                <Pressable key={option.value} onPress={() => setNewActivityGroup(option.value)} style={[pillStyle, active ? pillActiveStyle : null]}>
                  <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={fieldLabelStyle}>Série</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            {GROUP_GRADE_OPTIONS[newActivityGroup].map((grade) => {
              const active = newActivityGrade === grade;
              return (
                <Pressable key={grade} onPress={() => setNewActivityGrade(grade)} style={[pillStyle, active ? pillActiveStyle : null]}>
                  <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                    {grade}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={fieldLabelStyle}>Título da atividade</Text>
          <TextInput
            value={newActivityTitle}
            onChangeText={setNewActivityTitle}
            placeholder="Ex.: Desafio relâmpago de matemática"
            placeholderTextColor="rgba(255,255,255,0.38)"
            style={inputStyle}
          />

          <Text style={fieldLabelStyle}>Descrição</Text>
          <TextInput
            value={newActivityDescription}
            onChangeText={setNewActivityDescription}
            placeholder="Explique rapidamente quando essa atividade deve ser lançada."
            placeholderTextColor="rgba(255,255,255,0.38)"
            style={[inputStyle, multilineInputStyle]}
            multiline
          />

          <Text style={fieldLabelStyle}>XP</Text>
          <TextInput
            value={newActivityXp}
            onChangeText={setNewActivityXp}
            placeholder="500"
            placeholderTextColor="rgba(255,255,255,0.38)"
            keyboardType="numeric"
            style={inputStyle}
          />

          <Text style={fieldLabelStyle}>Escopo padrão</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            {SCOPE_OPTIONS.map((option) => {
              const active = newActivityScope === option.value;
              const blockedByTitle = isNoTaskNotificationActivityTitle(newActivityTitle) && option.value === "collective";
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    if (blockedByTitle) return;
                    setNewActivityScope(option.value);
                  }}
                  style={[pillStyle, active ? pillActiveStyle : null, blockedByTitle ? disabledButtonStyle : null]}
                >
                  <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {isNoTaskNotificationActivityTitle(newActivityTitle) ? (
            <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs }}>
              Esta atividade deve ser sempre individual.
            </Text>
          ) : null}

          <Text style={fieldLabelStyle}>Observação de recorrência</Text>
          <TextInput
            value={newActivityRecurrenceNote}
            onChangeText={setNewActivityRecurrenceNote}
            placeholder="Ex.: 100 XP por atividade ou 50 XP por dia."
            placeholderTextColor="rgba(255,255,255,0.38)"
            style={inputStyle}
          />

          <Pressable onPress={() => void handleCreateActivity()} disabled={savingActivity} style={primaryButtonStyle}>
            <Text style={{ color: colors.einsteinBlue }} weight="bold">
              {savingActivity ? "Salvando atividade..." : "Salvar atividade"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={cardStyle}>
        <Text style={{ color: colors.white }} weight="bold">
          Lançar XP
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4, lineHeight: 20 }}>
          {selectedActivity
            ? `A atividade atual vale ${selectedActivity.xp_amount} XP por aluno.`
            : "Selecione uma atividade do catálogo para começar."}
        </Text>

        <Text style={fieldLabelStyle}>Modo de lançamento</Text>
        <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          {SCOPE_OPTIONS.map((option) => {
            const active = awardScope === option.value;
            const blockedByActivity = selectedActivityForcesIndividual && option.value === "collective";
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  if (blockedByActivity) return;
                  setAwardScope(option.value);
                }}
                style={[pillStyle, active ? pillActiveStyle : null, blockedByActivity ? disabledButtonStyle : null]}
              >
                <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedActivityForcesIndividual ? (
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs }}>
            Para esta atividade, o lançamento coletivo é bloqueado e sempre individual.
          </Text>
        ) : null}

        <Text style={fieldLabelStyle}>Data da atividade (obrigatória)</Text>
        <TextInput
          value={occurredOn}
          onChangeText={(value) => setOccurredOn(normalizeShortDateInput(value))}
          keyboardType="number-pad"
          placeholder="DD-MM-AA (ex.: 23-03-26)"
          placeholderTextColor="rgba(255,255,255,0.38)"
          style={inputStyle}
        />
        <Text style={{ color: "rgba(255,255,255,0.62)" }}>
          Transparência: a atividade fica com esta data; o sistema também registra o momento exato do lançamento.
        </Text>

        <Text style={fieldLabelStyle}>Observação opcional</Text>
        <TextInput
          value={awardNote}
          onChangeText={setAwardNote}
          placeholder="Ex.: Premiação da turma do 2º bimestre."
          placeholderTextColor="rgba(255,255,255,0.38)"
          style={[inputStyle, multilineInputStyle]}
          multiline
        />

        {effectiveAwardScope === "collective" ? (
          <View style={hintBoxStyle}>
            <Text style={{ color: colors.white }} weight="semibold">
              Lançamento coletivo
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: 6, lineHeight: 20 }}>
              Este lançamento será aplicado para todos os {visibleStudents.length} alunos visíveis no filtro atual
              {selectedClassName === "__all__" ? ` da série ${selectedGrade}.` : ` da turma ${selectedClassName}.`}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
              <Text style={{ color: colors.white }} weight="semibold">
                Seleção individual
              </Text>
              <View style={{ flexDirection: "row", gap: spacing.xs }}>
                <Pressable onPress={markAllVisibleStudents} style={secondaryButtonStyle}>
                  <Text style={{ color: colors.white }} weight="semibold">
                    Marcar todos os alunos
                  </Text>
                </Pressable>
                <Pressable onPress={clearAllSelectedStudents} style={secondaryButtonStyle}>
                  <Text style={{ color: colors.white }} weight="semibold">
                    Desmarcar todos
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={fieldLabelStyle}>Série do lançamento</Text>
            <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
              {GROUP_GRADE_OPTIONS[selectedGroup].map((grade) => {
                const active = selectedGrade === grade;
                return (
                  <Pressable key={`launch-grade-${grade}`} onPress={() => setSelectedGrade(grade)} style={[pillStyle, active ? pillActiveStyle : null]}>
                    <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                      {grade}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={fieldLabelStyle}>Buscar aluno (mínimo 3 letras)</Text>
            <TextInput
              value={studentSearchTerm}
              onChangeText={setStudentSearchTerm}
              placeholder="Digite o nome do aluno..."
              placeholderTextColor="rgba(255,255,255,0.38)"
              style={inputStyle}
            />
            {!searchReady ? (
              <Text style={{ color: "rgba(255,255,255,0.62)" }}>
                Digite pelo menos 3 letras para ativar o autocomplete.
              </Text>
            ) : null}
            {searchReady && studentAutocompleteOptions.length === 0 ? (
              <Text style={{ color: "rgba(255,255,255,0.62)" }}>
                Nenhum aluno encontrado com esse filtro na série selecionada.
              </Text>
            ) : null}

            <View style={{ gap: spacing.xs }}>
              {studentAutocompleteOptions.map((student) => {
                const active = selectedStudentIds.includes(student.id);
                return (
                  <Pressable key={student.id} onPress={() => toggleStudent(student.id)} style={[studentRowStyle, active ? studentRowActiveStyle : null]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.white }} weight="semibold">
                        {student.full_name ?? "Aluno sem nome"}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>
                        {student.grade ?? "Sem série"} {student.class_name ? `• ${student.class_name}` : ""}
                      </Text>
                    </View>
                    <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.50)" }} weight="bold">
                      {active ? "Selecionado" : "Selecionar"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={fieldLabelStyle}>Alunos selecionados</Text>
            <View style={{ gap: spacing.xs }}>
              {selectedStudentIds.length === 0 ? (
                <Text style={{ color: "rgba(255,255,255,0.62)" }}>Nenhum aluno selecionado.</Text>
              ) : (
                selectedStudentIds.map((studentId) => {
                  const student = visibleStudents.find((item) => item.id === studentId);
                  if (!student) return null;
                  return (
                    <Pressable key={`selected-${student.id}`} onPress={() => toggleStudent(student.id)} style={[studentRowStyle, studentRowActiveStyle]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.white }} weight="semibold">
                          {student.full_name ?? "Aluno sem nome"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>
                          {student.grade ?? "Sem série"} {student.class_name ? `• ${student.class_name}` : ""}
                        </Text>
                      </View>
                      <Text style={{ color: colors.einsteinYellow }} weight="bold">
                        Remover
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        )}

        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>Alunos alvo</Text>
            <Text style={summaryValueStyle} weight="bold">
              {selectedCount}
            </Text>
          </View>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>XP por aluno</Text>
            <Text style={summaryValueStyle} weight="bold">
              {selectedActivity?.xp_amount ?? 0}
            </Text>
          </View>
          <View style={summaryPillStyle}>
            <Text style={summaryLabelStyle}>XP total</Text>
            <Text style={summaryValueStyle} weight="bold">
              {totalXpPreview}
            </Text>
          </View>
        </View>

        <Pressable onPress={() => void handleLaunchXp()} disabled={launchingXp || !selectedActivity} style={primaryButtonStyle}>
          <Text style={{ color: colors.einsteinBlue }} weight="bold">
            {launchingXp ? "Registrando lançamento..." : "Confirmar lançamento de XP"}
          </Text>
        </Pressable>

        <View style={floatingSummaryCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">
            Resumo flutuante da atividade
          </Text>
          <View style={{ marginTop: spacing.xs, gap: 6 }}>
            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
              Atividade selecionada:{" "}
              <Text style={{ color: colors.einsteinYellow }} weight="semibold">
                {selectedActivity?.title ?? "Selecione uma atividade"}
              </Text>
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
              XP da atividade a ser adicionado:{" "}
              <Text style={{ color: colors.einsteinYellow }} weight="semibold">
                {selectedActivity?.xp_amount ?? 0} XP
              </Text>
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
              Data da atividade (não é a data do lançamento):{" "}
              <Text style={{ color: colors.einsteinYellow }} weight="semibold">
                {occurredOn || "--"}
              </Text>
            </Text>
          </View>
        </View>

        {lastLaunchSummary ? (
          <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
            <Text style={{ color: colors.white }} weight="bold">
              Resultado do último lançamento
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)" }}>
              {lastLaunchSummary.activityTitle} • Data da atividade: {formatDateOnly(lastLaunchSummary.occurredOn)} • Lote:{" "}
              {lastLaunchSummary.awardBatchId}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.62)" }}>
              Registrado em: {formatDateTime(lastLaunchSummary.launchAt)}
            </Text>

            <View style={historyCardStyle}>
              <View style={{ flexDirection: "row", gap: spacing.xs }}>
                <Text style={{ color: colors.einsteinYellow, flex: 1 }} weight="bold">
                  Aluno
                </Text>
                <Text style={{ color: colors.einsteinYellow, width: 84, textAlign: "right" }} weight="bold">
                  Antes
                </Text>
                <Text style={{ color: colors.einsteinYellow, width: 84, textAlign: "right" }} weight="bold">
                  Ganhou
                </Text>
                <Text style={{ color: colors.einsteinYellow, width: 84, textAlign: "right" }} weight="bold">
                  Depois
                </Text>
              </View>
              <View style={{ marginTop: spacing.xs, gap: 6 }}>
                {lastLaunchSummary.rows.map((row) => (
                  <View key={`launch-summary-${row.student_id}`} style={{ flexDirection: "row", gap: spacing.xs }}>
                    <Text style={{ color: colors.white, flex: 1 }}>{row.student_name}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.85)", width: 84, textAlign: "right" }}>
                      {row.xp_before.toLocaleString("pt-BR")}
                    </Text>
                    <Text style={{ color: colors.einsteinYellow, width: 84, textAlign: "right" }} weight="bold">
                      +{row.xp_gained.toLocaleString("pt-BR")}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.90)", width: 84, textAlign: "right" }} weight="semibold">
                      {row.xp_after.toLocaleString("pt-BR")}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </View>
      </>
      ) : null}

      {activeSubTab === "history" ? (
      <View style={cardStyle}>
        <Text style={{ color: colors.white }} weight="bold">
          Histórico de XP (admin)
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
          Histórico completo visível para o admin, com opção de editar ou excluir lançamentos.
        </Text>

        <Text style={fieldLabelStyle}>Filtrar série</Text>
        <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setHistoryGradeFilter("__all__")}
            style={[pillStyle, historyGradeFilter === "__all__" ? pillActiveStyle : null]}
          >
            <Text style={{ color: historyGradeFilter === "__all__" ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
              Todas as séries
            </Text>
          </Pressable>
          {[...GROUP_GRADE_OPTIONS.fundamental, ...GROUP_GRADE_OPTIONS.medio].map((grade) => {
            const active = historyGradeFilter === grade;
            return (
              <Pressable key={`history-grade-${grade}`} onPress={() => setHistoryGradeFilter(grade)} style={[pillStyle, active ? pillActiveStyle : null]}>
                <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                  {grade}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={fieldLabelStyle}>Buscar por aluno ou atividade</Text>
        <TextInput
          value={historySearchTerm}
          onChangeText={setHistorySearchTerm}
          placeholder="Digite nome do aluno ou atividade..."
          placeholderTextColor="rgba(255,255,255,0.38)"
          style={inputStyle}
        />

        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          {history.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.68)" }}>Nenhum lançamento encontrado com os filtros atuais.</Text>
          ) : (
            history.map((entry) => (
              <View key={entry.award_id} style={historyCardStyle}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.white }} weight="bold">
                      {entry.activity_title}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: 4 }}>
                      {entry.student_full_name ?? "Aluno não identificado"} • {entry.target_grade}
                      {entry.student_class_name ? ` • ${entry.student_class_name}` : ""}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.60)", marginTop: 4 }}>
                      {entry.note ?? "Sem observação"} • {entry.award_scope === "collective" ? "Coletivo" : "Individual"}
                    </Text>
                    {editingAwardId === entry.award_id ? (
                      <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                        <Text style={fieldLabelStyle}>XP</Text>
                        <TextInput
                          value={editingXpAmount}
                          onChangeText={setEditingXpAmount}
                          keyboardType="numeric"
                          placeholder="XP"
                          placeholderTextColor="rgba(255,255,255,0.38)"
                          style={inputStyle}
                        />
                        <Text style={fieldLabelStyle}>Data</Text>
                        <TextInput
                          value={editingOccurredOn}
                          onChangeText={(value) => setEditingOccurredOn(normalizeShortDateInput(value))}
                          keyboardType="number-pad"
                          placeholder="DD-MM-AA"
                          placeholderTextColor="rgba(255,255,255,0.38)"
                          style={inputStyle}
                        />
                        <Text style={fieldLabelStyle}>Observação</Text>
                        <TextInput
                          value={editingNote}
                          onChangeText={setEditingNote}
                          placeholder="Observação do lançamento"
                          placeholderTextColor="rgba(255,255,255,0.38)"
                          style={[inputStyle, multilineInputStyle]}
                          multiline
                        />
                        <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs }}>
                          <Pressable onPress={() => void handleSaveAwardEdit(entry.award_id)} style={primaryButtonStyleCompact}>
                            <Text style={{ color: colors.einsteinBlue }} weight="bold">
                              Salvar
                            </Text>
                          </Pressable>
                          <Pressable onPress={cancelEditingAward} style={secondaryButtonStyle}>
                            <Text style={{ color: colors.white }} weight="semibold">
                              Cancelar
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.einsteinYellow }} weight="bold">
                      {entry.xp_amount} XP
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>
                      Atividade: {formatDateOnly(entry.occurred_on)}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.60)", marginTop: 2 }}>
                      Lançado em: {formatDateTime(entry.created_at)}
                    </Text>
                    <Pressable onPress={() => startEditingAward(entry)} style={[secondaryButtonStyle, { marginTop: spacing.xs }]}>
                      <Text style={{ color: colors.white }} weight="semibold">
                        Editar
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => void handleDeleteAward(entry.award_id)} style={[dangerButtonStyle, { marginTop: spacing.xs }]}>
                      <Text style={{ color: colors.white }} weight="semibold">
                        Excluir
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
          <Text style={{ color: "rgba(255,255,255,0.72)" }}>
            Mostrando {historyStartIndex}-{historyEndIndex} de {historyTotalCount} lançamentos.
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center", flexWrap: "wrap" }}>
            <Pressable
              onPress={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
              disabled={historyPage <= 1}
              style={[secondaryButtonStyle, historyPage <= 1 ? disabledButtonStyle : null]}
            >
              <Text style={{ color: colors.white }} weight="semibold">
                Página anterior
              </Text>
            </Pressable>
            <Text style={{ color: colors.white }} weight="semibold">
              Página {historyPage} de {historyTotalPages}
            </Text>
            <Pressable
              onPress={() => setHistoryPage((prev) => Math.min(historyTotalPages, prev + 1))}
              disabled={historyPage >= historyTotalPages}
              style={[secondaryButtonStyle, historyPage >= historyTotalPages ? disabledButtonStyle : null]}
            >
              <Text style={{ color: colors.white }} weight="semibold">
                Próxima página
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
      ) : null}

      {activeSubTab === "log" ? (
      <View style={cardStyle}>
        <Text style={{ color: colors.white }} weight="bold">
          Log de envios de XP
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
          Cada linha representa um envio em lote, com responsável e horário de lançamento.
        </Text>

        <Text style={fieldLabelStyle}>Buscar no log</Text>
        <TextInput
          value={logSearchTerm}
          onChangeText={setLogSearchTerm}
          placeholder="Atividade, responsável, série ou ID do lote..."
          placeholderTextColor="rgba(255,255,255,0.38)"
          style={inputStyle}
        />

        <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
          <Pressable onPress={() => void refreshLogsOnly()} style={secondaryButtonStyle}>
            <Text style={{ color: colors.white }} weight="semibold">
              Atualizar log
            </Text>
          </Pressable>
          <Pressable onPress={() => void handleExportLogCsv()} style={primaryButtonStyleCompact}>
            <Text style={{ color: colors.einsteinBlue }} weight="bold">
              Exportar CSV
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
          {filteredLogBatches.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.68)" }}>Nenhum envio encontrado com os filtros atuais.</Text>
          ) : (
            filteredLogBatches.map((entry) => (
              <View key={entry.award_batch_id} style={historyCardStyle}>
                <Text style={{ color: colors.white }} weight="bold">
                  {entry.activity_title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: 4 }}>
                  Responsável: {entry.created_by_name ?? "Sem nome"} ({entry.created_by})
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 2 }}>
                  Série: {entry.target_grade} • Escopo: {entry.award_scope === "collective" ? "Coletivo" : "Individual"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 2 }}>
                  Alunos no envio: {entry.students_count} • XP total: {entry.total_xp.toLocaleString("pt-BR")}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.60)", marginTop: 2 }}>
                  Horário: {formatDateTime(entry.created_at)}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.55)", marginTop: 2, fontSize: 12 }}>
                  Lote: {entry.award_batch_id}
                </Text>
                {entry.note ? (
                  <Text style={{ color: "rgba(255,255,255,0.70)", marginTop: 4 }}>
                    Observação: {entry.note}
                  </Text>
                ) : null}
                <View style={{ marginTop: spacing.xs, flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
                  <Pressable
                    onPress={() => startEditingLogBatch(entry.award_batch_id)}
                    style={secondaryButtonStyle}
                    disabled={savingLogBatch || removingLogBatch === entry.award_batch_id}
                  >
                    <Text style={{ color: colors.white }} weight="semibold">
                      Editar lote
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDeleteLogBatch(entry.award_batch_id)}
                    style={dangerButtonStyle}
                    disabled={savingLogBatch || removingLogBatch === entry.award_batch_id}
                  >
                    <Text style={{ color: colors.white }} weight="semibold">
                      {removingLogBatch === entry.award_batch_id ? "Removendo..." : "Remover lote"}
                    </Text>
                  </Pressable>
                </View>
                {editingLogBatchId === entry.award_batch_id ? (
                  <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                    <Text style={{ color: colors.white }} weight="semibold">
                      Alunos no lote ({getAwardsByBatchId(entry.award_batch_id).length})
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.76)", lineHeight: 20 }}>
                      {getAwardsByBatchId(entry.award_batch_id)
                        .map((row) => row.student_full_name?.trim() || "Aluno sem nome")
                        .sort((a, b) => a.localeCompare(b, "pt-BR"))
                        .join(", ")}
                    </Text>
                    <Text style={fieldLabelStyle}>XP do lote</Text>
                    <TextInput
                      value={editingLogXpAmount}
                      onChangeText={setEditingLogXpAmount}
                      keyboardType="numeric"
                      placeholder="XP"
                      placeholderTextColor="rgba(255,255,255,0.38)"
                      style={inputStyle}
                    />
                    <Text style={fieldLabelStyle}>Data da atividade</Text>
                    <TextInput
                      value={editingLogOccurredOn}
                      onChangeText={(value) => setEditingLogOccurredOn(normalizeShortDateInput(value))}
                      keyboardType="number-pad"
                      placeholder="DD-MM-AA"
                      placeholderTextColor="rgba(255,255,255,0.38)"
                      style={inputStyle}
                    />
                    <Text style={fieldLabelStyle}>Observação</Text>
                    <TextInput
                      value={editingLogNote}
                      onChangeText={setEditingLogNote}
                      placeholder="Observação do lote"
                      placeholderTextColor="rgba(255,255,255,0.38)"
                      style={[inputStyle, multilineInputStyle]}
                      multiline
                    />
                    <View style={{ flexDirection: "row", gap: spacing.xs }}>
                      <Pressable
                        onPress={() => void handleSaveLogBatch(entry.award_batch_id)}
                        style={primaryButtonStyleCompact}
                        disabled={savingLogBatch}
                      >
                        <Text style={{ color: colors.einsteinBlue }} weight="bold">
                          {savingLogBatch ? "Salvando..." : "Salvar lote"}
                        </Text>
                      </Pressable>
                      <Pressable onPress={cancelEditingLogBatch} style={secondaryButtonStyle} disabled={savingLogBatch}>
                        <Text style={{ color: colors.white }} weight="semibold">
                          Cancelar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </View>
      ) : null}
    </View>
  );
}

const cardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

const activityCardStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

const activityCardActiveStyle = {
  borderColor: "rgba(255,199,0,0.45)",
  backgroundColor: "rgba(255,199,0,0.10)",
};

const studentRowStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 10,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: spacing.sm,
};

const studentRowActiveStyle = {
  borderColor: "rgba(255,199,0,0.45)",
  backgroundColor: "rgba(255,199,0,0.10)",
};

const historyCardStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.02)",
  padding: spacing.sm,
};

const pillStyle = {
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.04)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 8,
};

const pillActiveStyle = {
  borderColor: "rgba(255,199,0,0.45)",
  backgroundColor: "rgba(255,199,0,0.14)",
};

const summaryPillStyle = {
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 8,
  minWidth: 108,
};

const summaryLabelStyle = {
  color: "rgba(255,255,255,0.68)",
  fontSize: 11,
};

const summaryValueStyle = {
  color: colors.einsteinYellow,
  marginTop: 2,
  fontSize: 12,
};

const fieldLabelStyle = {
  color: colors.white,
  marginTop: spacing.sm,
  marginBottom: 6,
  fontSize: typography.bodyMd.fontSize,
};

const inputStyle = {
  minHeight: 44,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.04)",
  paddingHorizontal: spacing.sm,
  color: colors.white,
};

const multilineInputStyle = {
  minHeight: 86,
  paddingTop: 12,
  textAlignVertical: "top" as const,
};

const primaryButtonStyle = {
  minHeight: 46,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.einsteinYellow,
  paddingHorizontal: spacing.sm,
  marginTop: spacing.md,
};

const primaryButtonStyleCompact = {
  minHeight: 40,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.einsteinYellow,
  paddingHorizontal: spacing.sm,
};

const secondaryButtonStyle = {
  minHeight: 40,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.04)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: spacing.sm,
};

const disabledButtonStyle = {
  opacity: 0.45,
};

const dangerButtonStyle = {
  minHeight: 40,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(246,166,166,0.55)",
  backgroundColor: "rgba(127,29,29,0.35)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: spacing.sm,
};

const hintBoxStyle = {
  marginTop: spacing.sm,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,199,0,0.24)",
  backgroundColor: "rgba(255,199,0,0.08)",
  padding: spacing.sm,
};

const floatingSummaryCardStyle = {
  marginTop: spacing.md,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,199,0,0.45)",
  backgroundColor: "rgba(255,199,0,0.10)",
  padding: spacing.sm,
  shadowColor: "#000",
  shadowOpacity: 0.24,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};
