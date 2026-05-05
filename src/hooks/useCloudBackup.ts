import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  collectCloudBackupSnapshot,
  consumePendingManualCloudRestoreSnapshot,
  restoreCloudBackupSnapshot,
  isCloudBackupKey,
} from "@/lib/cloudBackup";

const LAST_RESTORED_VERSION_KEY_PREFIX = "mampflogger-cloud-restore-version";
const BOOTSTRAP_EVENT = "mampflogger-cloud-backup-bootstrap";
const CLOUD_BACKUP_ACTIVE_KEY = "mampflogger-cloud-backup-active";

export function useCloudBackup(userId: string | null) {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [restoreRevision, setRestoreRevision] = useState(0);

  const pushNow = useCallback(async () => {
    if (!userId) return false;

    const snapshot = collectCloudBackupSnapshot();
    if (Object.keys(snapshot).length === 0) return false;

    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('cloud_backups').upsert({
      id: userId,
      user_id: userId,
      data: snapshot,
      updated_at: nowIso,
    });

    if (error) {
      console.error("[CloudBackup] Push failed", error);
      return false;
    }

    localStorage.setItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`, nowIso);
    setLastSync(new Date(nowIso));
    return true;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    let isDisposed = false;
    let restoreComplete = false;
    setIsReady(false);
    let lastKnownRemoteVersion: string | null =
      localStorage.getItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`);

    const syncToCloud = async () => {
      // Don't sync until initial restore is done to avoid overwriting cloud with empty data
      if (!restoreComplete) return;
      const pushed = await pushNow();

      if (pushed && !isDisposed) {
        lastKnownRemoteVersion = localStorage.getItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`);
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
      if (remoteVersion && remoteVersion === lastKnownRemoteVersion) return false;

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
          setRestoreRevision((revision) => revision + 1);
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
      const pendingManualRestore = consumePendingManualCloudRestoreSnapshot(userId);
      let handledPendingManualRestore = false;
      if (pendingManualRestore) {
        const restored = restoreCloudBackupSnapshot(pendingManualRestore);
        const nowIso = new Date().toISOString();
        const { error } = await supabase.from('cloud_backups').upsert({
          id: userId,
          user_id: userId,
          data: collectCloudBackupSnapshot(),
          updated_at: nowIso,
        });

        if (!error) {
          lastKnownRemoteVersion = nowIso;
          localStorage.setItem(`${LAST_RESTORED_VERSION_KEY_PREFIX}:${userId}`, nowIso);
          if (restored) setRestoreRevision((revision) => revision + 1);
          handledPendingManualRestore = true;
        } else {
          console.error("[CloudBackup] Pending manual restore push failed", error);
          // Do not pull an older cloud version over a freshly imported manual backup.
          handledPendingManualRestore = true;
        }
      }

      // Initial pull: do NOT reload (we just mounted).
      if (!handledPendingManualRestore) {
        await checkRemoteAndApply({ reloadOnChange: false });
      }
      restoreComplete = true;
      if (!isDisposed) {
        localStorage.setItem(CLOUD_BACKUP_ACTIVE_KEY, "true");
        setIsReady(true);
        window.dispatchEvent(new Event(BOOTSTRAP_EVENT));
      }
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
  }, [pushNow, userId]);

  return { lastSync, isReady, restoreRevision, pushNow };
}
