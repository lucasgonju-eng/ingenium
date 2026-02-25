import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "../supabase/client";

export type TermsVersion = {
  id: string;
  version_text: string;
  effective_at: string;
  content: string;
  content_sha256: string;
};

export type ConsentClientContext = {
  userAgent: string;
  appPlatform: string;
  appVersion: string;
  locale: string;
  deviceFingerprint: string | null;
};

function getWebUserAgent() {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent ?? "";
}

function getLocale() {
  if (typeof navigator !== "undefined") {
    return navigator.language ?? "pt-BR";
  }
  return "pt-BR";
}

async function sha256Hex(value: string): Promise<string | null> {
  if (typeof crypto === "undefined" || !("subtle" in crypto)) return null;
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildConsentClientContext(): Promise<ConsentClientContext> {
  const userAgent = getWebUserAgent();
  const appPlatform = Platform.OS;
  const appVersion = String(Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0");
  const locale = getLocale();

  const rawFingerprint = [
    userAgent,
    appPlatform,
    locale,
    typeof window !== "undefined" ? `${window.screen?.width}x${window.screen?.height}` : "native",
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  ].join("|");

  const deviceFingerprint = await sha256Hex(rawFingerprint);

  return {
    userAgent,
    appPlatform,
    appVersion,
    locale,
    deviceFingerprint,
  };
}

export async function fetchLatestTermsVersion(): Promise<TermsVersion> {
  const { data, error } = await supabase
    .from("terms_versions")
    .select("id,version_text,effective_at,content,content_sha256")
    .lte("effective_at", new Date().toISOString())
    .order("effective_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data as TermsVersion;
}

export async function hasAcceptedLatestTerms() {
  const { data, error } = await supabase.rpc("has_accepted_latest_terms");
  if (error) throw error;
  return Boolean(data);
}

export async function acceptLatestTerms(params: {
  termsVersionId: string;
  evidenceJson?: Record<string, unknown>;
}) {
  const ctx = await buildConsentClientContext();
  const { data, error } = await supabase.rpc("accept_latest_terms", {
    p_terms_version_id: params.termsVersionId,
    p_ip_address: null,
    p_user_agent: ctx.userAgent || null,
    p_device_fingerprint: ctx.deviceFingerprint,
    p_app_platform: ctx.appPlatform,
    p_app_version: ctx.appVersion,
    p_locale: ctx.locale,
    p_evidence_json: params.evidenceJson ?? {},
  });
  if (error) throw error;
  return data;
}
