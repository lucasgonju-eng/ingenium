import { useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import type { AdminXpActivityAwardRow, FullStudentRow, RankingStudentRow } from "../../../lib/supabase/queries";
import { colors, radii, spacing, typography } from "../../../lib/theme/tokens";
import AvatarWithFallback from "../../ui/AvatarWithFallback";
import { Text } from "../../ui/Text";

type PeriodFilter = "7d" | "30d" | "90d" | "all";
type SegmentFilter = "all" | "fundamental" | "medio";
type RankingScope = "geral" | "fundamental" | "medio" | "serie";

type Props = {
  awards: AdminXpActivityAwardRow[];
  students: FullStudentRow[];
  rankingRows: RankingStudentRow[];
  loading?: boolean;
  errorText?: string | null;
  onRetry?: () => void;
};

type HighlightsProps = Props & {
  onOpenBiTab?: () => void;
};

type ChartDatum = {
  label: string;
  value: number;
  secondary?: string | null;
};

type RankingEntry = {
  position: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  grade: string | null;
  total_points: number;
  lobo_class: "bronze" | "silver" | "gold";
};

const GRADE_ORDER = ["6º Ano", "7º Ano", "8º Ano", "9º Ano", "1ª Série", "2ª Série", "3ª Série"] as const;
const ALL_GRADES = "__all__";

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "all", label: "Tudo" },
];

const SEGMENT_OPTIONS: Array<{ value: SegmentFilter; label: string }> = [
  { value: "all", label: "Geral" },
  { value: "fundamental", label: "Fundamental" },
  { value: "medio", label: "Médio" },
];

const RANKING_OPTIONS: Array<{ value: RankingScope; label: string }> = [
  { value: "geral", label: "Ranking geral" },
  { value: "fundamental", label: "Ranking Fundamental" },
  { value: "medio", label: "Ranking Médio" },
  { value: "serie", label: "Ranking por série" },
];

function normalizeGrade(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function getGradeIndex(value: string) {
  const grade = normalizeGrade(value);
  const index = GRADE_ORDER.indexOf(grade as (typeof GRADE_ORDER)[number]);
  return index === -1 ? 999 : index;
}

function sortGrades(values: string[]) {
  return [...values].sort((a, b) => {
    const diff = getGradeIndex(a) - getGradeIndex(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b, "pt-BR");
  });
}

function getSegmentFromGrade(value: string | null | undefined): Exclude<SegmentFilter, "all"> | null {
  const grade = normalizeGrade(value);
  if (!grade) return null;
  if (["6º Ano", "7º Ano", "8º Ano"].includes(grade)) return "fundamental";
  if (["9º Ano", "1ª Série", "2ª Série", "3ª Série"].includes(grade)) return "medio";
  return null;
}

function getAwardGrade(row: AdminXpActivityAwardRow) {
  return normalizeGrade(row.student_grade || row.target_grade);
}

function getAwardSegment(row: AdminXpActivityAwardRow): Exclude<SegmentFilter, "all"> {
  return getSegmentFromGrade(getAwardGrade(row)) ?? row.target_group;
}

function getPeriodDays(period: PeriodFilter) {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return null;
}

function isWithinPeriod(value: string, period: PeriodFilter) {
  const days = getPeriodDays(period);
  if (!days) return true;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - (days - 1));
  return parsed >= minDate && parsed <= today;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("pt-BR");
}

function formatDayLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function buildRankingEntries(rows: RankingStudentRow[]): RankingEntry[] {
  return rows.map((row, index) => ({
    position: index + 1,
    user_id: row.user_id,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    grade: row.grade ?? null,
    total_points: Number(row.total_points ?? 0),
    lobo_class: row.lobo_class,
  }));
}

function collectAllGrades(students: FullStudentRow[], awards: AdminXpActivityAwardRow[]) {
  const values = new Set<string>();
  students.forEach((student) => {
    const grade = normalizeGrade(student.grade);
    if (grade) values.add(grade);
  });
  awards.forEach((award) => {
    const grade = getAwardGrade(award);
    if (grade) values.add(grade);
  });
  return sortGrades(Array.from(values));
}

function buildAnalytics(input: {
  awards: AdminXpActivityAwardRow[];
  students: FullStudentRow[];
  rankingRows: RankingStudentRow[];
  period: PeriodFilter;
  segment: SegmentFilter;
  selectedGrade: string;
  rankingScope: RankingScope;
}) {
  const { awards, students, rankingRows, period, segment, selectedGrade, rankingScope } = input;
  const allGrades = collectAllGrades(students, awards);

  const filteredAwards = awards.filter((award) => {
    const awardGrade = getAwardGrade(award);
    const awardSegment = getAwardSegment(award);
    if (!isWithinPeriod(award.occurred_on, period)) return false;
    if (segment !== "all" && awardSegment !== segment) return false;
    if (selectedGrade !== ALL_GRADES && awardGrade !== selectedGrade) return false;
    return true;
  });

  const impactedStudents = new Set<string>();
  const batches = new Set<string>();
  const segmentTotals = { fundamental: 0, medio: 0 };
  const gradeMap = new Map<string, { xp: number; students: Set<string> }>();
  const activityMap = new Map<string, { xp: number; students: Set<string> }>();
  const launcherMap = new Map<string, { xp: number; batches: Set<string>; label: string }>();
  const dailyMap = new Map<string, number>();

  filteredAwards.forEach((award) => {
    const xp = Number(award.xp_amount ?? 0);
    const awardGrade = getAwardGrade(award) || "Sem série";
    const awardSegment = getAwardSegment(award);
    const activityTitle = award.activity_title || "Atividade sem nome";
    const launcherKey = award.created_by || award.created_by_name || "desconhecido";
    const launcherLabel = award.created_by_name?.trim() || "Usuário administrativo";

    impactedStudents.add(award.student_id);
    batches.add(award.award_batch_id);
    segmentTotals[awardSegment] += xp;

    const gradeEntry = gradeMap.get(awardGrade) ?? { xp: 0, students: new Set<string>() };
    gradeEntry.xp += xp;
    gradeEntry.students.add(award.student_id);
    gradeMap.set(awardGrade, gradeEntry);

    const activityEntry = activityMap.get(activityTitle) ?? { xp: 0, students: new Set<string>() };
    activityEntry.xp += xp;
    activityEntry.students.add(award.student_id);
    activityMap.set(activityTitle, activityEntry);

    const launcherEntry = launcherMap.get(launcherKey) ?? { xp: 0, batches: new Set<string>(), label: launcherLabel };
    launcherEntry.xp += xp;
    launcherEntry.batches.add(award.award_batch_id);
    launcherMap.set(launcherKey, launcherEntry);

    dailyMap.set(award.occurred_on, (dailyMap.get(award.occurred_on) ?? 0) + xp);
  });

  const totalXp = filteredAwards.reduce((sum, award) => sum + Number(award.xp_amount ?? 0), 0);
  const averageXpPerStudent = impactedStudents.size > 0 ? Math.round(totalXp / impactedStudents.size) : 0;
  const averageXpPerBatch = batches.size > 0 ? Math.round(totalXp / batches.size) : 0;

  const topGrades = Array.from(gradeMap.entries())
    .map(([label, entry]) => ({
      label,
      value: entry.xp,
      secondary: `${entry.students.size} aluno(s)`,
    }))
    .sort((a, b) => b.value - a.value || getGradeIndex(a.label) - getGradeIndex(b.label))
    .slice(0, 7);

  const topActivities = Array.from(activityMap.entries())
    .map(([label, entry]) => ({
      label,
      value: entry.xp,
      secondary: `${entry.students.size} aluno(s)`,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 6);

  const topLaunchers = Array.from(launcherMap.values())
    .map((entry) => ({
      label: entry.label,
      value: entry.xp,
      secondary: `${entry.batches.size} lote(s)`,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 5);

  const dailySeries = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .map(([date, value]) => ({
      label: formatDayLabel(date),
      value,
      secondary: date,
    }));

  const filteredRanking = rankingRows.filter((row) => {
    const rowSegment = getSegmentFromGrade(row.grade);
    if (rankingScope === "fundamental") return rowSegment === "fundamental";
    if (rankingScope === "medio") return rowSegment === "medio";
    if (rankingScope === "serie") return selectedGrade !== ALL_GRADES && normalizeGrade(row.grade) === selectedGrade;
    return true;
  });

  const sortedRanking = [...filteredRanking].sort((a, b) => {
    const diff = Number(b.total_points ?? 0) - Number(a.total_points ?? 0);
    if (diff !== 0) return diff;
    return (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR");
  });

  const rankingEntries = buildRankingEntries(sortedRanking).slice(0, 10);
  const topScorersChart = rankingEntries.slice(0, 7).map((entry) => ({
    label: (entry.full_name ?? "Sem nome").split(" ")[0] || "Aluno",
    value: entry.total_points,
    secondary: entry.grade ?? "Sem série",
  }));

  return {
    allGrades,
    empty: filteredAwards.length === 0,
    totalXp,
    totalLaunches: batches.size,
    totalLaunchers: launcherMap.size,
    impactedStudents: impactedStudents.size,
    averageXpPerStudent,
    averageXpPerBatch,
    segmentTotals,
    topGrades,
    topActivities,
    topLaunchers,
    dailySeries,
    bestGrade: topGrades[0]?.label ?? "Sem série",
    bestGradeXp: topGrades[0]?.value ?? 0,
    bestActivity: topActivities[0]?.label ?? "Sem atividade",
    bestActivityXp: topActivities[0]?.value ?? 0,
    rankingEntries,
    topScorersChart,
  };
}

function StatCard({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <View style={metricCardStyle}>
      <Text style={{ color: "rgba(255,255,255,0.64)", fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.einsteinYellow, marginTop: 4, fontSize: typography.subtitle.fontSize }} weight="bold">
        {value}
      </Text>
      {help ? <Text style={{ color: "rgba(255,255,255,0.56)", marginTop: 6, fontSize: 11 }}>{help}</Text> : null}
    </View>
  );
}

function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={{
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: active ? "rgba(255,199,0,0.45)" : colors.borderSoft,
              backgroundColor: active ? "rgba(255,199,0,0.16)" : "rgba(255,255,255,0.04)",
              paddingHorizontal: spacing.sm,
              paddingVertical: 6,
              opacity: option.disabled ? 0.45 : 1,
            }}
          >
            <Text style={{ color: active ? colors.einsteinYellow : "rgba(255,255,255,0.82)", fontSize: 12 }} weight="semibold">
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={sectionCardStyle}>
      <Text style={{ color: colors.white }} weight="bold">{title}</Text>
      {subtitle ? <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>{subtitle}</Text> : null}
      <View style={{ marginTop: spacing.sm }}>{children}</View>
    </View>
  );
}

function SvgBarChart({ data }: { data: ChartDatum[] }) {
  const width = 520;
  const height = 220;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const barWidth = width / Math.max(data.length * 1.4, 1);

  return (
    <View>
      <Svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        {data.map((item, index) => {
          const x = 18 + index * (barWidth + 18);
          const barHeight = (item.value / maxValue) * (height - 46);
          const y = height - barHeight - 10;
          return (
            <Rect
              key={`${item.label}-${item.secondary ?? ""}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={8}
              fill="rgba(255,199,0,0.82)"
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs }}>
        {data.map((item) => (
          <View key={`${item.label}-${item.secondary ?? ""}`} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: colors.einsteinYellow, fontSize: 11 }} weight="bold">
              {formatNumber(item.value)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 11, marginTop: 2 }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HorizontalBars({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  return (
    <View style={{ gap: spacing.sm }}>
      {data.map((item) => {
        const widthPct = Math.max(8, Math.round((item.value / maxValue) * 100));
        return (
          <View key={`${item.label}-${item.secondary ?? ""}`} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.xs }}>
              <Text style={{ color: colors.white, flex: 1 }} weight="semibold">{item.label}</Text>
              <Text style={{ color: colors.einsteinYellow }} weight="bold">{formatNumber(item.value)} XP</Text>
            </View>
            <View style={trackStyle}>
              <View style={[fillStyle, { width: `${widthPct}%` }]} />
            </View>
            {item.secondary ? <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 11 }}>{item.secondary}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function SegmentSplit({ fundamental, medio }: { fundamental: number; medio: number }) {
  const total = Math.max(fundamental + medio, 1);
  const fundamentalPct = Math.round((fundamental / total) * 100);
  const medioPct = Math.round((medio / total) * 100);
  return (
    <View>
      <View style={segmentTrackStyle}>
        <View style={[segmentFundamentalStyle, { width: `${fundamentalPct}%` }]} />
        <View style={[segmentMedioStyle, { width: `${medioPct}%` }]} />
      </View>
      <View style={{ marginTop: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
        <View style={legendCardStyle}>
          <Text style={{ color: "#93c5fd", fontSize: 12 }}>Fundamental</Text>
          <Text style={{ color: colors.white, marginTop: 4 }} weight="bold">{formatNumber(fundamental)} XP</Text>
          <Text style={{ color: "rgba(255,255,255,0.56)", marginTop: 2, fontSize: 11 }}>{fundamentalPct}% do total</Text>
        </View>
        <View style={legendCardStyle}>
          <Text style={{ color: "#f9a8d4", fontSize: 12 }}>Médio</Text>
          <Text style={{ color: colors.white, marginTop: 4 }} weight="bold">{formatNumber(medio)} XP</Text>
          <Text style={{ color: "rgba(255,255,255,0.56)", marginTop: 2, fontSize: 11 }}>{medioPct}% do total</Text>
        </View>
      </View>
    </View>
  );
}

function RankingTable({ rows, title }: { rows: RankingEntry[]; title: string }) {
  return (
    <Card title={title} subtitle="Ranking institucional filtrado pelos botões do BI.">
      {rows.length === 0 ? (
        <Text style={{ color: "rgba(255,255,255,0.65)" }}>Nenhum aluno encontrado para esse recorte.</Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {rows.map((row) => (
            <View key={row.user_id} style={rankingRowStyle}>
              <Text style={{ color: "rgba(255,255,255,0.74)", width: 30 }} weight="bold">{row.position}º</Text>
              <AvatarWithFallback fullName={row.full_name ?? "Aluno"} avatarUrl={row.avatar_url} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.white }} weight="semibold">{row.full_name ?? "Sem nome"}</Text>
                <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 11 }}>{row.grade ?? "Sem série"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.einsteinYellow }} weight="bold">{formatNumber(row.total_points)} XP</Text>
                <Text style={{ color: "rgba(255,255,255,0.56)", fontSize: 11 }}>
                  {row.lobo_class === "gold" ? "Ouro" : row.lobo_class === "silver" ? "Prata" : "Bronze"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function LoadingCard({ title }: { title: string }) {
  return (
    <View style={sectionCardStyle}>
      <Text style={{ color: colors.white }} weight="bold">{title}</Text>
      <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: spacing.sm }}>Carregando dados analíticos...</Text>
    </View>
  );
}

function ErrorCard({ errorText, onRetry }: { errorText: string; onRetry?: () => void }) {
  return (
    <View style={sectionCardStyle}>
      <Text style={{ color: "#fca5a5" }} weight="bold">Falha ao carregar BI</Text>
      <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, lineHeight: 20 }}>{errorText}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={secondaryActionStyle}>
          <Text style={{ color: colors.einsteinYellow }} weight="bold">Tentar novamente</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AdminBiHighlights({ awards, students, rankingRows, loading = false, errorText = null, onRetry, onOpenBiTab }: HighlightsProps) {
  const analytics = useMemo(
    () =>
      buildAnalytics({
        awards,
        students,
        rankingRows,
        period: "30d",
        segment: "all",
        selectedGrade: ALL_GRADES,
        rankingScope: "geral",
      }),
    [awards, students, rankingRows],
  );

  if (loading) return <LoadingCard title="Resumo do BI" />;
  if (errorText) return <ErrorCard errorText={errorText} onRetry={onRetry} />;

  return (
    <View style={sectionCardStyle}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={{ color: colors.white }} weight="bold">Resumo BI de XP</Text>
          <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>
            Leitura executiva dos últimos 30 dias para o admin enxergar impacto, atividade e segmento com mais clareza.
          </Text>
        </View>
        {onOpenBiTab ? (
          <Pressable onPress={onOpenBiTab} style={secondaryActionStyle}>
            <Text style={{ color: colors.einsteinYellow }} weight="bold">Abrir BI completo</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.sm, flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        <StatCard label="XP lançado" value={`${formatNumber(analytics.totalXp)} XP`} help="Últimos 30 dias" />
        <StatCard label="Alunos impactados" value={formatNumber(analytics.impactedStudents)} help="Alunos distintos" />
        <StatCard label="Lotes enviados" value={formatNumber(analytics.totalLaunches)} help="Envios administrativos" />
        <StatCard label="Média por aluno" value={`${formatNumber(analytics.averageXpPerStudent)} XP`} help="No período" />
      </View>

      <View style={{ marginTop: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <View style={summaryCardStyle}>
          <Text style={{ color: colors.white }} weight="semibold">Segmento líder</Text>
          <Text style={{ color: colors.einsteinYellow, marginTop: 8, fontSize: typography.subtitle.fontSize }} weight="bold">
            {analytics.segmentTotals.fundamental >= analytics.segmentTotals.medio ? "Fundamental" : "Médio"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>
            Fundamental: {formatNumber(analytics.segmentTotals.fundamental)} XP
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 2 }}>
            Médio: {formatNumber(analytics.segmentTotals.medio)} XP
          </Text>
        </View>

        <View style={summaryCardStyle}>
          <Text style={{ color: colors.white }} weight="semibold">Série em destaque</Text>
          <Text style={{ color: colors.einsteinYellow, marginTop: 8, fontSize: typography.subtitle.fontSize }} weight="bold">
            {analytics.bestGrade}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>
            {formatNumber(analytics.bestGradeXp)} XP lançados
          </Text>
        </View>

        <View style={summaryCardStyle}>
          <Text style={{ color: colors.white }} weight="semibold">Atividade com maior volume</Text>
          <Text numberOfLines={2} style={{ color: colors.einsteinYellow, marginTop: 8, fontSize: typography.subtitle.fontSize }} weight="bold">
            {analytics.bestActivity}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>
            {formatNumber(analytics.bestActivityXp)} XP distribuídos
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AdminBiSection({ awards, students, rankingRows, loading = false, errorText = null, onRetry }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>(ALL_GRADES);
  const [rankingScope, setRankingScope] = useState<RankingScope>("geral");

  const analytics = useMemo(
    () =>
      buildAnalytics({
        awards,
        students,
        rankingRows,
        period,
        segment,
        selectedGrade,
        rankingScope,
      }),
    [awards, students, rankingRows, period, segment, selectedGrade, rankingScope],
  );

  const gradeOptions = useMemo(
    () => [{ value: ALL_GRADES, label: "Todas as séries" }, ...analytics.allGrades.map((grade) => ({ value: grade, label: grade }))],
    [analytics.allGrades],
  );

  if (loading) return <LoadingCard title="BI administrativo" />;
  if (errorText) return <ErrorCard errorText={errorText} onRetry={onRetry} />;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={sectionCardStyle}>
        <Text style={{ color: colors.white, fontSize: typography.titleMd.fontSize }} weight="bold">BI administrativo de XP</Text>
        <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs, lineHeight: 20 }}>
          Painel analítico do admin com filtros por período, segmento e série, usando os lançamentos de XP e o ranking institucional já disponíveis no projeto.
        </Text>

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <View>
            <Text style={filterLabelStyle}>Período</Text>
            <FilterPills options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          </View>
          <View>
            <Text style={filterLabelStyle}>Segmento</Text>
            <FilterPills options={SEGMENT_OPTIONS} value={segment} onChange={setSegment} />
          </View>
          <View>
            <Text style={filterLabelStyle}>Série</Text>
            <FilterPills
              options={gradeOptions}
              value={selectedGrade}
              onChange={(value) => {
                setSelectedGrade(value);
                if (value === ALL_GRADES && rankingScope === "serie") setRankingScope("geral");
              }}
            />
          </View>
        </View>
      </View>

      {analytics.empty ? (
        <View style={sectionCardStyle}>
          <Text style={{ color: colors.white }} weight="bold">Sem dados no recorte atual</Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: spacing.xs }}>
            Ajuste os filtros para visualizar os lançamentos administrativos de XP.
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <StatCard label="XP lançado" value={`${formatNumber(analytics.totalXp)} XP`} help="XP administrativo filtrado" />
            <StatCard label="Alunos impactados" value={formatNumber(analytics.impactedStudents)} help="Alunos com lançamento" />
            <StatCard label="Lotes" value={formatNumber(analytics.totalLaunches)} help="Agrupamentos de envio" />
            <StatCard label="Média por aluno" value={`${formatNumber(analytics.averageXpPerStudent)} XP`} help="No recorte atual" />
            <StatCard label="Média por lote" value={`${formatNumber(analytics.averageXpPerBatch)} XP`} help="Distribuição operacional" />
            <StatCard label="Usuários lançando" value={formatNumber(analytics.totalLaunchers)} help="Operadores distintos" />
          </View>

          <Card title="Fundamental x Médio" subtitle="Distribuição do XP administrativo filtrado.">
            <SegmentSplit fundamental={analytics.segmentTotals.fundamental} medio={analytics.segmentTotals.medio} />
          </Card>

          <Card title="Evolução diária do XP" subtitle="Últimos 10 dias com lançamento dentro do recorte.">
            <SvgBarChart data={analytics.dailySeries} />
          </Card>

          <Card title="XP por série" subtitle="Séries com maior volume de XP administrativo.">
            <SvgBarChart data={analytics.topGrades} />
          </Card>

          <Card title="Maiores pontuadores" subtitle="Alunos com maior pontuação institucional no recorte atual, em barras verticais.">
            <SvgBarChart data={analytics.topScorersChart} />
          </Card>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <View style={twoColumnStyle}>
              <Card title="Atividades com mais XP" subtitle="Top atividades por volume lançado.">
                <HorizontalBars data={analytics.topActivities} />
              </Card>
            </View>
            <View style={twoColumnStyle}>
              <Card title="Usuários que mais lançaram XP" subtitle="Volume operacional por usuário administrativo.">
                <HorizontalBars data={analytics.topLaunchers} />
              </Card>
            </View>
          </View>

          <View style={sectionCardStyle}>
            <Text style={{ color: colors.white }} weight="bold">Ranking institucional</Text>
            <Text style={{ color: "rgba(255,255,255,0.68)", marginTop: 4 }}>
              Este ranking continua usando a pontuação institucional do sistema, mas agora pode ser filtrado por Fundamental, Médio ou série.
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <FilterPills
                options={RANKING_OPTIONS.map((option) => ({
                  ...option,
                  disabled: option.value === "serie" && selectedGrade === ALL_GRADES,
                }))}
                value={rankingScope}
                onChange={setRankingScope}
              />
            </View>
          </View>

          <RankingTable
            rows={analytics.rankingEntries}
            title={
              rankingScope === "fundamental"
                ? "Ranking do Fundamental"
                : rankingScope === "medio"
                  ? "Ranking do Médio"
                  : rankingScope === "serie" && selectedGrade !== ALL_GRADES
                    ? `Ranking da ${selectedGrade}`
                    : "Ranking geral"
            }
          />
        </>
      )}
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

const metricCardStyle = {
  minWidth: 160,
  flexGrow: 1,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

const summaryCardStyle = {
  flex: 1,
  minWidth: 220,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

const secondaryActionStyle = {
  marginTop: spacing.sm,
  alignSelf: "flex-start" as const,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: "rgba(255,199,0,0.45)",
  backgroundColor: "rgba(255,199,0,0.12)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 10,
};

const filterLabelStyle = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
  marginBottom: 6,
};

const trackStyle = {
  height: 10,
  borderRadius: radii.pill,
  overflow: "hidden" as const,
  backgroundColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
  borderColor: colors.borderSoft,
};

const fillStyle = {
  height: "100%" as const,
  borderRadius: radii.pill,
  backgroundColor: "rgba(255,199,0,0.85)",
};

const segmentTrackStyle = {
  height: 20,
  borderRadius: radii.pill,
  overflow: "hidden" as const,
  flexDirection: "row" as const,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.04)",
};

const segmentFundamentalStyle = {
  height: "100%" as const,
  backgroundColor: "rgba(96,165,250,0.88)",
};

const segmentMedioStyle = {
  height: "100%" as const,
  backgroundColor: "rgba(244,114,182,0.88)",
};

const legendCardStyle = {
  flex: 1,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: spacing.sm,
};

const twoColumnStyle = {
  flex: 1,
  minWidth: 320,
};

const rankingRowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: spacing.xs,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  backgroundColor: "rgba(255,255,255,0.03)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 10,
};
