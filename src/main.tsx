import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const LOVABLE_TOKEN_PARAM = "__lovable_token";
const LOVABLE_TOKEN_SESSION_KEY = "mampflogger-lovable-preview-token";
const PREVIEW_CACHE_RESET_KEY = "mampflogger-preview-cache-reset-v1";

function isLovablePreviewHost(): boolean {
  const host = window.location.hostname;
  return host.endsWith("lovableproject.com") || (host.endsWith(".lovable.app") && host.includes("--"));
}

function handleLovablePreviewToken(): boolean {
  if (!isLovablePreviewHost()) return false;

  const params = new URLSearchParams(window.location.search);
  const currentToken = params.get(LOVABLE_TOKEN_PARAM);

  if (currentToken) {
    sessionStorage.setItem(LOVABLE_TOKEN_SESSION_KEY, currentToken);
    return false;
  }

  const storedToken = sessionStorage.getItem(LOVABLE_TOKEN_SESSION_KEY);
  if (!storedToken) return false;

  params.set(LOVABLE_TOKEN_PARAM, storedToken);
  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.location.replace(nextUrl);
  return true;
}

async function resetPreviewCacheOnce(): Promise<boolean> {
  if (!isLovablePreviewHost()) return false;
  if (sessionStorage.getItem(PREVIEW_CACHE_RESET_KEY) === "1") return false;

  sessionStorage.setItem(PREVIEW_CACHE_RESET_KEY, "1");

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
  params.set("__preview_bust", String(Date.now()));
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

