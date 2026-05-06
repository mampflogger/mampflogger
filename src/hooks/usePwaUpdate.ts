import { useEffect, useRef, useState } from "react";

declare const __APP_VERSION__: string;

const CURRENT_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const VERSION_URL = "/version.json";
const CHECK_INTERVAL = 60 * 1000;
const STARTUP_DELAYS = [1500, 5000, 15000];
const DISMISSED_KEY = "mampflogger-update-dismissed-version";

async function fetchRemoteVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(version: string): void {
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {
    // ignore
  }
}

export function usePwaUpdate() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const remoteVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async (reason: string) => {
      const remote = await fetchRemoteVersion();
      if (cancelled || !remote) return;
      remoteVersionRef.current = remote;
      const dismissed = readDismissed();
      if (remote === CURRENT_VERSION) {
        // We are up to date — clear any stale dismissal marker
        if (dismissed) {
          try { localStorage.removeItem(DISMISSED_KEY); } catch { /* ignore */ }
        }
        setNeedsUpdate(false);
        return;
      }
      if (remote === dismissed) {
        // User already tried to update to this version — don't nag again,
        // even if the bundle didn't actually swap (e.g. proxy/browser cache).
        setNeedsUpdate(false);
        return;
      }
      console.log(`[Update] new version detected (${reason})`, {
        current: CURRENT_VERSION,
        remote,
      });
      setNeedsUpdate(true);
    };

    STARTUP_DELAYS.forEach((d) =>
      window.setTimeout(() => check(`startup+${d}`), d),
    );
    const interval = window.setInterval(() => check("interval"), CHECK_INTERVAL);
    const onFocus = () => check("focus");
    const onVisibility = () => {
      if (document.visibilityState === "visible") check("visibility");
    };
    const onOnline = () => check("online");
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const applyUpdate = async () => {
    const target = remoteVersionRef.current;
    // Mark this version as "user acknowledged" so we never loop on it again,
    // even if the new bundle fails to load due to caching.
    if (target) writeDismissed(target);

    // Best-effort cache wipe so the new build is fetched fresh
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
    } catch (err) {
      console.warn("[Update] cache clear failed", err);
    }
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      regs?.forEach((r) => r.unregister());
    } catch {
      // ignore
    }
    const url = new URL(window.location.href);
    url.searchParams.set("v", target ?? Date.now().toString());
    window.location.replace(url.toString());
  };

  return { needsUpdate, applyUpdate };
}
