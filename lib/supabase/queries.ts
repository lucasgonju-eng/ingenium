import { supabase } from "./client";

export async function fetchRankingGeral(limit = 50) {
  const { data, error } = await supabase
    .from("v_ranking_geral")
    .select("rank,user_id,full_name,grade,class_name,total_points,lobo_class")
    .order("rank", { ascending: true })
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
    .single();

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
