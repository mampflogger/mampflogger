import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { collectCloudBackupSnapshot, restoreCloudBackupSnapshot, isCloudBackupKey } from "@/lib/cloudBackup";

const LAST_RESTORED_VERSION_KEY_PREFIX = "mampflogger-cloud-restore-version";

export function useCloudBackup(userId: string | null) {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    let isDisposed = false;
    let restoreComplete = false;
    let lastKnownRemoteVersion: string | null =
      localStorage.getItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`);

    const syncToCloud = async () => {
      // Don't sync until initial restore is done to avoid overwriting cloud with empty data
      if (!restoreComplete) return;
      const snapshot = collectCloudBackupSnapshot();
      if (Object.keys(snapshot).length === 0) return;

      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('cloud_backups').upsert({
        id: userId,
        user_id: userId,
        data: snapshot,
        updated_at: nowIso,
      });

      if (!error && !isDisposed) {
        setLastSync(new Date());
        // Mark this push as the version we now have locally so a subsequent
        // remote check doesn't trigger a redundant reload.
        lastKnownRemoteVersion = nowIso;
        localStorage.setItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`, nowIso);
      }
    };

    const checkRemoteAndApply = async (options: { reloadOnChange: boolean }) => {
      const { data, error } = await supabase
        .from('cloud_backups')
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data?.data || isDisposed) return false;

      const remoteVersion = data.updated_at ?? null;

      // If we already applied this exact remote version, skip.
      if (remoteVersion && remoteVersion === lastKnownRemoteVersion) {
        return false;
      }

      const restored = restoreCloudBackupSnapshot(data.data as Record<string, unknown>);
      if (restored) {
        if (remoteVersion) {
          lastKnownRemoteVersion = remoteVersion;
          localStorage.setItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`, remoteVersion);
        }
        setLastSync(remoteVersion ? new Date(remoteVersion) : new Date());

        if (options.reloadOnChange) {
          window.location.reload();
        } else {
          // Notify components that storage changed (same-tab listeners)
          window.dispatchEvent(new Event("cloud-backup-restored"));
        }
        return true;
      } else if (remoteVersion) {
        // Data was identical to local; remember the version so we don't re-check forever.
        lastKnownRemoteVersion = remoteVersion;
        localStorage.setItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`, remoteVersion);
      }

      return false;
    };

    // Listen to local storage changes to trigger sync
    const handleStorageChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncToCloud, 2000);
    };

    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, [key, value]);
      if (isCloudBackupKey(key)) {
        handleStorageChange();
      }
    };

    localStorage.removeItem = function(key) {
      originalRemoveItem.apply(this, [key]);
      if (isCloudBackupKey(key)) {
        handleStorageChange();
      }
    };

    // Re-check cloud whenever the tab regains focus or comes online.
    const onFocus = () => {
      if (!restoreComplete) return;
      void checkRemoteAndApply({ reloadOnChange: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // Periodic poll every 30s while the tab is open.
    const pollInterval = window.setInterval(() => {
      if (!restoreComplete) return;
      if (document.visibilityState !== "visible") return;
      void checkRemoteAndApply({ reloadOnChange: true });
    }, 30_000);

    void (async () => {
      // Initial pull: do NOT reload (we just mounted).
      await checkRemoteAndApply({ reloadOnChange: false });
      restoreComplete = true;
      // Push current local state up so cloud reflects whatever we have now
      // (covers the case where local has newer manual import than cloud).
      await syncToCloud();
    })();

    return () => {
      isDisposed = true;
      clearTimeout(debounceTimer);
      window.clearInterval(pollInterval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, [userId]);

  return { lastSync };
}
