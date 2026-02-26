import { Pressable, TextInput, View } from "react-native";
import { Text } from "../ui/Text";
import { colors, radii, spacing, typography } from "../../lib/theme/tokens";
import type { FullStudentRow, RankingStudentRow, TeacherRow } from "../../lib/supabase/queries";

const GRADE_ORDER = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;

type AdminCoreTab = "dashboard" | "alunos" | "professores" | "perfil";

export function getAdminCoreTabs() {
  return [
    { key: "dashboard" as const, label: "Visão geral" },
    { key: "alunos" as const, label: "Alunos" },
    { key: "professores" as const, label: "Professores" },
    { key: "perfil" as const, label: "Perfil" },
  ];
}

type Props = {
  activeTab: AdminCoreTab;
  students: FullStudentRow[];
  rankingRows: RankingStudentRow[];
  teachers: TeacherRow[];
  teacherFullName: string;
  teacherDisplayName: string;
  teacherEmail: string;
  teacherArea: string;
  selectedCreateOlympiadId: string;
  teacherPendingOlympiadName: string;
  olympiadSelectionByTeacher: Record<string, string>;
  newPassword: string;
  confirmPassword: string;
  savingPassword: boolean;
  savingTeacher: boolean;
  assigningTeacherId: string | null;
  olympiads: Array<{ id: string; title: string }>;
  onTeacherFullNameChange: (value: string) => void;
  onTeacherDisplayNameChange: (value: string) => void;
  onTeacherEmailChange: (value: string) => void;
  onTeacherAreaChange: (value: string) => void;
  onCreateOlympiadChange: (value: string) => void;
  onTeacherPendingOlympiadNameChange: (value: string) => void;
  onTeacherOlympiadSelectionChange: (teacherId: string, olympiadId: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSaveTeacher: () => void;
  onAssignTeacher: (teacherId: string, olympiadId: string) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onUpdatePassword: () => void;
  onOpenProfileSettings: () => void;
  enableBulkDelete?: boolean;
  selectedStudentIds?: string[];
  selectedTeacherIds?: string[];
  onToggleStudentSelection?: (studentId: string) => void;
  onToggleTeacherSelection?: (teacherId: string) => void;
  onSelectAllStudents?: () => void;
  onClearStudentSelection?: () => void;
  onSelectAllTeachers?: () => void;
  onClearTeacherSelection?: () => void;
  onDeleteSelectedStudents?: () => void;
  onDeleteSelectedTeachers?: () => void;
  onActivateSelectedStudents?: () => void;
  onActivateSelectedTeachers?: () => void;
  onSetStudentActive?: (studentId: string, isActive: boolean) => void;
  onSetTeacherActive?: (teacherId: string, isActive: boolean) => void;
};

export default function AdminCoreDashboard(props: Props) {
  const {
    activeTab,
    students,
    rankingRows,
    teachers,
    teacherFullName,
    teacherDisplayName,
    teacherEmail,
    teacherArea,
    selectedCreateOlympiadId,
    teacherPendingOlympiadName,
    olympiadSelectionByTeacher,
    newPassword,
    confirmPassword,
    savingPassword,
    savingTeacher,
    assigningTeacherId,
    olympiads,
    onTeacherFullNameChange,
    onTeacherDisplayNameChange,
    onTeacherEmailChange,
    onTeacherAreaChange,
    onCreateOlympiadChange,
    onTeacherPendingOlympiadNameChange,
    onTeacherOlympiadSelectionChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSaveTeacher,
    onAssignTeacher,
    onRemoveAssignment,
    onUpdatePassword,
    onOpenProfileSettings,
    enableBulkDelete = false,
    selectedStudentIds = [],
    selectedTeacherIds = [],
    onToggleStudentSelection,
    onToggleTeacherSelection,
    onSelectAllStudents,
    onClearStudentSelection,
    onSelectAllTeachers,
    onClearTeacherSelection,
    onDeleteSelectedStudents,
    onDeleteSelectedTeachers,
    onActivateSelectedStudents,
    onActivateSelectedTeachers,
    onSetStudentActive,
    onSetTeacherActive,
  } = props;

  const totalStudents = students.length;
  const totalXp = rankingRows.reduce((sum, row) => sum + Number(row.total_points || 0), 0);
  const avgXp = totalStudents > 0 ? Math.round(totalXp / totalStudents) : 0;
  const withXp = rankingRows.filter((row) => Number(row.total_points || 0) > 0).length;
  const topStudents = rankingRows.slice(0, 10);
  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    label: teacher.display_name ?? teacher.full_name ?? "Sem nome",
  }));

  const seriesSummary = [...students.reduce((acc, row) => {
    const grade = (row.grade ?? "Sem série").trim() || "Sem série";
    acc.set(grade, (acc.get(grade) ?? 0) + 1);
    return acc;
  }, new Map<string, number>()).entries()]
    .sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a[0] as (typeof GRADE_ORDER)[number]);
      const bi = GRADE_ORDER.indexOf(b[0] as (typeof GRADE_ORDER)[number]);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a[0].localeCompare(b[0], "pt-BR");
    });

  const loboSummary = rankingRows.reduce(
    (acc, row) => {
      if (row.lobo_class === "gold") acc.gold += 1;
      else if (row.lobo_class === "silver") acc.silver += 1;
      else acc.bronze += 1;
      return acc;
    },
    { gold: 0, silver: 0, bronze: 0 },
  );

  if (activeTab === "dashboard") {
    return (
      <>
        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">KPIs principais</Text>
          <View style={{ marginTop: spacing.sm, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {[
              { label: "Alunos cadastrados", value: totalStudents.toLocaleString("pt-BR") },
              { label: "Alunos com XP", value: withXp.toLocaleString("pt-BR") },
              { label: "XP total", value: totalXp.toLocaleString("pt-BR") },
              { label: "Média XP/aluno", value: avgXp.toLocaleString("pt-BR") },
            ].map((item) => (
              <View key={item.label} style={metricItemStyle}>
                <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 12 }}>{item.label}</Text>
                <Text style={{ color: colors.einsteinYellow, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Distribuição por classe Lobo</Text>
          <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
            {[
              { label: "Ouro", value: loboSummary.gold, color: "#facc15" },
              { label: "Prata", value: loboSummary.silver, color: "#d1d5db" },
              { label: "Bronze", value: loboSummary.bronze, color: "#d97706" },
            ].map((item) => (
              <View key={item.label} style={loboItemStyle}>
                <Text style={{ color: item.color }} weight="bold">{item.label}</Text>
                <Text style={{ color: colors.white, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </>
    );
  }

  if (activeTab === "alunos") {
    return (
      <>
        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Alunos por série</Text>
          <View style={{ marginTop: spacing.sm, gap: 8 }}>
            {seriesSummary.map(([grade, count]) => (
              <View key={grade} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "rgba(255,255,255,0.86)" }} weight="semibold">{grade}</Text>
                <Text style={{ color: colors.einsteinYellow }} weight="bold">{count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Top 10 por XP</Text>
          <View style={{ marginTop: spacing.sm, gap: 8 }}>
            {topStudents.map((row) => (
              <View key={row.user_id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", width: 28 }} weight="bold">{row.position}º</Text>
                <Text style={{ color: colors.white, flex: 1 }} weight="semibold">{row.full_name ?? "Sem nome"}</Text>
                <Text style={{ color: colors.einsteinYellow }} weight="bold">{row.total_points.toLocaleString("pt-BR")} XP</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Lista completa de alunos</Text>
          {enableBulkDelete ? (
            <View style={{ marginTop: spacing.xs, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              <Pressable onPress={onSelectAllStudents} style={miniActionBtnStyle}>
                <Text style={miniActionTextStyle} weight="semibold">Marcar todos</Text>
              </Pressable>
              <Pressable onPress={onClearStudentSelection} style={miniActionBtnStyle}>
                <Text style={miniActionTextStyle} weight="semibold">Limpar seleção</Text>
              </Pressable>
              <Pressable
                onPress={onDeleteSelectedStudents}
                style={[miniActionBtnStyle, { borderColor: "rgba(252,165,165,0.5)", backgroundColor: "rgba(127,29,29,0.25)" }]}
              >
                <Text style={{ color: "#fecaca", fontSize: 12 }} weight="bold">
                  Desativar selecionados ({selectedStudentIds.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={onActivateSelectedStudents}
                style={[miniActionBtnStyle, { borderColor: "rgba(134,239,172,0.5)", backgroundColor: "rgba(20,83,45,0.25)" }]}
              >
                <Text style={{ color: "#86efac", fontSize: 12 }} weight="bold">
                  Reativar selecionados ({selectedStudentIds.length})
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ marginTop: spacing.sm, gap: 8 }}>
            {students.map((student) => (
              <View key={student.id} style={{ borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(255,255,255,0.03)", padding: spacing.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  {enableBulkDelete ? (
                    <Pressable
                      onPress={() => onToggleStudentSelection?.(student.id)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.35)",
                        backgroundColor: selectedStudentIds.includes(student.id) ? "rgba(255,199,0,0.25)" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: selectedStudentIds.includes(student.id) ? colors.einsteinYellow : "rgba(255,255,255,0.7)", fontSize: 12 }} weight="bold">
                        {selectedStudentIds.includes(student.id) ? "✓" : ""}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Text style={{ color: colors.white, flex: 1 }} weight="semibold">{student.full_name ?? "Sem nome"}</Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 2, fontSize: 12 }}>
                  Série: {student.grade ?? "Sem série"} • Turma: {student.class_name ?? "Sem turma"}
                </Text>
                <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable
                    onPress={() => onSetStudentActive?.(student.id, !(student.is_active ?? true))}
                    style={{ paddingHorizontal: spacing.xs, paddingVertical: 4 }}
                  >
                    <Text style={{ color: student.is_active ?? true ? "#fca5a5" : "#86efac", fontSize: 12 }} weight="semibold">
                      {student.is_active ?? true ? "Desativar" : "Reativar"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </>
    );
  }

  if (activeTab === "professores") {
    return (
      <>
        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Cadastrar professor(a)</Text>
          <TextInput placeholder="Nome completo" placeholderTextColor="rgba(255,255,255,0.45)" value={teacherFullName} onChangeText={onTeacherFullNameChange} style={inputStyle} />
          <TextInput placeholder="Nome a ser exibido" placeholderTextColor="rgba(255,255,255,0.45)" value={teacherDisplayName} onChangeText={onTeacherDisplayNameChange} style={inputStyle} />
          <TextInput placeholder="E-mail" placeholderTextColor="rgba(255,255,255,0.45)" autoCapitalize="none" value={teacherEmail} onChangeText={onTeacherEmailChange} style={inputStyle} />
          <TextInput placeholder="Área (Disciplina)" placeholderTextColor="rgba(255,255,255,0.45)" value={teacherArea} onChangeText={onTeacherAreaChange} style={inputStyle} />
          <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.xs, fontSize: 12 }}>Olimpíada designada</Text>
          <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {olympiads.map((olympiad) => {
              const selected = selectedCreateOlympiadId === olympiad.id;
              return (
                <Pressable
                  key={`create-${olympiad.id}`}
                  onPress={() => onCreateOlympiadChange(olympiad.id)}
                  style={{
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: selected ? "rgba(255,199,0,0.45)" : colors.borderSoft,
                    backgroundColor: selected ? "rgba(255,199,0,0.16)" : "rgba(255,255,255,0.04)",
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: selected ? colors.einsteinYellow : "rgba(255,255,255,0.82)", fontSize: 12 }} weight="semibold">
                    {olympiad.title}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => onCreateOlympiadChange("pending")}
              style={{
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: selectedCreateOlympiadId === "pending" ? "rgba(255,199,0,0.45)" : colors.borderSoft,
                backgroundColor: selectedCreateOlympiadId === "pending" ? "rgba(255,199,0,0.16)" : "rgba(255,255,255,0.04)",
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{ color: selectedCreateOlympiadId === "pending" ? colors.einsteinYellow : "rgba(255,255,255,0.82)", fontSize: 12 }}
                weight="semibold"
              >
                Olimpíada ainda não cadastrada
              </Text>
            </Pressable>
          </View>
          {selectedCreateOlympiadId === "pending" ? (
            <TextInput
              placeholder="Nome da olimpíada pendente"
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={teacherPendingOlympiadName}
              onChangeText={onTeacherPendingOlympiadNameChange}
              style={inputStyle}
            />
          ) : null}
          <Pressable onPress={onSaveTeacher} disabled={savingTeacher} style={[actionBtnStyle, { opacity: savingTeacher ? 0.7 : 1 }]}>
            <Text style={{ color: colors.einsteinBlue }} weight="bold">{savingTeacher ? "Salvando..." : "Salvar e enviar magic link"}</Text>
          </Pressable>
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Professores e olimpíadas designadas</Text>
          {enableBulkDelete ? (
            <View style={{ marginTop: spacing.xs, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              <Pressable onPress={onSelectAllTeachers} style={miniActionBtnStyle}>
                <Text style={miniActionTextStyle} weight="semibold">Marcar todos</Text>
              </Pressable>
              <Pressable onPress={onClearTeacherSelection} style={miniActionBtnStyle}>
                <Text style={miniActionTextStyle} weight="semibold">Limpar seleção</Text>
              </Pressable>
              <Pressable
                onPress={onDeleteSelectedTeachers}
                style={[miniActionBtnStyle, { borderColor: "rgba(252,165,165,0.5)", backgroundColor: "rgba(127,29,29,0.25)" }]}
              >
                <Text style={{ color: "#fecaca", fontSize: 12 }} weight="bold">
                  Desativar selecionados ({selectedTeacherIds.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={onActivateSelectedTeachers}
                style={[miniActionBtnStyle, { borderColor: "rgba(134,239,172,0.5)", backgroundColor: "rgba(20,83,45,0.25)" }]}
              >
                <Text style={{ color: "#86efac", fontSize: 12 }} weight="bold">
                  Reativar selecionados ({selectedTeacherIds.length})
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {teachers.map((teacher) => (
              <View key={teacher.id} style={{ borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(255,255,255,0.03)", padding: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.xs }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                      {enableBulkDelete ? (
                        <Pressable
                          onPress={() => onToggleTeacherSelection?.(teacher.id)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.35)",
                            backgroundColor: selectedTeacherIds.includes(teacher.id) ? "rgba(255,199,0,0.25)" : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: selectedTeacherIds.includes(teacher.id) ? colors.einsteinYellow : "rgba(255,255,255,0.7)", fontSize: 12 }} weight="bold">
                            {selectedTeacherIds.includes(teacher.id) ? "✓" : ""}
                          </Text>
                        </Pressable>
                      ) : null}
                      <Text style={{ color: colors.white, flex: 1 }} weight="semibold">{teacher.full_name ?? "Sem nome"}</Text>
                    </View>
                    <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 2, fontSize: 12 }}>
                      Exibição: {teacher.display_name ?? "Sem nome"} • {teacher.email ?? "Sem e-mail"} {teacher.subject_area ? `• ${teacher.subject_area}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => onSetTeacherActive?.(teacher.id, !(teacher.is_active ?? true))} style={{ paddingHorizontal: spacing.xs, paddingVertical: 4 }}>
                    <Text style={{ color: teacher.is_active ?? true ? "#fca5a5" : "#86efac", fontSize: 12 }} weight="semibold">
                      {teacher.is_active ?? true ? "Desativar" : "Reativar"}
                    </Text>
                  </Pressable>
                </View>

                <View style={{ marginTop: spacing.xs, gap: 6 }}>
                  {teacher.assignments.length === 0 ? (
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Sem olimpíadas vinculadas.</Text>
                  ) : (
                    teacher.assignments.map((assignment) => (
                      <View key={assignment.assignment_id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: "rgba(255,255,255,0.85)", flex: 1 }}>
                          {assignment.olympiad_title ?? `Pendente: ${assignment.pending_olympiad_name ?? "Sem nome"}`}
                        </Text>
                        <Pressable onPress={() => onRemoveAssignment(assignment.assignment_id)}>
                          <Text style={{ color: "#fca5a5", fontSize: 12 }} weight="semibold">Remover</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>

                <View style={{ marginTop: spacing.xs }}>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}>Vincular nova olimpíada</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    {olympiads.map((olympiad) => {
                      const selected = olympiadSelectionByTeacher[teacher.id] === olympiad.id;
                      return (
                        <Pressable
                          key={`${teacher.id}-${olympiad.id}`}
                          onPress={() => onTeacherOlympiadSelectionChange(teacher.id, olympiad.id)}
                          style={{
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: selected ? "rgba(255,199,0,0.45)" : colors.borderSoft,
                            backgroundColor: selected ? "rgba(255,199,0,0.16)" : "rgba(255,255,255,0.04)",
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 6,
                          }}
                        >
                          <Text style={{ color: selected ? colors.einsteinYellow : "rgba(255,255,255,0.82)", fontSize: 12 }} weight="semibold">
                            {olympiad.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    onPress={() => {
                      const selectedOlympiadId = olympiadSelectionByTeacher[teacher.id];
                      if (!selectedOlympiadId) return;
                      onAssignTeacher(teacher.id, selectedOlympiadId);
                    }}
                    disabled={!olympiadSelectionByTeacher[teacher.id] || assigningTeacherId === teacher.id}
                    style={{
                      marginTop: spacing.xs,
                      height: 38,
                      borderRadius: radii.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1,
                      borderColor: colors.borderSoft,
                      opacity: !olympiadSelectionByTeacher[teacher.id] || assigningTeacherId === teacher.id ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: colors.white }} weight="semibold">
                      {assigningTeacherId === teacher.id ? "Vinculando..." : "Vincular selecionada"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Edição de professores por olimpíada</Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            {olympiads.map((olympiad) => {
              const assigned = teachers.flatMap((teacher) =>
                teacher.assignments
                  .filter((assignment) => assignment.olympiad_id === olympiad.id)
                  .map((assignment) => ({
                    assignment_id: assignment.assignment_id,
                    teacher_id: teacher.id,
                    teacher_label: teacher.display_name ?? teacher.full_name ?? "Sem nome",
                  })),
              );
              return (
                <View
                  key={`olympiad-edit-${olympiad.id}`}
                  style={{ borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(255,255,255,0.03)", padding: spacing.sm }}
                >
                  <Text style={{ color: colors.white }} weight="semibold">{olympiad.title}</Text>
                  <View style={{ marginTop: 6, gap: 6 }}>
                    {assigned.length === 0 ? (
                      <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Nenhum professor designado.</Text>
                    ) : (
                      assigned.map((item) => (
                        <View key={item.assignment_id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ color: "rgba(255,255,255,0.85)", flex: 1 }}>{item.teacher_label}</Text>
                          <Pressable onPress={() => onRemoveAssignment(item.assignment_id)}>
                            <Text style={{ color: "#fca5a5", fontSize: 12 }} weight="semibold">Remover</Text>
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.xs, fontSize: 12 }}>Adicionar professor(es)</Text>
                  <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    {teacherOptions.map((teacherOption) => (
                      <Pressable
                        key={`assign-by-olympiad-${olympiad.id}-${teacherOption.id}`}
                        onPress={() => onAssignTeacher(teacherOption.id, olympiad.id)}
                        style={{
                          borderRadius: radii.pill,
                          borderWidth: 1,
                          borderColor: colors.borderSoft,
                          backgroundColor: "rgba(255,255,255,0.04)",
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12 }} weight="semibold">
                          {teacherOption.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </>
    );
  }

  return (
    <View style={sectionCardStyle}>
      <Text style={{ color: colors.white }} weight="bold">Perfil da conta</Text>
      <Text style={{ color: "rgba(255,255,255,0.76)", marginTop: spacing.xs, lineHeight: 20 }}>
        Atualize nome/foto no perfil e altere a senha da conta de acesso ao painel.
      </Text>
      <Pressable
        onPress={onOpenProfileSettings}
        style={{
          marginTop: spacing.xs,
          height: 40,
          borderRadius: radii.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          borderColor: colors.borderSoft,
        }}
      >
        <Text style={{ color: colors.white }} weight="semibold">Editar nome e foto</Text>
      </Pressable>
      <TextInput placeholder="Nova senha" placeholderTextColor="rgba(255,255,255,0.45)" secureTextEntry value={newPassword} onChangeText={onNewPasswordChange} style={inputStyle} />
      <TextInput placeholder="Confirmar senha" placeholderTextColor="rgba(255,255,255,0.45)" secureTextEntry value={confirmPassword} onChangeText={onConfirmPasswordChange} style={inputStyle} />
      <Pressable onPress={onUpdatePassword} disabled={savingPassword} style={[actionBtnStyle, { opacity: savingPassword ? 0.7 : 1 }]}>
        <Text style={{ color: colors.einsteinBlue }} weight="bold">{savingPassword ? "Salvando..." : "Atualizar senha"}</Text>
      </Pressable>
    </View>
  );
}

const sectionCardStyle = {
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: colors.surfacePanel,
  padding: spacing.md,
};

const metricItemStyle = {
  minWidth: 150,
  flexGrow: 1,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

const loboItemStyle = {
  flex: 1,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
  alignItems: "center" as const,
};

const inputStyle = {
  marginTop: spacing.xs,
  height: 46,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  color: colors.white,
  paddingHorizontal: spacing.sm,
  fontFamily: typography.fontFamily.base,
};

const actionBtnStyle = {
  marginTop: spacing.sm,
  height: 44,
  borderRadius: radii.md,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.einsteinYellow,
};

const miniActionBtnStyle = {
  borderRadius: radii.pill,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.06)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 6,
};

const miniActionTextStyle = {
  color: "rgba(255,255,255,0.86)",
  fontSize: 12,
};
