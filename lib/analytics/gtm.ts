const GTM_ID = "GTM-TNHK5MSV";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    __ingeniumGtmLoaded?: boolean;
  }
}

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
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
}

