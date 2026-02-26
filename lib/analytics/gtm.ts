const GTM_ID = "GTM-TNHK5MSV";
import { supabase } from "../supabase/client";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    __ingeniumGtmLoaded?: boolean;
  }
}

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getSessionId() {
  if (!canUseDom()) return null;
  const storageKey = "ingenium_analytics_session_id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const generated = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

function detectClientContext() {
  if (!canUseDom()) return {};
  const ua = window.navigator.userAgent || "";
  const lower = ua.toLowerCase();
  const deviceType =
    /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : /tablet/i.test(ua) ? "tablet" : "desktop";
  const browserName = lower.includes("edg/")
    ? "edge"
    : lower.includes("chrome/")
      ? "chrome"
      : lower.includes("safari/") && !lower.includes("chrome/")
        ? "safari"
        : lower.includes("firefox/")
          ? "firefox"
          : "unknown";
  const osName = lower.includes("windows")
    ? "windows"
    : lower.includes("mac os")
      ? "macos"
      : lower.includes("android")
        ? "android"
        : lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")
          ? "ios"
          : lower.includes("linux")
            ? "linux"
            : "unknown";

  const locale = window.navigator.language || null;
  const localeCountry = locale?.includes("-") ? locale.split("-")[1]?.toUpperCase() ?? null : null;

  return {
    session_id: getSessionId(),
    device_type: deviceType,
    os_name: osName,
    browser_name: browserName,
    platform: "web",
    locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    page_path: window.location.pathname,
    page_url: window.location.href,
    referrer: document.referrer || null,
    country: localeCountry,
  };
}

async function persistAnalyticsEvent(event: string, payload: Record<string, unknown>) {
  try {
    const ctx = detectClientContext();
    await supabase.rpc("log_analytics_event", {
      p_event_name: event,
      p_event_source: "app",
      p_session_id: ctx.session_id ?? null,
      p_page_path: ctx.page_path ?? null,
      p_page_url: ctx.page_url ?? null,
      p_referrer: ctx.referrer ?? null,
      p_device_type: ctx.device_type ?? null,
      p_os_name: ctx.os_name ?? null,
      p_browser_name: ctx.browser_name ?? null,
      p_platform: ctx.platform ?? null,
      p_locale: ctx.locale ?? null,
      p_timezone: ctx.timezone ?? null,
      p_country: ctx.country ?? null,
      p_region: null,
      p_city: null,
      p_payload: payload,
    });
  } catch {
    // Analytics nunca pode quebrar fluxo de produto.
  }
}

export function initGtm() {
  if (!canUseDom()) return;
  if (window.__ingeniumGtmLoaded) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.appendChild(script);

  const noscript = document.createElement("noscript");
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(
    GTM_ID,
  )}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.appendChild(noscript);

  window.__ingeniumGtmLoaded = true;
}

export function trackEvent(event: string, payload: Record<string, unknown> = {}) {
  if (!canUseDom()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...payload,
  });
  void persistAnalyticsEvent(event, payload);
}

