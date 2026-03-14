import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Safari iOS pode travar no Navigator LockManager e estourar timeout de auth-token.
    // processLock evita essa disputa e estabiliza login no mobile browser.
    lock: processLock,
  },
});
