import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { Text } from "../../ui/Text";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import {
  awardXpActivityAdmin,
  createXpActivityCatalogAdmin,
  deleteXpActivityAwardAdmin,
  listXpActivityAwardsAdminFiltered,
  listXpActivityCatalogAdmin,
  updateXpActivityAwardAdmin,
  type AdminXpActivityAwardRow,
  type AdminXpActivityCatalogRow,
  type FullStudentRow,
  type XpActivityGroup,
  type XpActivityScope,
} from "../../../lib/supabase/queries";

type Props = {
  canAccess: boolean;
  students: FullStudentRow[];
};

type XpAdminSubTab = "launch" | "history";

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

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
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
  const [occurredOn, setOccurredOn] = useState(getTodayIsoDate());
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
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [editingXpAmount, setEditingXpAmount] = useState("");
  const [editingOccurredOn, setEditingOccurredOn] = useState(getTodayIsoDate());
  const [editingNote, setEditingNote] = useState("");

  useEffect(() => {
    if (!canAccess) return;
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [catalogRows, historyRows] = await Promise.all([
          listXpActivityCatalogAdmin(),
          listXpActivityAwardsAdminFiltered({ limit: 500 }),
        ]);
        if (!mounted) return;
        setCatalog(catalogRows);
        setHistory(historyRows);
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
        const historyRows = await listXpActivityAwardsAdminFiltered({
          limit: 500,
          grade: historyGradeFilter === "__all__" ? null : historyGradeFilter,
          search: historySearchTerm.trim() || null,
        });
        if (!mounted) return;
        setHistory(historyRows);
      } catch (error) {
        if (!mounted) return;
        Alert.alert("Histórico de XP", error instanceof Error ? error.message : "Não foi possível carregar o histórico.");
      }
    }
    void reloadHistory();
    return () => {
      mounted = false;
    };
  }, [activeSubTab, canAccess, historyGradeFilter, historySearchTerm]);

  const selectedCount = awardScope === "collective" ? visibleStudents.length : selectedStudentIds.length;
  const totalXpPreview = selectedActivity ? selectedCount * selectedActivity.xp_amount : 0;

  async function refreshAfterChange() {
    const [catalogRows, historyRows] = await Promise.all([
      listXpActivityCatalogAdmin(),
      listXpActivityAwardsAdminFiltered({
        limit: 500,
        grade: historyGradeFilter === "__all__" ? null : historyGradeFilter,
        search: historySearchTerm.trim() || null,
      }),
    ]);
    setCatalog(catalogRows);
    setHistory(historyRows);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) => (prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]));
  }

  function startEditingAward(entry: AdminXpActivityAwardRow) {
    setEditingAwardId(entry.award_id);
    setEditingXpAmount(String(entry.xp_amount));
    setEditingOccurredOn(entry.occurred_on);
    setEditingNote(entry.note ?? "");
  }

  function cancelEditingAward() {
    setEditingAwardId(null);
    setEditingXpAmount("");
    setEditingOccurredOn(getTodayIsoDate());
    setEditingNote("");
  }

  async function refreshHistoryOnly() {
    const historyRows = await listXpActivityAwardsAdminFiltered({
      limit: 500,
      grade: historyGradeFilter === "__all__" ? null : historyGradeFilter,
      search: historySearchTerm.trim() || null,
    });
    setHistory(historyRows);
  }

  async function handleSaveAwardEdit(awardId: string) {
    const xpAmount = Number(editingXpAmount);
    if (!Number.isFinite(xpAmount) || xpAmount <= 0) {
      Alert.alert("Histórico de XP", "Informe um valor de XP válido para salvar.");
      return;
    }
    try {
      await updateXpActivityAwardAdmin({
        awardId,
        xpAmount: Math.round(xpAmount),
        occurredOn: editingOccurredOn.trim() || null,
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

    const targetIds = awardScope === "collective" ? visibleStudents.map((student) => student.id) : selectedStudentIds;
    if (targetIds.length === 0) {
      Alert.alert("Lançamento de XP", "Selecione ao menos um aluno para o lançamento.");
      return;
    }

    try {
      setLaunchingXp(true);
      const result = await awardXpActivityAdmin({
        activityId: selectedActivity.id,
        studentIds: targetIds,
        note: awardNote.trim() || null,
        occurredOn: occurredOn.trim() || null,
        awardScope,
      });
      await refreshAfterChange();
      setSelectedStudentIds([]);
      setAwardNote("");
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
          Escolha entre lançar novos XP ou revisar o histórico completo dos alunos.
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
              return (
                <Pressable key={option.value} onPress={() => setNewActivityScope(option.value)} style={[pillStyle, active ? pillActiveStyle : null]}>
                  <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
            return (
              <Pressable key={option.value} onPress={() => setAwardScope(option.value)} style={[pillStyle, active ? pillActiveStyle : null]}>
                <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)" }} weight="semibold">
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={fieldLabelStyle}>Data do lançamento</Text>
        <TextInput
          value={occurredOn}
          onChangeText={setOccurredOn}
          placeholder="AAAA-MM-DD"
          placeholderTextColor="rgba(255,255,255,0.38)"
          style={inputStyle}
        />

        <Text style={fieldLabelStyle}>Observação opcional</Text>
        <TextInput
          value={awardNote}
          onChangeText={setAwardNote}
          placeholder="Ex.: Premiação da turma do 2º bimestre."
          placeholderTextColor="rgba(255,255,255,0.38)"
          style={[inputStyle, multilineInputStyle]}
          multiline
        />

        {awardScope === "collective" ? (
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
                <Pressable onPress={() => setSelectedStudentIds(visibleStudents.map((student) => student.id))} style={secondaryButtonStyle}>
                  <Text style={{ color: colors.white }} weight="semibold">
                    Selecionar todos
                  </Text>
                </Pressable>
                <Pressable onPress={() => setSelectedStudentIds([])} style={secondaryButtonStyle}>
                  <Text style={{ color: colors.white }} weight="semibold">
                    Limpar
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
                          onChangeText={setEditingOccurredOn}
                          placeholder="AAAA-MM-DD"
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
                    <Text style={{ color: "rgba(255,255,255,0.60)", marginTop: 4 }}>{formatDateTime(entry.created_at)}</Text>
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
