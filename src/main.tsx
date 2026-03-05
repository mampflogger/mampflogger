import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LOVABLE_TOKEN_PARAM = "__lovable_token";
const LOVABLE_TOKEN_SESSION_KEY = "mampflogger-lovable-preview-token";
const LOVABLE_TOKEN_LOCAL_KEY_PREFIX = "mampflogger-lovable-preview-token-v2";
const PREVIEW_BUST_PARAM = "__preview_bust";
const PREVIEW_CACHE_RESET_KEY_PREFIX = "mampflogger-preview-cache-reset-v3";

function isLovablePreviewHost(): boolean {
  const host = window.location.hostname;
  return host.endsWith("lovableproject.com") || (host.endsWith(".lovable.app") && host.includes("--"));
}

function getPreviewTokenStorageKey(): string {
  return `${LOVABLE_TOKEN_LOCAL_KEY_PREFIX}:${window.location.hostname}:${window.location.pathname}`;
}

function readStoredPreviewToken(): string | null {
  return sessionStorage.getItem(LOVABLE_TOKEN_SESSION_KEY) ?? localStorage.getItem(getPreviewTokenStorageKey());
}

function persistPreviewToken(token: string): void {
  sessionStorage.setItem(LOVABLE_TOKEN_SESSION_KEY, token);
  localStorage.setItem(getPreviewTokenStorageKey(), token);
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

  if (currentToken) {
    persistPreviewToken(currentToken);
    return false;
  }

  const storedToken = readStoredPreviewToken();
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

