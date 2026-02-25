type LocalSignupTermsAcceptance = {
  accepted: boolean;
  termsVersionId: string;
  termsHash: string;
  acceptedAtIso: string;
};

let memoryState: LocalSignupTermsAcceptance | null = null;
const STORAGE_KEY = "ingenium.signup.terms.acceptance";

function canUseWebStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setLocalSignupTermsAcceptance(value: LocalSignupTermsAcceptance) {
  memoryState = value;
  if (!canUseWebStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearLocalSignupTermsAcceptance() {
  memoryState = null;
  if (!canUseWebStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getLocalSignupTermsAcceptance(): LocalSignupTermsAcceptance | null {
  if (memoryState) return memoryState;
  if (!canUseWebStorage()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalSignupTermsAcceptance;
    if (!parsed?.accepted || !parsed.termsVersionId || !parsed.termsHash) return null;
    memoryState = parsed;
    return parsed;
  } catch {
    return null;
  }
}
