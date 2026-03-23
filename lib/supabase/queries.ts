import { supabase } from "./client";
import { getOlympiadCatalogBySlug, mergeOlympiadsWithCatalog } from "../olympiads/catalog";

type Olympiad = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  grade: string | null;
  class_name: string | null;
  avatar_url: string | null;
};

export type MyAccessRole = "admin" | "coord" | "gestao" | "teacher" | "student" | null;

export type RegisteredStudentRow = {
  id: string;
  full_name: string | null;
  grade: string | null;
  avatar_url: string | null;
};

export type RankingStudentRow = {
  position: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  grade: string | null;
  total_points: number;
  lobo_class: "bronze" | "silver" | "gold";
};

export type MyXpHistoryRow = {
  id: string;
  event_type: string;
  xp_amount: number;
  occurred_on: string;
  note: string | null;
  source_ref: string | null;
  created_at: string;
};

export type FullStudentRow = {
  id: string;
  full_name: string | null;
  grade: string | null;
  class_name: string | null;
  avatar_url: string | null;
  role: string | null;
  plan_tier?: string | null;
  plan_pro_active?: boolean | null;
  plan_pro_since?: string | null;
  plan_pro_source?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PlanProStudentRow = {
  id: string;
  full_name: string | null;
  grade: string | null;
  class_name: string | null;
  role: string | null;
  plan_tier: string | null;
  plan_pro_active: boolean;
  pro_source: "profile" | "xp_event" | "unknown";
  email: string | null;
  cpf: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  enrollment_number: string | null;
  responsible_name: string | null;
  responsible_phone: string | null;
  responsible_email: string | null;
  responsible_cpf: string | null;
  responsible_relationship: string | null;
  secondary_responsible_name: string | null;
  secondary_responsible_phone: string | null;
  secondary_responsible_email: string | null;
  secondary_responsible_cpf: string | null;
  secondary_responsible_relationship: string | null;
};

export type TeacherRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  subject_area: string | null;
  is_active?: boolean | null;
  assignments: Array<{
    assignment_id: string;
    olympiad_id: string | null;
    olympiad_title: string | null;
    pending_olympiad_name: string | null;
    display_name: string | null;
    subject_area: string | null;
  }>;
};

export type AccessRequestRow = {
  id: string;
  request_type: "teacher" | "collaborator";
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  cpf: string | null;
  subject_area: string | null;
  intended_olympiad: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
};

export type SaasAnalyticsOverview = {
  period_days: number;
  since_utc: string;
  total_events: number;
  total_sessions: number;
  active_users: number;
  top_pages: Array<{ page_path: string; visits: number }>;
  peak_hours: Array<{ hour_slot: string; events: number }>;
  devices: Array<{ device: string; events: number }>;
  countries: Array<{ country_name: string; events: number }>;
  most_accessed_logins: Array<{ user_id: string; full_name: string; accesses: number }>;
  least_accessed_logins: Array<{ user_id: string; full_name: string; accesses: number }>;
};

export type StudentEnrollment2026Row = {
  id: string;
  enrollment_number: string;
  full_name: string;
  school_year: number;
  created_at: string;
  updated_at: string;
};

export type EnrollmentValidationResult = {
  is_match: boolean;
  reason: string;
  matched_name: string | null;
};

export type StudentSignupMismatchCrmRow = {
  id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  grade: string | null;
  enrollment_number: string | null;
  mismatch_reason: string;
  attempted_at: string;
};

export type StudentSignupPendingRequestRow = {
  id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
  grade: string | null;
  enrollment_number: string | null;
  mismatch_reason: string;
  status: "pending" | "approved" | "rejected";
  attempted_at: string;
};

export type StudentMessageRow = {
  id: string;
  student_id: string;
  sender_id: string;
  sender_role: "teacher" | "coord" | "gestao" | "admin";
  sender_name: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type AdminStudentMessageHistoryRow = {
  id: string;
  student_id: string;
  recipient_name: string;
  recipient_is_pro: boolean;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type SupportMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  sender_role: string;
  sender_email: string | null;
  recipient_name: string | null;
  recipient_role: string;
  title: string;
  body: string;
  channel: string;
  created_at: string;
  read_at: string | null;
  direction: "in" | "out";
};

export type SupportRecipientRow = {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
};

export type MessageRecipientRow = {
  id: string;
  full_name: string | null;
  grade: string | null;
};

export type StudentEmailRecipientRow = {
  id: string;
  email: string | null;
};

export type MyPlanProStatus = {
  isPlanPro: boolean;
  planTier: "free" | "pro";
  source: "profile" | "metadata" | "fallback";
};

export async function fetchRankingGeral(limit = 50) {
  const { data, error } = await supabase
    .from("v_ranking_geral")
    .select("rank,user_id,full_name,grade,class_name,total_points,lobo_class")
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchRankingGeralMediaPublic(limit = 50) {
  const { data, error } = await supabase
    .from("v_ranking_geral_media_public")
    .select(
      "position_geral_media,user_id,full_name,avatar_url,avg_points,olympiads_count,total_points_sum,lobo_class,total_points",
    )
    .order("position_geral_media", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchMyPoints() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("points")
    .select("total_points,lobo_class")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchMyXpHistory(limit = 100) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("xp_events")
    .select("id,event_type,xp_amount,occurred_on,note,source_ref,created_at")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MyXpHistoryRow[];
}

export async function fetchMyRank() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("v_ranking_geral")
    .select("rank,total_points,lobo_class")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchRankingTeaser(limit = 10) {
  const { data, error } = await supabase.rpc("get_public_ranking_teaser", {
    p_limit: limit,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicRankingTeaser(limit = 10) {
  const { data, error } = await supabase.rpc("get_public_ranking_teaser", {
    p_limit: limit,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchRankingOlympiad(olympiadId: string, limit = 50) {
  const { data, error } = await supabase
    .from("v_ranking_olympiad")
    .select(
      "position_in_olympiad,user_id,points_in_olympiad,gold_count,silver_count,bronze_count,none_count",
    )
    .eq("olympiad_id", olympiadId)
    .order("position_in_olympiad", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchRankingOlympiadPublic(olympiadId: string, limit = 50) {
  const { data, error } = await supabase
    .from("v_ranking_olympiad_public")
    .select(
      "position_in_olympiad,user_id,full_name,avatar_url,points_in_olympiad,gold_count,silver_count,bronze_count,none_count,lobo_class",
    )
    .eq("olympiad_id", olympiadId)
    .order("position_in_olympiad", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicRankingOlympiadTeaser(olympiadId: string, limit = 10) {
  const { data, error } = await supabase.rpc("get_public_ranking_olympiad_teaser", {
    p_olympiad_id: olympiadId,
    p_limit: limit,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMyRankInOlympiad(olympiadId: string) {
  const { data, error } = await supabase.rpc("get_my_rank_in_olympiad", {
    p_olympiad_id: olympiadId,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

export type MyRankGeralMedia = {
  user_id: string;
  is_eligible: boolean;
  min_olympiads_required: number;
  olympiads_count: number;
  avg_points: number | null;
  total_points_sum: number | null;
  position: number | null;
  missing_olympiads: number;
};

export async function fetchMyRankGeralMedia() {
  const { data, error } = await supabase.rpc("get_my_rank_geral_media");

  if (error) throw error;
  if (!data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  const minReq = Number(row.min_olympiads_required ?? 2);
  const count = Number(row.olympiads_count ?? 0);

  return {
    user_id: String(row.user_id),
    is_eligible: Boolean(row.is_eligible),
    min_olympiads_required: minReq,
    olympiads_count: count,
    avg_points: row.avg_points === null ? null : Number(row.avg_points),
    total_points_sum: row.total_points_sum === null ? null : Number(row.total_points_sum),
    position: row.position === null ? null : Number(row.position),
    missing_olympiads: Math.max(0, minReq - count),
  } as MyRankGeralMedia;
}

export async function fetchOlympiads() {
  const { data, error } = await supabase
    .from("olympiads")
    .select("id,title,description,category,status,start_date,end_date,registration_deadline")
    .order("start_date", { ascending: true });

  if (error) {
    // Fallback local para manter catálogo funcional quando o backend falhar.
    return mergeOlympiadsWithCatalog([]);
  }
  return mergeOlympiadsWithCatalog((data ?? []) as Olympiad[]);
}

export async function fetchOlympiadById(olympiadId: string) {
  const { data, error } = await supabase
    .from("olympiads")
    .select("id,title,description,category,status,start_date,end_date,registration_deadline")
    .eq("id", olympiadId)
    .maybeSingle();

  if (error) {
    const catalog = getOlympiadCatalogBySlug(olympiadId);
    if (!catalog) throw error;
    return {
      id: catalog.slug,
      title: catalog.name,
      description: catalog.shortDescription,
      category: catalog.category,
      status: "open",
      start_date: catalog.schedule.examDate,
      end_date: catalog.schedule.examDate,
      registration_deadline: catalog.schedule.registrationDeadline,
    } as Olympiad;
  }
  if (data) return data as Olympiad;

  const catalog = getOlympiadCatalogBySlug(olympiadId);
  if (!catalog) return null;

  return {
    id: catalog.slug,
    title: catalog.name,
    description: catalog.shortDescription,
    category: catalog.category,
    status: "open",
    start_date: catalog.schedule.examDate,
    end_date: catalog.schedule.examDate,
    registration_deadline: catalog.schedule.registrationDeadline,
  } as Olympiad;
}

export async function fetchMyEnrollment(olympiadId: string) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return { enrolled: false };

  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("olympiad_id", olympiadId)
    .limit(1);

  if (error) throw error;
  return { enrolled: (data?.length ?? 0) > 0 };
}

export async function enrollInOlympiad(olympiadId: string) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from("enrollments")
    .insert({ user_id: session.user.id, olympiad_id: olympiadId });

  if (error) {
    const err = error as { code?: string; message?: string };
    if (err.code === "23505" || err.message?.toLowerCase().includes("duplicate")) {
      return { ok: true, already: true };
    }
    throw error;
  }

  return { ok: true, already: false };
}

export async function fetchMyProfile(userIdOverride?: string) {
  let userId = userIdOverride?.trim() ?? "";
  if (!userId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Sessão inválida. Faça login novamente.");
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,grade,class_name,avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ProfileRow | null;
}

export async function fetchMyPlanProStatus(): Promise<MyPlanProStatus> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login novamente.");

  const profileResult = await supabase
    .from("profiles")
    .select("plan_tier,plan_pro_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileResult.error) {
    const row = (profileResult.data ?? {}) as { plan_tier?: string | null; plan_pro_active?: boolean | null };
    const planTierRaw = String(row.plan_tier ?? "free").trim().toLowerCase();
    const isPlanPro = Boolean(row.plan_pro_active) || planTierRaw === "pro";
    return {
      isPlanPro,
      planTier: isPlanPro ? "pro" : "free",
      source: "profile",
    };
  }

  const metadataTier = String(user.user_metadata?.plan_tier ?? "").trim().toLowerCase();
  const metadataIsPro =
    metadataTier === "pro" ||
    metadataTier === "planopro" ||
    metadataTier === "plano_pro" ||
    Boolean(user.user_metadata?.plan_pro_active);

  if (metadataIsPro) {
    return {
      isPlanPro: true,
      planTier: "pro",
      source: "metadata",
    };
  }

  return {
    isPlanPro: false,
    planTier: "free",
    source: "fallback",
  };
}

export async function fetchMyStudentMessages(limit = 30) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("student_messages")
    .select("id,student_id,sender_id,sender_role,sender_name,title,body,created_at,read_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as StudentMessageRow[];
}

export async function fetchAdminStudentMessageHistory(limit = 1000) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("student_messages")
    .select("id,student_id,title,body,created_at,read_at,profiles:student_id(full_name,plan_tier,plan_pro_active)")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const profile = (row.profiles ?? null) as { full_name?: string | null; plan_tier?: string | null; plan_pro_active?: boolean | null } | null;
    const planTier = String(profile?.plan_tier ?? "").trim().toLowerCase();
    const recipientIsPro = Boolean(profile?.plan_pro_active) || planTier === "pro";

    return {
      id: String(row.id ?? ""),
      student_id: String(row.student_id ?? ""),
      recipient_name: String(profile?.full_name ?? "Aluno"),
      recipient_is_pro: recipientIsPro,
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      created_at: String(row.created_at ?? ""),
      read_at: row.read_at ? String(row.read_at) : null,
    };
  }) as AdminStudentMessageHistoryRow[];
}

export async function markMyStudentMessagesAsRead() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login novamente.");

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("student_messages")
    .update({ read_at: nowIso })
    .eq("student_id", user.id)
    .is("read_at", null);
  if (error) throw error;
}

export async function fetchMySupportMessages(limit = 100) {
  const { data, error } = await supabase.rpc("list_my_support_messages", {
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    sender_id: String(row.sender_id ?? ""),
    recipient_id: String(row.recipient_id ?? ""),
    sender_name: String(row.sender_name ?? "Usuário"),
    sender_role: String(row.sender_role ?? "student"),
    sender_email: row.sender_email ? String(row.sender_email) : null,
    recipient_name: row.recipient_name ? String(row.recipient_name) : null,
    recipient_role: String(row.recipient_role ?? "student"),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    channel: String(row.channel ?? "duvida_sugestao"),
    created_at: String(row.created_at ?? ""),
    read_at: row.read_at ? String(row.read_at) : null,
    direction: String(row.direction ?? "in") === "out" ? "out" : "in",
  })) as SupportMessageRow[];
}

export async function fetchSupportRecipientsForAdmin() {
  const { data, error } = await supabase.rpc("list_support_recipients_for_admin");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    full_name: row.full_name ? String(row.full_name) : null,
    role: String(row.role ?? "student"),
    email: row.email ? String(row.email).trim().toLowerCase() : null,
  })) as SupportRecipientRow[];
}

export async function markMySupportMessagesAsRead() {
  const { data, error } = await supabase.rpc("mark_my_support_messages_as_read");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function sendSupportMessage(input: {
  title: string;
  body: string;
  recipientId?: string | null;
  channel?: string;
}) {
  const { data, error } = await supabase.rpc("send_support_message", {
    p_title: input.title.trim(),
    p_body: input.body.trim(),
    p_recipient_id: input.recipientId ?? null,
    p_channel: input.channel?.trim() || "duvida_sugestao",
  });
  if (error) throw error;
  const first = Array.isArray(data) ? data[0] : null;
  if (!first || typeof first !== "object") {
    throw new Error("Falha ao enviar mensagem de suporte.");
  }
  const row = first as Record<string, unknown>;
  return {
    message_id: String(row.message_id ?? ""),
    recipient_id: String(row.recipient_id ?? ""),
    recipient_name: row.recipient_name ? String(row.recipient_name) : null,
    recipient_email: row.recipient_email ? String(row.recipient_email).trim().toLowerCase() : null,
    recipient_role: String(row.recipient_role ?? "student"),
    sender_name: String(row.sender_name ?? "Usuário"),
    sender_role: String(row.sender_role ?? "student"),
    recipient_is_admin: Boolean(row.recipient_is_admin),
  };
}

export async function notifyAdminInboxEmail(input: {
  recipients: Array<{ email: string; fullName: string }>;
  title: string;
  body: string;
  senderName: string;
  senderRole: string;
  channel?: string;
}) {
  const cleanedRecipients = Array.from(
    new Map(
      (input.recipients ?? [])
        .map((item) => ({
          email: String(item.email ?? "").trim().toLowerCase(),
          fullName: String(item.fullName ?? "").trim() || "Admin",
        }))
        .filter((item) => item.email.includes("@"))
        .map((item) => [item.email, item]),
    ).values(),
  );

  if (!cleanedRecipients.length) {
    return { total: 0, sent: 0, failed: 0 };
  }

  const baseUrl =
    process.env.EXPO_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/admin-inbox-notify.php`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipients: cleanedRecipients,
      title: input.title,
      message: input.body,
      senderName: input.senderName,
      senderRole: input.senderRole,
      channel: input.channel ?? "duvida_sugestao",
    }),
  });

  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  if (!response.ok || parsed.ok !== true) {
    throw new Error(String(parsed.error ?? "").trim() || `Falha ao enviar e-mail admin (${response.status}).`);
  }
  return {
    total: Number(parsed.total ?? cleanedRecipients.length),
    sent: Number(parsed.sent ?? cleanedRecipients.length),
    failed: Number(parsed.failed ?? 0),
  };
}

export async function fetchMessageRecipientsForSender() {
  const { data, error } = await supabase.rpc("list_message_recipients_for_sender");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    full_name: row.full_name ? String(row.full_name) : null,
    grade: row.grade ? String(row.grade) : null,
  })) as MessageRecipientRow[];
}

export async function sendStudentMessage(input: {
  student_id: string;
  title: string;
  body: string;
}) {
  const { data, error } = await supabase.rpc("send_student_message", {
    p_student_id: input.student_id,
    p_title: input.title,
    p_body: input.body,
  });
  if (error) throw error;
  return String(data ?? "");
}

export async function sendStudentMessageBulk(input: {
  student_ids: string[];
  title: string;
  body: string;
}) {
  const ids = Array.from(new Set((input.student_ids ?? []).map((id) => String(id).trim()).filter(Boolean)));
  if (!ids.length) {
    return { sent: 0, failed: 0, failedIds: [] as string[] };
  }

  const trimmedTitle = input.title.trim();
  const trimmedBody = input.body.trim();

  const bulkCall = await supabase.rpc("send_student_message_bulk", {
    p_student_ids: ids,
    p_title: trimmedTitle,
    p_body: trimmedBody,
  });

  if (bulkCall.error) {
    const normalizedError = String(bulkCall.error.message ?? "").toLowerCase();
    const shouldFallbackToSingle =
      normalizedError.includes("send_student_message_bulk") &&
      (normalizedError.includes("does not exist") || normalizedError.includes("function"));

    if (!shouldFallbackToSingle) {
      throw bulkCall.error;
    }

    const failedIds: string[] = [];
    let sent = 0;
    for (const studentId of ids) {
      try {
        await sendStudentMessage({ student_id: studentId, title: trimmedTitle, body: trimmedBody });
        sent += 1;
      } catch {
        failedIds.push(studentId);
      }
    }
    return { sent, failed: failedIds.length, failedIds };
  }

  const rows = (bulkCall.data ?? []) as Array<Record<string, unknown>>;
  const sentIds = rows.map((row) => String(row.student_id ?? "")).filter(Boolean);
  const failedIds = ids.filter((id) => !sentIds.includes(id));
  return {
    sent: sentIds.length,
    failed: failedIds.length,
    failedIds,
  };
}

export async function fetchStudentEmailRecipientsForSender() {
  const { data, error } = await supabase.rpc("list_student_email_recipients_for_sender");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    email: row.email ? String(row.email).trim().toLowerCase() : null,
  })) as StudentEmailRecipientRow[];
}

export async function sendStudentBroadcastEmail(input: {
  recipients: Array<{ email: string; fullName: string }>;
  title: string;
  body: string;
}) {
  const cleanedRecipients = Array.from(
    new Map(
      (input.recipients ?? [])
        .map((recipient) => ({
          email: String(recipient.email ?? "").trim().toLowerCase(),
          fullName: String(recipient.fullName ?? "").trim() || "Aluno(a)",
        }))
        .filter((recipient) => recipient.email.includes("@"))
        .map((recipient) => [recipient.email, recipient]),
    ).values(),
  );

  if (!cleanedRecipients.length) {
    return { total: 0, sent: 0, failed: 0, errors: [] as Array<{ email: string; error: string }> };
  }

  const baseUrl =
    process.env.EXPO_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const preferredEndpoint =
    process.env.EXPO_PUBLIC_STUDENT_BROADCAST_NOTIFY_URL ??
    `${normalizedBaseUrl}/student-message-broadcast-notify.php`;
  const fallbackEndpoint = `${normalizedBaseUrl}/student-xp-kickoff-notify.php`;
  const emailNudgeText = "Chegou uma notificação na sua Caixa de Mensagens do InGenium";

  const payload = {
    recipients: cleanedRecipients,
    // O conteúdo do aviso é interno ao app; e-mail deve sempre ser um nudge fixo.
    title: "Nova notificação no InGenium",
    message: emailNudgeText,
    subject: "InGenium | Nova notificação na Caixa de Mensagens",
    // Compat com endpoint legado de campanha em massa.
    opening: "Olá!",
    headline: "Nova mensagem para você",
    bodyA: emailNudgeText,
    bodyB: "",
    bodyC: "Equipe InGenium Einstein",
    cta: "Acesse o InGenium: https://ingenium.einsteinhub.co",
  };

  async function request(endpoint: string) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    return { response, parsed, text };
  }

  function isSuccessfulResponse(payload: {
    response: Response;
    parsed: Record<string, unknown>;
  }) {
    return (
      payload.response.ok &&
      payload.parsed.ok === true &&
      typeof payload.parsed.sent === "number" &&
      typeof payload.parsed.failed === "number"
    );
  }

  let finalAttempt = await request(preferredEndpoint);
  const shouldTryFallback = !isSuccessfulResponse(finalAttempt) && fallbackEndpoint !== preferredEndpoint;
  if (shouldTryFallback) {
    finalAttempt = await request(fallbackEndpoint);
  }

  if (!isSuccessfulResponse(finalAttempt)) {
    const errMessage =
      String(finalAttempt.parsed.error ?? "").trim() ||
      finalAttempt.text.slice(0, 180) ||
      `Falha ao enviar e-mails (${finalAttempt.response.status}).`;
    throw new Error(errMessage);
  }

  return {
    total: Number(finalAttempt.parsed.total ?? cleanedRecipients.length),
    sent: Number(finalAttempt.parsed.sent ?? cleanedRecipients.length),
    failed: Number(finalAttempt.parsed.failed ?? 0),
    errors: Array.isArray(finalAttempt.parsed.errors)
      ? (finalAttempt.parsed.errors as Array<{ email: string; error: string }>)
      : [],
  };
}

export async function fetchMyAccessRole(): Promise<MyAccessRole> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  const rawRole = String((data as { role?: string } | null)?.role ?? "").trim().toLowerCase();
  if (rawRole === "admin" || rawRole === "coord" || rawRole === "gestao" || rawRole === "teacher" || rawRole === "student") return rawRole;
  return null;
}

export async function upsertMyProfile(input: Omit<ProfileRow, "id">) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("Sessão inválida. Faça login novamente.");

  const payload = {
    id: session.user.id,
    full_name: input.full_name?.trim() || null,
    grade: input.grade?.trim() || null,
    class_name: input.class_name?.trim() || null,
    avatar_url: input.avatar_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id,full_name,grade,class_name,avatar_url")
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

export async function fetchRegisteredStudents() {
  const { data, error } = await supabase.rpc("get_registered_students_admin");
  if (error) throw error;
  return ((data ?? []) as Array<RegisteredStudentRow & { role?: string | null }>)
    .map((row) => ({
      id: row.id,
      full_name: row.full_name ?? "Aluno",
      grade: row.grade ?? null,
      avatar_url: row.avatar_url ?? null,
    }));
}

export async function fetchRankingAllRegisteredStudents(limit = 500) {
  const { data, error } = await supabase.rpc("get_registered_students_ranking_admin", {
    p_limit: limit,
  });

  if (error) throw error;

  const rows = ((data ?? []) as Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    grade: string | null;
    role?: string | null;
    total_points?: number | null;
    lobo_class?: string | null;
  }>)
    .map((row) => {
    return {
      user_id: row.id,
      full_name: row.full_name ?? "Aluno",
      avatar_url: row.avatar_url,
      grade: row.grade ?? null,
      total_points: Number(row.total_points ?? 0),
      lobo_class: ((row.lobo_class ?? "bronze") as "bronze" | "silver" | "gold"),
    };
  });

  rows.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR");
  });

  return rows.map((row, idx) => ({
    position: idx + 1,
    ...row,
  })) as RankingStudentRow[];
}

export async function ensureCurrentUserProfileFromAuthMetadata() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? "").trim() || (user.email?.split("@")[0] ?? "Aluno");
  const grade = String(metadata.grade ?? "").trim() || null;
  const roleRaw = String(metadata.role ?? "").trim().toLowerCase();
  const role =
    roleRaw === "admin" || roleRaw === "coord" || roleRaw === "gestao" || roleRaw === "teacher" || roleRaw === "student"
      ? roleRaw
      : "student";

  const primaryPayload = {
    id: user.id,
    full_name: fullName,
    grade,
    role,
    updated_at: new Date().toISOString(),
  };
  const fallbackPayload = {
    id: user.id,
    full_name: fullName,
    updated_at: new Date().toISOString(),
  };

  const primary = await supabase.from("profiles").upsert(primaryPayload, { onConflict: "id" }).select("id").single();
  if (!primary.error) return primary.data;

  const fallback = await supabase.from("profiles").upsert(fallbackPayload, { onConflict: "id" }).select("id").single();
  if (!fallback.error) return fallback.data;

  // Nunca quebra o login por divergência de schema/perfil.
  console.warn("Falha ao sincronizar profile a partir do auth metadata.", {
    primaryError: primary.error.message,
    fallbackError: fallback.error.message,
  });
  return null;
}

export type FeedPost = {
  id: string;
  feed_owner_id?: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
};

type PostRow = {
  id: string;
  feed_owner_id?: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name?: string | null; avatar_url?: string | null } | null;
};

function mapPostRow(row: PostRow): FeedPost {
  return {
    id: row.id,
    feed_owner_id: row.feed_owner_id,
    author_id: row.author_id,
    content: row.content,
    created_at: row.created_at,
    author_name: row.profiles?.full_name ?? null,
    author_avatar: row.profiles?.avatar_url ?? null,
  };
}

export async function fetchMuralPosts(limit = 30) {
  const { data, error } = await supabase
    .from("wall_posts")
    .select("id,author_id,content,created_at,profiles:author_id(full_name,avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);

  const mapped = ((data ?? []) as PostRow[]).map(mapPostRow);

  return { data: mapped as FeedPost[], error };
}

export async function fetchProfileFeedPosts(feedOwnerId: string, limit = 30) {
  const ownerId = feedOwnerId.trim();
  if (!ownerId) throw new Error("Feed do aluno inválido.");

  const { data, error } = await supabase
    .from("feed_posts")
    .select("id,feed_owner_id,author_id,content,created_at,profiles:author_id(full_name,avatar_url)")
    .eq("feed_owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const mapped = ((data ?? []) as PostRow[]).map(mapPostRow);
  return { data: mapped as FeedPost[], error };
}

export async function createMuralPost(content: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login para publicar no mural.");

  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("Digite uma mensagem antes de publicar.");

  const { data, error } = await supabase
    .from("wall_posts")
    .insert({
      author_id: user.id,
      content: cleanContent,
    })
    .select("id,author_id,content,created_at,profiles:author_id(full_name,avatar_url)")
    .single();

  if (error) throw error;

  return mapPostRow(data as PostRow);
}

export async function createProfileFeedPost(content: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login para publicar no feed.");

  const cleanContent = content.trim();
  if (!cleanContent) throw new Error("Digite uma mensagem antes de publicar.");

  const { data, error } = await supabase
    .from("feed_posts")
    .insert({
      feed_owner_id: user.id,
      author_id: user.id,
      content: cleanContent,
    })
    .select("id,feed_owner_id,author_id,content,created_at,profiles:author_id(full_name,avatar_url)")
    .single();

  if (error) throw error;
  return mapPostRow(data as PostRow);
}

export async function deleteMuralPost(postId: string) {
  const cleanPostId = postId.trim();
  if (!cleanPostId) throw new Error("Post inválido para exclusão.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("wall_posts")
    .delete()
    .eq("id", cleanPostId)
    .eq("author_id", user.id)
    .select("id")
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Não foi possível excluir a postagem. Ela pode já ter sido removida ou não pertence ao seu usuário.");
  }
}

export async function deleteProfileFeedPost(postId: string) {
  const cleanPostId = postId.trim();
  if (!cleanPostId) throw new Error("Post inválido para exclusão.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Sessão inválida. Faça login novamente.");

  const { data, error } = await supabase
    .from("feed_posts")
    .delete()
    .eq("id", cleanPostId)
    .eq("author_id", user.id)
    .eq("feed_owner_id", user.id)
    .select("id")
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Não foi possível excluir a postagem do feed. Ela pode já ter sido removida ou não pertence ao seu usuário.");
  }
}

export async function fetchRegisteredStudentsFull() {
  const { data, error } = await supabase.rpc("get_registered_students_full_admin");
  if (error) throw error;
  return (data ?? []) as FullStudentRow[];
}

export async function fetchPlanProStudentsAdmin() {
  const { data, error } = await supabase.rpc("list_plan_pro_students_admin");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    full_name: row.full_name ? String(row.full_name) : null,
    grade: row.grade ? String(row.grade) : null,
    class_name: row.class_name ? String(row.class_name) : null,
    role: row.role ? String(row.role) : null,
    plan_tier: row.plan_tier ? String(row.plan_tier) : null,
    plan_pro_active: Boolean(row.plan_pro_active),
    pro_source: (String(row.pro_source ?? "unknown") as "profile" | "xp_event" | "unknown"),
    email: row.email ? String(row.email).trim().toLowerCase() : null,
    cpf: row.cpf ? String(row.cpf) : null,
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    birth_date: row.birth_date ? String(row.birth_date) : null,
    enrollment_number: row.enrollment_number ? String(row.enrollment_number) : null,
    responsible_name: row.responsible_name ? String(row.responsible_name) : null,
    responsible_phone: row.responsible_phone ? String(row.responsible_phone) : null,
    responsible_email: row.responsible_email ? String(row.responsible_email).trim().toLowerCase() : null,
    responsible_cpf: row.responsible_cpf ? String(row.responsible_cpf) : null,
    responsible_relationship: row.responsible_relationship ? String(row.responsible_relationship) : null,
    secondary_responsible_name: row.secondary_responsible_name ? String(row.secondary_responsible_name) : null,
    secondary_responsible_phone: row.secondary_responsible_phone ? String(row.secondary_responsible_phone) : null,
    secondary_responsible_email: row.secondary_responsible_email ? String(row.secondary_responsible_email).trim().toLowerCase() : null,
    secondary_responsible_cpf: row.secondary_responsible_cpf ? String(row.secondary_responsible_cpf) : null,
    secondary_responsible_relationship: row.secondary_responsible_relationship ? String(row.secondary_responsible_relationship) : null,
  })) as PlanProStudentRow[];
}

export async function fetchTeachersWithOlympiads() {
  const { data, error } = await supabase.rpc("get_teachers_with_olympiads_admin");
  if (error) throw error;
  return ((data ?? []) as Array<{
    teacher_id: string;
    full_name: string | null;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
    subject_area: string | null;
    is_active?: boolean | null;
    assignments:
      | Array<{
          assignment_id?: string;
          olympiad_id?: string | null;
          olympiad_title?: string | null;
          pending_olympiad_name?: string | null;
          display_name?: string | null;
          subject_area?: string | null;
        }>
      | null;
  }>).map((row) => ({
    id: row.teacher_id,
    full_name: row.full_name,
    display_name: row.display_name,
    email: row.email,
    avatar_url: row.avatar_url,
    subject_area: row.subject_area,
    is_active: row.is_active ?? true,
    assignments: (row.assignments ?? [])
      .map((item) => ({
        assignment_id: String(item.assignment_id ?? ""),
        olympiad_id: item.olympiad_id ? String(item.olympiad_id) : null,
        olympiad_title: item.olympiad_title ? String(item.olympiad_title) : null,
        pending_olympiad_name: item.pending_olympiad_name ? String(item.pending_olympiad_name) : null,
        display_name: item.display_name ? String(item.display_name) : null,
        subject_area: item.subject_area ? String(item.subject_area) : null,
      }))
      .filter((item) => Boolean(item.assignment_id)),
  }));
}

export async function fetchSaasAnalyticsOverview(days = 30): Promise<SaasAnalyticsOverview | null> {
  const { data, error } = await supabase.rpc("get_saas_analytics_overview_admin", {
    p_days: days,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  return {
    period_days: Number(row.period_days ?? days),
    since_utc: String(row.since_utc ?? new Date().toISOString()),
    total_events: Number(row.total_events ?? 0),
    total_sessions: Number(row.total_sessions ?? 0),
    active_users: Number(row.active_users ?? 0),
    top_pages: Array.isArray(row.top_pages) ? (row.top_pages as Array<{ page_path: string; visits: number }>) : [],
    peak_hours: Array.isArray(row.peak_hours) ? (row.peak_hours as Array<{ hour_slot: string; events: number }>) : [],
    devices: Array.isArray(row.devices) ? (row.devices as Array<{ device: string; events: number }>) : [],
    countries: Array.isArray(row.countries) ? (row.countries as Array<{ country_name: string; events: number }>) : [],
    most_accessed_logins: Array.isArray(row.most_accessed_logins)
      ? (row.most_accessed_logins as Array<{ user_id: string; full_name: string; accesses: number }>)
      : [],
    least_accessed_logins: Array.isArray(row.least_accessed_logins)
      ? (row.least_accessed_logins as Array<{ user_id: string; full_name: string; accesses: number }>)
      : [],
  };
}

export async function listStudentEnrollments2026Admin() {
  const { data, error } = await supabase.rpc("list_student_enrollments_2026_admin");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    enrollment_number: String(row.enrollment_number ?? ""),
    full_name: String(row.full_name ?? ""),
    school_year: Number(row.school_year ?? 2026),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  })) as StudentEnrollment2026Row[];
}

export async function importStudentEnrollments2026Admin(
  rows: Array<{ enrollment_number: string; full_name: string }>,
) {
  const { data, error } = await supabase.rpc("import_student_enrollments_2026_admin", {
    p_rows: rows,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return {
    imported_count: Number((result as { imported_count?: number } | null)?.imported_count ?? 0),
    updated_count: Number((result as { updated_count?: number } | null)?.updated_count ?? 0),
    total_count: Number((result as { total_count?: number } | null)?.total_count ?? 0),
  };
}

export async function validateStudentEnrollment2026(input: {
  full_name: string;
  enrollment_number: string;
}): Promise<EnrollmentValidationResult> {
  const { data, error } = await supabase.rpc("validate_student_enrollment_2026", {
    p_full_name: input.full_name,
    p_enrollment_number: input.enrollment_number,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    is_match: Boolean((row as { is_match?: boolean } | null)?.is_match),
    reason: String((row as { reason?: string } | null)?.reason ?? "Validação indisponível."),
    matched_name: (row as { matched_name?: string | null } | null)?.matched_name ?? null,
  };
}

export async function logStudentSignupMismatchCrm(input: {
  full_name: string;
  email: string;
  cpf?: string | null;
  whatsapp?: string | null;
  grade?: string | null;
  enrollment_number?: string | null;
  mismatch_reason?: string | null;
}) {
  const { data, error } = await supabase.rpc("log_student_signup_mismatch_crm", {
    p_full_name: input.full_name,
    p_email: input.email,
    p_cpf: input.cpf ?? null,
    p_whatsapp: input.whatsapp ?? null,
    p_grade: input.grade ?? null,
    p_enrollment_number: input.enrollment_number ?? null,
    p_mismatch_reason: input.mismatch_reason ?? null,
  });
  if (error) throw error;
  return String(data ?? "");
}

export async function listStudentSignupMismatchCrmAdmin() {
  const { data, error } = await supabase.rpc("list_student_signup_mismatch_crm_admin");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    cpf: row.cpf ? String(row.cpf) : null,
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    grade: row.grade ? String(row.grade) : null,
    enrollment_number: row.enrollment_number ? String(row.enrollment_number) : null,
    mismatch_reason: String(row.mismatch_reason ?? ""),
    attempted_at: String(row.attempted_at ?? new Date().toISOString()),
  })) as StudentSignupMismatchCrmRow[];
}

export async function sendStudentMismatchEmail(input: {
  fullName: string;
  candidateEmail: string;
}) {
  const endpoint =
    process.env.EXPO_PUBLIC_STUDENT_MISMATCH_NOTIFY_URL ??
    (typeof window !== "undefined"
      ? `${window.location.origin.replace(/\/+$/, "")}/student-mismatch-notify.php`
      : "https://ingenium.einsteinhub.co/student-mismatch-notify.php");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: input.fullName,
      candidateEmail: input.candidateEmail,
    }),
  });

  const text = await response.text();
  let parsed: { ok?: boolean; error?: string } | null = null;
  try {
    parsed = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    parsed = null;
  }
  if (!response.ok || !parsed?.ok) {
    throw new Error(parsed?.error || `Falha ao enviar e-mail de não elegibilidade (${response.status}).`);
  }
}

export async function submitStudentSignupPendingRequest(input: {
  full_name: string;
  email: string;
  cpf?: string | null;
  whatsapp?: string | null;
  grade?: string | null;
  enrollment_number?: string | null;
  mismatch_reason?: string | null;
  requested_by?: string | null;
}) {
  const basePayload = {
    p_full_name: input.full_name,
    p_email: input.email,
    p_cpf: input.cpf ?? null,
    p_whatsapp: input.whatsapp ?? null,
    p_grade: input.grade ?? null,
    p_enrollment_number: input.enrollment_number ?? null,
    p_mismatch_reason: input.mismatch_reason ?? null,
  };

  const withRequestedBy = await supabase.rpc("submit_student_signup_pending_request", {
    ...basePayload,
    p_requested_by: input.requested_by ?? null,
  });

  if (!withRequestedBy.error) {
    return String(withRequestedBy.data ?? "");
  }

  const normalizedErrorMessage = String(withRequestedBy.error.message ?? "").toLowerCase();
  const shouldFallbackToLegacySignature =
    normalizedErrorMessage.includes("p_requested_by") ||
    normalizedErrorMessage.includes("function") ||
    normalizedErrorMessage.includes("does not exist");

  if (!shouldFallbackToLegacySignature) {
    throw withRequestedBy.error;
  }

  const legacy = await supabase.rpc("submit_student_signup_pending_request", basePayload);
  if (legacy.error) throw legacy.error;
  return String(legacy.data ?? "");
}

export async function upsertStudentSignupCrmLead(input: {
  full_name: string;
  email: string;
  cpf?: string | null;
  whatsapp?: string | null;
  grade?: string | null;
  enrollment_number?: string | null;
  lifecycle_status?: "created_unverified" | "enrollment_pending" | "approved" | "rejected" | "active";
  auth_user_id?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase.rpc("upsert_student_signup_crm_lead", {
    p_full_name: input.full_name,
    p_email: input.email,
    p_cpf: input.cpf ?? null,
    p_whatsapp: input.whatsapp ?? null,
    p_grade: input.grade ?? null,
    p_enrollment_number: input.enrollment_number ?? null,
    p_lifecycle_status: input.lifecycle_status ?? "created_unverified",
    p_auth_user_id: input.auth_user_id ?? null,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return String(data ?? "");
}

export async function listStudentSignupPendingRequestsAdmin() {
  const { data, error } = await supabase.rpc("list_student_signup_pending_requests_admin");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    full_name: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    cpf: row.cpf ? String(row.cpf) : null,
    whatsapp: row.whatsapp ? String(row.whatsapp) : null,
    grade: row.grade ? String(row.grade) : null,
    enrollment_number: row.enrollment_number ? String(row.enrollment_number) : null,
    mismatch_reason: String(row.mismatch_reason ?? ""),
    status: (String(row.status ?? "pending") as "pending" | "approved" | "rejected"),
    attempted_at: String(row.attempted_at ?? new Date().toISOString()),
  })) as StudentSignupPendingRequestRow[];
}

export async function reviewStudentSignupPendingRequestAdmin(input: {
  request_id: string;
  approve: boolean;
  review_notes?: string | null;
}) {
  const { data, error } = await supabase.rpc("review_student_signup_pending_request_admin", {
    p_request_id: input.request_id,
    p_approve: input.approve,
    p_review_notes: input.review_notes ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    request_id: String((row as { request_id?: string } | null)?.request_id ?? input.request_id),
    full_name: String((row as { full_name?: string } | null)?.full_name ?? ""),
    email: String((row as { email?: string } | null)?.email ?? ""),
    enrollment_number: ((row as { enrollment_number?: string | null } | null)?.enrollment_number ?? null),
    approved: Boolean((row as { approved?: boolean } | null)?.approved),
  };
}

export async function sendStudentPendingStatusEmail(input: {
  action: "pending_created" | "approved" | "rejected";
  fullName: string;
  candidateEmail: string;
  enrollmentNumber?: string | null;
  grade?: string | null;
  reason?: string | null;
}) {
  const endpoint =
    process.env.EXPO_PUBLIC_STUDENT_PENDING_NOTIFY_URL ??
    (typeof window !== "undefined"
      ? `${window.location.origin.replace(/\/+$/, "")}/student-pending-notify.php`
      : "https://ingenium.einsteinhub.co/student-pending-notify.php");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: input.action,
      fullName: input.fullName,
      candidateEmail: input.candidateEmail,
      enrollmentNumber: input.enrollmentNumber ?? null,
      grade: input.grade ?? null,
      reason: input.reason ?? null,
    }),
  });

  const text = await response.text();
  let parsed: { ok?: boolean; error?: string } | null = null;
  try {
    parsed = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    parsed = null;
  }
  if (!response.ok || !parsed?.ok) {
    throw new Error(parsed?.error || `Falha ao enviar e-mail de pendência (${response.status}).`);
  }
}

export async function sendTeacherMagicLink(input: {
  email: string;
  full_name: string;
  display_name: string;
  subject_area?: string | null;
}) {
  const targetEmail = input.email.trim().toLowerCase();
  const siteUrl =
    process.env.EXPO_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
  const redirectTo = `${siteUrl.replace(/\/+$/, "")}/professor/login-link`;
  const { error } = await supabase.auth.signInWithOtp({
    email: targetEmail,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
      data: {
        role: "teacher",
        full_name: input.full_name.trim(),
        display_name: input.display_name.trim(),
        subject_area: input.subject_area?.trim() || null,
      },
    },
  });
  if (error) throw error;
}

export async function sendTeacherCandidateMagicLink(input: {
  email: string;
  full_name: string;
  display_name: string;
  cpf: string;
  subject_area?: string | null;
  intended_olympiad?: string | null;
}) {
  const targetEmail = input.email.trim().toLowerCase();
  const siteUrl =
    process.env.EXPO_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://ingenium.einsteinhub.co");
  const redirectTo = `${siteUrl.replace(/\/+$/, "")}/professor/login-link`;
  const { error } = await supabase.auth.signInWithOtp({
    email: targetEmail,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
      data: {
        role: "student",
        teacher_pending: true,
        full_name: input.full_name.trim(),
        display_name: input.display_name.trim(),
        cpf: input.cpf.trim(),
        subject_area: input.subject_area?.trim() || null,
        intended_olympiad: input.intended_olympiad?.trim() || null,
      },
    },
  });
  if (error) throw error;
}

export async function submitTeacherAccessRequest(input: {
  full_name: string;
  display_name: string;
  email: string;
  cpf: string;
  subject_area?: string | null;
  intended_olympiad?: string | null;
}) {
  const { data, error } = await supabase.rpc("submit_teacher_access_request", {
    p_full_name: input.full_name,
    p_display_name: input.display_name,
    p_email: input.email,
    p_cpf: input.cpf,
    p_subject_area: input.subject_area ?? null,
    p_intended_olympiad: input.intended_olympiad ?? null,
  });
  if (error) throw error;
  return String(data ?? "");
}

export async function submitTeacherAccessRequestPublic(input: {
  full_name: string;
  display_name: string;
  email: string;
  cpf: string;
  subject_area?: string | null;
  intended_olympiad?: string | null;
}) {
  const { data, error } = await supabase.rpc("submit_teacher_access_request_public", {
    p_full_name: input.full_name,
    p_display_name: input.display_name,
    p_email: input.email,
    p_cpf: input.cpf,
    p_subject_area: input.subject_area ?? null,
    p_intended_olympiad: input.intended_olympiad ?? null,
  });
  if (error) throw error;
  return String(data ?? "");
}

export async function ensureTeacherAccessRequestFromCurrentUser() {
  const { data, error } = await supabase.rpc("ensure_teacher_access_request_from_current_user");
  if (error) throw error;
  return String(data ?? "");
}

export async function fetchPendingAccessRequestsAdmin() {
  const { data, error } = await supabase.rpc("list_pending_access_requests_admin");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    request_type: (String(row.request_type ?? "teacher") as "teacher" | "collaborator"),
    full_name: row.full_name ? String(row.full_name) : null,
    display_name: row.display_name ? String(row.display_name) : null,
    email: row.email ? String(row.email) : null,
    cpf: row.cpf ? String(row.cpf) : null,
    subject_area: row.subject_area ? String(row.subject_area) : null,
    intended_olympiad: row.intended_olympiad ? String(row.intended_olympiad) : null,
    status: (String(row.status ?? "pending") as "pending" | "approved" | "rejected"),
    created_at: String(row.created_at ?? new Date().toISOString()),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    review_notes: row.review_notes ? String(row.review_notes) : null,
  })) as AccessRequestRow[];
}

export async function reviewAccessRequestAdmin(input: {
  request_id: string;
  approve: boolean;
  review_notes?: string | null;
}) {
  const { error } = await supabase.rpc("review_access_request_admin", {
    p_request_id: input.request_id,
    p_approve: input.approve,
    p_review_notes: input.review_notes ?? null,
  });
  if (error) throw error;
}

export async function notifyAdminNewAccessRequest(input: {
  requestType: "teacher" | "collaborator";
  fullName: string;
  displayName?: string | null;
  candidateEmail: string;
  cpf?: string | null;
  subjectArea?: string | null;
  intendedOlympiad?: string | null;
}) {
  const endpoint =
    process.env.EXPO_PUBLIC_ACCESS_REQUEST_PENDING_NOTIFY_URL ??
    (typeof window !== "undefined"
      ? `${window.location.origin.replace(/\/+$/, "")}/access-request-pending-notify.php`
      : "https://ingenium.einsteinhub.co/access-request-pending-notify.php");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestType: input.requestType,
      fullName: input.fullName,
      displayName: input.displayName ?? null,
      candidateEmail: input.candidateEmail,
      cpf: input.cpf ?? null,
      subjectArea: input.subjectArea ?? null,
      intendedOlympiad: input.intendedOlympiad ?? null,
    }),
  });

  const text = await response.text();
  let parsed: { ok?: boolean; error?: string } | null = null;
  try {
    parsed = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed?.ok) {
    throw new Error(parsed?.error || `Falha ao enviar e-mail de nova pendência (${response.status}).`);
  }
}

export async function sendAccessRequestReviewEmail(input: {
  requestType: "teacher" | "collaborator";
  approved: boolean;
  fullName: string;
  displayName?: string | null;
  candidateEmail: string;
  subjectArea?: string | null;
  intendedOlympiad?: string | null;
  adminReviewerEmail?: string | null;
}) {
  const endpoint =
    process.env.EXPO_PUBLIC_ACCESS_REQUEST_NOTIFY_URL ??
    (typeof window !== "undefined"
      ? `${window.location.origin.replace(/\/+$/, "")}/access-request-notify.php`
      : "https://ingenium.einsteinhub.co/access-request-notify.php");

  const payload = {
    requestType: input.requestType,
    approved: input.approved,
    fullName: input.fullName,
    displayName: input.displayName ?? null,
    candidateEmail: input.candidateEmail,
    subjectArea: input.subjectArea ?? null,
    intendedOlympiad: input.intendedOlympiad ?? null,
    adminReviewerEmail: input.adminReviewerEmail ?? null,
    approvedMessage: "Parabéns, seu cadastro foi aprovado! Seja bem-vindo(a) ao InGenium!!",
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed: { ok?: boolean; error?: string } | null = null;
  try {
    parsed = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed?.ok) {
    throw new Error(parsed?.error || `Falha ao enviar e-mail de aprovação/reprovação (${response.status}).`);
  }
}

export async function fetchMyLatestAccessRequest() {
  const { data, error } = await supabase.rpc("get_my_latest_access_request");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: String(row.id),
    request_type: (String(row.request_type ?? "teacher") as "teacher" | "collaborator"),
    full_name: row.full_name ? String(row.full_name) : null,
    display_name: row.display_name ? String(row.display_name) : null,
    email: row.email ? String(row.email) : null,
    cpf: row.cpf ? String(row.cpf) : null,
    subject_area: row.subject_area ? String(row.subject_area) : null,
    intended_olympiad: row.intended_olympiad ? String(row.intended_olympiad) : null,
    status: (String(row.status ?? "pending") as "pending" | "approved" | "rejected"),
    created_at: String(row.created_at ?? new Date().toISOString()),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
    review_notes: row.review_notes ? String(row.review_notes) : null,
  } as AccessRequestRow;
}

export async function createTeacher(input: {
  full_name: string;
  display_name: string;
  email: string;
  subject_area?: string | null;
  olympiad_id?: string | null;
  pending_olympiad_name?: string | null;
}) {
  const { data, error } = await supabase.rpc("upsert_teacher_profile_admin", {
    p_full_name: input.full_name,
    p_display_name: input.display_name,
    p_email: input.email,
    p_subject_area: input.subject_area ?? null,
    p_olympiad_id: input.olympiad_id ?? null,
    p_pending_olympiad_name: input.pending_olympiad_name ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function assignTeacherToOlympiad(input: {
  teacher_profile_id: string;
  olympiad_id: string;
  display_name?: string | null;
  subject_area?: string | null;
}) {
  const { data, error } = await supabase.rpc("assign_teacher_to_olympiad_admin", {
    p_teacher_profile_id: input.teacher_profile_id,
    p_olympiad_id: input.olympiad_id,
    p_display_name: input.display_name ?? null,
    p_subject_area: input.subject_area ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function assignTeacherPendingOlympiad(input: {
  teacher_profile_id: string;
  pending_olympiad_name: string;
  display_name?: string | null;
  subject_area?: string | null;
}) {
  const { data, error } = await supabase.rpc("assign_teacher_pending_olympiad_admin", {
    p_teacher_profile_id: input.teacher_profile_id,
    p_pending_olympiad_name: input.pending_olympiad_name,
    p_display_name: input.display_name ?? null,
    p_subject_area: input.subject_area ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function removeTeacherAssignment(input: { assignment_id: string }) {
  const { error } = await supabase.rpc("remove_teacher_assignment_admin", {
    p_assignment_id: input.assignment_id,
  });
  if (error) throw error;
}

export async function deleteTeacher(teacherId: string) {
  const { error } = await supabase.rpc("delete_teacher_admin", {
    p_teacher_profile_id: teacherId,
  });
  if (error) throw error;
}

export async function deleteUserAccountAdmin(userId: string) {
  const { error } = await supabase.rpc("delete_user_account_admin", {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function setUserActiveAdmin(userId: string, isActive: boolean) {
  const { error } = await supabase.rpc("admin_set_user_active", {
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) throw error;
}

export async function hardDeleteUserAdmin(userId: string) {
  const { error } = await supabase.rpc("admin_hard_delete_user", {
    p_user_id: userId,
  });
  if (error) throw error;
}

export type LabGameAdminRow = {
  game_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  published: boolean;
  visibility_rule: string;
  updated_at: string;
};

export async function fetchLabGamesAdminRpc() {
  const { data, error } = await supabase.rpc("list_lab_games_admin");
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    game_id: String(row.game_id ?? ""),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    subtitle: row.subtitle ? String(row.subtitle) : null,
    description: row.description ? String(row.description) : null,
    status: String(row.status ?? "development"),
    published: Boolean(row.published),
    visibility_rule: String(row.visibility_rule ?? "admin_only"),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  })) as LabGameAdminRow[];
}

export async function setLabGameStatusAdminRpc(input: {
  gameId: string;
  status: "development" | "internal_test" | "published" | "paused";
  publish?: boolean | null;
}) {
  const { data, error } = await supabase.rpc("set_lab_game_status_admin", {
    p_game_id: input.gameId,
    p_status: input.status,
    p_publish: input.publish ?? null,
  });
  if (error) throw error;
  return String(data ?? input.gameId);
}

export async function fetchWolfGameConfigAdminRpc() {
  const { data, error } = await supabase.rpc("get_wolf_game_config_admin");
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

export async function listPublishedGamesForStudentsRpc() {
  const { data, error } = await supabase.rpc("list_published_games_for_students");
  if (error) throw error;
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function upsertWolfAttemptResultRpc(input: {
  attemptNumber: number;
  hits: number;
  xpBase: number;
  xpStreakBonus: number;
  xpAwarded: number;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.rpc("upsert_wolf_attempt_result", {
    p_attempt_number: input.attemptNumber,
    p_hits: input.hits,
    p_xp_base: input.xpBase,
    p_xp_streak_bonus: input.xpStreakBonus,
    p_xp_awarded: input.xpAwarded,
    p_metadata: input.metadata ?? {},
  });
  if (error) throw error;
  return String(data ?? "");
}

export type WolfAttemptGateSnapshot = {
  is_plan_pro: boolean;
  plan_tier: string;
  attempts_per_day_base: number;
  attempts_per_day_effective: number;
  attempts_used_today: number;
  attempts_remaining: number;
  cooldown_minutes: number;
  latest_attempt_finished_at: string | null;
};

export type WolfWeeklyRankingRow = {
  rank: number;
  user_id: string;
  full_name: string | null;
  weekly_xp: number;
  is_current_user: boolean;
  is_public: boolean;
};

export async function fetchWolfAttemptGateRpc(): Promise<WolfAttemptGateSnapshot | null> {
  const { data, error } = await supabase.rpc("get_wolf_attempt_gate");
  if (error) throw error;
  const first = Array.isArray(data) ? data[0] : null;
  if (!first || typeof first !== "object") return null;
  const row = first as Record<string, unknown>;
  return {
    is_plan_pro: Boolean(row.is_plan_pro),
    plan_tier: String(row.plan_tier ?? "free"),
    attempts_per_day_base: Number(row.attempts_per_day_base ?? 4),
    attempts_per_day_effective: Number(row.attempts_per_day_effective ?? 4),
    attempts_used_today: Number(row.attempts_used_today ?? 0),
    attempts_remaining: Number(row.attempts_remaining ?? 0),
    cooldown_minutes: Number(row.cooldown_minutes ?? 10),
    latest_attempt_finished_at: row.latest_attempt_finished_at ? String(row.latest_attempt_finished_at) : null,
  };
}

export async function fetchWolfWeeklyRankingStudentRpc(limit = 5): Promise<WolfWeeklyRankingRow[]> {
  const { data, error } = await supabase.rpc("get_wolf_weekly_ranking_student", {
    p_limit: limit,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      rank: Number(item.rank ?? 0),
      user_id: String(item.user_id ?? ""),
      full_name: item.full_name ? String(item.full_name) : null,
      weekly_xp: Number(item.weekly_xp ?? 0),
      is_current_user: Boolean(item.is_current_user),
      is_public: Boolean(item.is_public),
    };
  });
}

export type WolfBankQuestionRow = {
  question_id: string;
  phase_category: string;
  grade: string;
  band: string;
  discipline: string | null;
  difficulty: string;
  prompt: string;
  vestibular_name: string | null;
  vestibular_year: number | null;
  vestibular_url: string | null;
  options: string[];
  correct_option_index: number;
  explanation: string;
  tags: string[];
  estimated_read_time: number;
};

function normalizeQuestionOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 4);
  }
  return [];
}

function mapWolfBankQuestionRow(row: Record<string, unknown>): WolfBankQuestionRow {
  return {
    question_id: String(row.question_id ?? ""),
    phase_category: String(row.phase_category ?? ""),
    grade: String(row.grade ?? ""),
    band: String(row.band ?? ""),
    discipline: row.discipline ? String(row.discipline) : null,
    difficulty: String(row.difficulty ?? ""),
    prompt: String(row.prompt ?? ""),
    vestibular_name: row.vestibular_name ? String(row.vestibular_name) : null,
    vestibular_year: row.vestibular_year === null || row.vestibular_year === undefined
      ? null
      : Number(row.vestibular_year),
    vestibular_url: row.vestibular_url ? String(row.vestibular_url) : null,
    options: normalizeQuestionOptions(row.options),
    correct_option_index: Number(row.correct_option_index ?? 0),
    explanation: String(row.explanation ?? ""),
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag ?? "")).filter(Boolean) : [],
    estimated_read_time: Number(row.estimated_read_time ?? 12),
  };
}

export async function pickWolfQuestionsFromBankRpc(input: { grade: string; sessionKey?: string | null }) {
  const { data, error } = await supabase.rpc("pick_wolf_questions_from_bank", {
    p_grade: input.grade,
    p_session_key: input.sessionKey ?? null,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapWolfBankQuestionRow);
}

export async function previewWolfQuestionFromBankAdminRpc(input: {
  grade: string;
  category?: "reflexo" | "logica" | "conhecimento" | "lideranca";
}) {
  const { data, error } = await supabase.rpc("preview_wolf_question_from_bank_admin", {
    p_grade: input.grade,
    p_category: input.category ?? "logica",
  });
  if (error) throw error;
  const first = Array.isArray(data) ? data[0] : null;
  if (!first || typeof first !== "object") return null;
  return mapWolfBankQuestionRow(first as Record<string, unknown>);
}
