import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LOVABLE_TOKEN_PARAM = "__lovable_token";
const LOVABLE_TOKEN_SESSION_KEY = "mampflogger-lovable-preview-token";
const LOVABLE_TOKEN_LOCAL_KEY_PREFIX = "mampflogger-lovable-preview-token-v3";
const PREVIEW_BUST_PARAM = "__preview_bust";
const PREVIEW_CACHE_RESET_KEY_PREFIX = "mampflogger-preview-cache-reset-v4";
const PREVIEW_TOKEN_MAX_AGE_MS = 30 * 60 * 1000;

type StoredPreviewToken = {
  token: string;
  savedAt: number;
};

function isLovablePreviewHost(): boolean {
  const host = window.location.hostname;
  return host.endsWith("lovableproject.com") || (host.endsWith(".lovable.app") && host.includes("--"));
}

function getPreviewTokenStorageKey(): string {
  return `${LOVABLE_TOKEN_LOCAL_KEY_PREFIX}:${window.location.hostname}`;
}

function readStoredPreviewToken(): string | null {
  const sessionToken = sessionStorage.getItem(LOVABLE_TOKEN_SESSION_KEY);
  if (sessionToken) return sessionToken;

  const localKey = getPreviewTokenStorageKey();
  const localTokenRaw = localStorage.getItem(localKey);
  if (!localTokenRaw) return null;

  try {
    const parsed = JSON.parse(localTokenRaw) as StoredPreviewToken;
    const isValid =
      typeof parsed?.token === "string" &&
      parsed.token.length > 0 &&
      typeof parsed?.savedAt === "number" &&
      Date.now() - parsed.savedAt <= PREVIEW_TOKEN_MAX_AGE_MS;

    if (!isValid) {
      localStorage.removeItem(localKey);
      return null;
    }

    return parsed.token;
  } catch {
    // Legacy plain-string token format: treat as stale to avoid pinning old previews
    localStorage.removeItem(localKey);
    return null;
  }
}

function persistPreviewToken(token: string): void {
  sessionStorage.setItem(LOVABLE_TOKEN_SESSION_KEY, token);
  const payload: StoredPreviewToken = { token, savedAt: Date.now() };
  localStorage.setItem(getPreviewTokenStorageKey(), JSON.stringify(payload));
}

function getPreviewToken(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(LOVABLE_TOKEN_PARAM) ?? readStoredPreviewToken() ?? "no-token";
}

function getPreviewCacheResetKey(token: string): string {
  return `${PREVIEW_CACHE_RESET_KEY_PREFIX}:${token}`;
}

function handleLovablePreviewToken(): boolean {
  if (!isLovablePreviewHost()) return false;

  const params = new URLSearchParams(window.location.search);
  const currentToken = params.get(LOVABLE_TOKEN_PARAM);
  const storedToken = readStoredPreviewToken();

  if (currentToken) {
    // Avoid refreshing stale tokens that we re-injected ourselves.
    if (currentToken !== storedToken) {
      persistPreviewToken(currentToken);
    }
    return false;
  }

  if (!storedToken) return false;

  params.set(LOVABLE_TOKEN_PARAM, storedToken);
  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.location.replace(nextUrl);
  return true;
}

async function resetPreviewCacheOnce(): Promise<boolean> {
  if (!isLovablePreviewHost()) return false;

  const token = getPreviewToken();
  const resetKey = getPreviewCacheResetKey(token);
  if (sessionStorage.getItem(resetKey) === "1") return false;

  sessionStorage.setItem(resetKey, "1");

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn("[Preview] Cache reset failed", error);
  }

  const params = new URLSearchParams(window.location.search);
  params.set(PREVIEW_BUST_PARAM, `${Date.now()}`);
  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.location.replace(nextUrl);
  return true;
}

async function bootstrap() {
  if (handleLovablePreviewToken()) return;
  if (await resetPreviewCacheOnce()) return;

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();

