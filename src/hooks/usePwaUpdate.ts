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

export function usePwaUpdate() {
  const {
    needRefresh: [needsUpdate, setNeedsUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("[PWA] SW registered", r);
      // On every SW registration (= after reload too), check if there's a backup to restore
      const pending = sessionStorage.getItem(BACKUP_KEY);
      if (pending) {
        restoreLocalStorage(pending);
        sessionStorage.removeItem(BACKUP_KEY);
        console.log("[PWA] localStorage restored from pre-update backup");
      }
    },
    onRegisterError(error) {
      console.error("[PWA] SW registration error", error);
    },
  });

  const applyUpdate = () => {
    // 1. Snapshot all app data BEFORE the reload
    const backup = snapshotLocalStorage();
    // sessionStorage survives a same-tab reload (unlike localStorage which *should* too,
    // but some SW cache-clearing strategies wipe it)
    sessionStorage.setItem(BACKUP_KEY, backup);
    console.log("[PWA] Backup saved before update", Object.keys(JSON.parse(backup)).length, "keys");
    // 2. Now activate the new SW + reload
    updateServiceWorker(true);
  };

  return { needsUpdate, applyUpdate };
}
