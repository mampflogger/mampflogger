import { useRegisterSW } from "virtual:pwa-register/react";

const BACKUP_KEY = "mampflogger-pwa-backup";

/** Snapshot all mampflogger-* keys + nutrition-log-entries into a single JSON string */
function snapshotLocalStorage(): string {
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    // Persist everything relevant – mampflogger-* keys AND the legacy nutrition key
    if (key.startsWith("mampflogger-") || key === "nutrition-log-entries") {
      snapshot[key] = localStorage.getItem(key) ?? "";
    }
  }
  return JSON.stringify(snapshot);
}

/** Restore a previous snapshot, only filling in keys that are missing */
function restoreLocalStorage(json: string) {
  try {
    const snapshot: Record<string, string> = JSON.parse(json);
    for (const [key, value] of Object.entries(snapshot)) {
      // Only restore if the key was lost (don't overwrite if still present)
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
      }
    }
  } catch {
    console.error("[PWA] Failed to restore backup");
  }
}

const UPDATE_CHECK_INTERVAL = 60 * 1000; // Check every 60s

export function usePwaUpdate() {
  const {
    needRefresh: [needsUpdate, setNeedsUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log("[PWA] SW registered");

      // Restore backup after reload
      const pending = sessionStorage.getItem(BACKUP_KEY);
      if (pending) {
        restoreLocalStorage(pending);
        sessionStorage.removeItem(BACKUP_KEY);
        console.log("[PWA] localStorage restored from pre-update backup");
      }

      if (!registration) return;

      // Periodic update check
      setInterval(() => {
        console.log("[PWA] Periodic update check");
        registration.update();
      }, UPDATE_CHECK_INTERVAL);

      // Check on tab focus (user comes back to the app)
      const onFocus = () => {
        console.log("[PWA] Focus update check");
        registration.update();
      };
      window.addEventListener("focus", onFocus);

      // Check on online (device reconnects)
      const onOnline = () => {
        console.log("[PWA] Online update check");
        registration.update();
      };
      window.addEventListener("online", onOnline);
    },
    onRegisterError(error) {
      console.error("[PWA] SW registration error", error);
    },
  });

  const applyUpdate = () => {
    const backup = snapshotLocalStorage();
    sessionStorage.setItem(BACKUP_KEY, backup);
    console.log("[PWA] Backup saved before update", Object.keys(JSON.parse(backup)).length, "keys");
    updateServiceWorker(true);
  };

  return { needsUpdate, applyUpdate };
}
