import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import StitchScreenFrame from "../../components/layout/StitchScreenFrame";
import OlympiadEnrollmentCTA from "../../components/sections/OlympiadEnrollmentCTA";
import OlympiadHeader from "../../components/sections/OlympiadHeader";
import OlympiadMyPositionCard from "../../components/sections/OlympiadMyPositionCard";
import OlympiadRankingSection from "../../components/sections/OlympiadRankingSection";
import StitchHeader from "../../components/ui/StitchHeader";
import { Text } from "../../components/ui/Text";
import { getOlympiadCatalogBySlug } from "../../lib/olympiads/catalog";
import { supabase } from "../../lib/supabase/client";
import {
  enrollInOlympiad,
  fetchMyEnrollment,
  fetchMyRankInOlympiad,
  fetchOlympiadById,
  fetchRankingOlympiadPublic,
} from "../../lib/supabase/queries";
import { colors, radii, sizes, spacing, typography } from "../../lib/theme/tokens";

type OlympiadDetail = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
};

type RankingRow = {
  user_id: string;
  position_in_olympiad: number;
  full_name: string | null;
  avatar_url: string | null;
  points_in_olympiad: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  none_count: number;
  lobo_class: "bronze" | "silver" | "gold" | null;
};

type MyRank = {
  position: number;
  points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  none_count: number;
} | null;

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function fmtDateRange(start: string, end: string) {
  return `${fmtDate(start)} a ${fmtDate(end)}`;
}

async function openExternalUrl(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Link indisponível", "Não foi possível abrir este link no dispositivo.");
      return;
    }
    await Linking.openURL(url);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Não foi possível abrir o link.";
    Alert.alert("Erro", message);
  }
}

export default function OlimpiadaDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const olympiadId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [olympiad, setOlympiad] = useState<OlympiadDetail | null>(null);
  const [isPersistedOlympiad, setIsPersistedOlympiad] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [myRank, setMyRank] = useState<MyRank>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [topRows, setTopRows] = useState<RankingRow[]>([]);
  const [search, setSearch] = useState("");
  const catalogItem = useMemo(
    () => (olympiadId ? getOlympiadCatalogBySlug(olympiadId) : null),
    [olympiadId],
  );
  const top3 = useMemo(() => topRows.slice(0, 3), [topRows]);
  const restRows = useMemo(() => topRows.slice(3), [topRows]);
  const adjustedRestRows = useMemo(() => {
    if (!myUserId) return restRows;

    const myIndex = restRows.findIndex((row) => row.user_id === myUserId);
    if (myIndex === -1) return restRows;

    const myRow = restRows[myIndex];
    const withoutMe = [...restRows.slice(0, myIndex), ...restRows.slice(myIndex + 1)];
    return [myRow, ...withoutMe];
  }, [restRows, myUserId]);
  const filteredRestRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return adjustedRestRows;
    return adjustedRestRows.filter((row) => (row.full_name ?? "").toLowerCase().includes(q));
  }, [adjustedRestRows, search]);

  const canRegister = useMemo(() => {
    if (catalogItem) {
      return new Date(`${catalogItem.schedule.registrationDeadline}T23:59:59`).getTime() >= Date.now();
    }
    if (!olympiad) return false;
    const isOpen = olympiad.status === "open" || olympiad.status === "published";
    const deadlineOk =
      !olympiad.registration_deadline ||
      new Date(olympiad.registration_deadline).getTime() >= Date.now();
    return isOpen && deadlineOk;
  }, [catalogItem, olympiad]);

  async function load() {
    if (!olympiadId) return;
    try {
      setLoading(true);
      if (catalogItem) {
        const localOlympiad: OlympiadDetail = {
          id: catalogItem.slug,
          title: catalogItem.name,
          description: catalogItem.shortDescription,
          category: catalogItem.category,
          status: "open",
          start_date: catalogItem.schedule.examDate,
          end_date: catalogItem.schedule.examDate,
          registration_deadline: catalogItem.schedule.registrationDeadline,
        };

        setOlympiad(localOlympiad);
        setEnrolled(false);
        setIsPersistedOlympiad(false);
        setMyRank(null);
        setTopRows([]);

        const {
          data: { session },
        } = await supabase.auth.getSession();
        setMyUserId(session?.user?.id ?? null);
        return;
      }

      const [o, e] = await Promise.all([
        fetchOlympiadById(olympiadId),
        fetchMyEnrollment(olympiadId),
      ]);

      const resolvedOlympiad = o as OlympiadDetail | null;

      setOlympiad(resolvedOlympiad as OlympiadDetail | null);
      setEnrolled(e.enrolled);
      setIsPersistedOlympiad(false);

      // A checagem de persistência é opcional e não pode bloquear a tela.
      try {
        const { data: persistedData } = await supabase
          .from("olympiads")
          .select("id")
          .eq("id", olympiadId)
          .maybeSingle();
        setIsPersistedOlympiad(Boolean(persistedData?.id));
      } catch {
        setIsPersistedOlympiad(false);
      }

      const [{ data: sessionData }, mine, top] = await Promise.all([
        supabase.auth.getSession(),
        fetchMyRankInOlympiad(olympiadId),
        fetchRankingOlympiadPublic(olympiadId, 20),
      ]);

      setMyUserId(sessionData.session?.user?.id ?? null);
      setMyRank((mine as MyRank) ?? null);
      setTopRows(top as RankingRow[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao carregar olimpíada";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll() {
    if (!olympiadId || submitting) return;
    if (catalogItem && !isPersistedOlympiad) {
      await openExternalUrl(catalogItem.officialUrl);
      return;
    }
    try {
      setSubmitting(true);
      const result = await enrollInOlympiad(olympiadId);
      if (result.already) {
        Alert.alert("Informação", "Você já está inscrito nesta olimpíada.");
      } else {
        Alert.alert("Sucesso", "Inscrição realizada com sucesso.");
      }
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Falha ao realizar inscrição";
      Alert.alert("Erro", message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleParticipate() {
    if (catalogItem && !isPersistedOlympiad) {
      await openExternalUrl(catalogItem.officialUrl);
      return;
    }
    await handleEnroll();
  }

  useEffect(() => {
    void load();
  }, [olympiadId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text tone="muted" style={{ marginTop: 8 }}>
          Carregando detalhes...
        </Text>
      </View>
    );
  }

  if (!olympiad) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text weight="bold">Olimpíada não encontrada.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text tone="brand" weight="semibold">
            Voltar
          </Text>
        </Pressable>
      </View>
    );
  }

  const ctaLabel = catalogItem
    ? !canRegister
      ? "Inscrições encerradas"
      : "Quero participar"
    : enrolled
      ? "Inscrito ✅"
      : !canRegister
        ? "Inscrições encerradas"
        : submitting
          ? "Inscrevendo..."
          : "Inscrever-se";
  const ctaDisabled = catalogItem ? !canRegister || submitting : enrolled || !canRegister || submitting;

  return (
    <StitchScreenFrame>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        <StitchHeader
          title={olympiad.title}
          onBack={() => router.back()}
          rightSlot={
            <Pressable
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.pill,
                backgroundColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 18 }}>↗</Text>
            </Pressable>
          }
        />

        <View
          style={{
            height: sizes.inputHeight,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.borderSoft,
            backgroundColor: colors.surfacePanel,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.6)", marginRight: spacing.xs }}>⌕</Text>
          <TextInput
            placeholder="Buscar aluno..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              color: colors.white,
              fontFamily: typography.fontFamily.base,
              fontSize: typography.subtitle.fontSize,
            }}
          />
        </View>

        <OlympiadHeader
          title={olympiad.title}
          category={olympiad.category}
          status={olympiad.status}
          organizer={catalogItem?.organizer}
          mentorTeacher={catalogItem?.mentorTeacher}
          startDate={fmtDate(olympiad.start_date)}
          endDate={fmtDate(olympiad.end_date)}
          registrationDeadline={fmtDate(olympiad.registration_deadline)}
        />

        <OlympiadEnrollmentCTA ctaLabel={ctaLabel} ctaDisabled={ctaDisabled} onPress={handleParticipate} />

        {catalogItem ? (
          <View
            style={{
              marginTop: spacing.md,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: sizes.compactCardPadding,
              gap: spacing.xs,
            }}
          >
            <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
              {catalogItem.headline}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)" }}>{catalogItem.longDescription}</Text>

            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ color: "white" }} weight="bold">
                Formato da prova
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4 }}>
                {catalogItem.proofFormat.modalidade} • {catalogItem.proofFormat.estrutura} • {catalogItem.proofFormat.questoes} questões • {catalogItem.proofFormat.tipo}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                Janela: {catalogItem.proofFormat.janelaAplicacao} • Duração: {catalogItem.proofFormat.duracao}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                Regra de início: {catalogItem.proofFormat.regraInicio}
              </Text>
            </View>

            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ color: "white" }} weight="bold">
                Calendário oficial
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", marginTop: 4 }}>
                Inscrições até: {fmtDate(catalogItem.schedule.registrationDeadline)}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                Prova: {fmtDate(catalogItem.schedule.examDate)} (horário de Brasília)
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                Recursos: {fmtDateRange(catalogItem.schedule.appealsWindow.start, catalogItem.schedule.appealsWindow.end)}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                Resultado: {fmtDate(catalogItem.schedule.resultsDate)}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.78)" }}>
                Solicitação de medalhas: {fmtDateRange(catalogItem.schedule.medalsRequestWindow.start, catalogItem.schedule.medalsRequestWindow.end)}
              </Text>
            </View>

            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              <Pressable
                onPress={() => {
                  void openExternalUrl(catalogItem.regulationUrl);
                }}
                style={{
                  height: sizes.buttonHeight,
                  borderRadius: radii.md,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.white }} weight="bold">
                  Ver edital
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void openExternalUrl(catalogItem.officialUrl);
                }}
                style={{
                  height: sizes.buttonHeight,
                  borderRadius: radii.md,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.white }} weight="bold">
                  Site oficial
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleParticipate();
                }}
                style={{
                  height: sizes.buttonHeight,
                  borderRadius: radii.md,
                  backgroundColor: colors.einsteinYellow,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.einsteinBlue }} weight="bold">
                  Quero participar
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <OlympiadMyPositionCard myRank={myRank} />

        <OlympiadRankingSection top3={top3} rows={filteredRestRows} myUserId={myUserId} />

        {olympiad.description ? (
          <View
            style={{
              marginTop: spacing.xl,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              backgroundColor: colors.surfacePanel,
              padding: sizes.compactCardPadding,
            }}
          >
            <Text style={{ color: "white", fontSize: typography.titleMd.fontSize }} weight="bold">
              Descrição
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: spacing.xs }}>{olympiad.description}</Text>
          </View>
        ) : null}
      </ScrollView>
    </StitchScreenFrame>
  );
}
