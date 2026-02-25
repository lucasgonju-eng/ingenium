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
