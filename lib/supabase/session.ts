import { supabase } from "./client";

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error };
}
