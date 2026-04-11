import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { collectCloudBackupSnapshot, restoreCloudBackupSnapshot, isCloudBackupKey } from "@/lib/cloudBackup";

const CLOUD_RESTORE_RELOAD_KEY_PREFIX = "mampflogger-cloud-restore-reload";

export function useCloudBackup(userId: string | null) {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    let isDisposed = false;
    let restoreComplete = false;

    const syncToCloud = async () => {
      // Don't sync until initial restore is done to avoid overwriting cloud with empty data
      if (!restoreComplete) return;
      const snapshot = collectCloudBackupSnapshot();
      if (Object.keys(snapshot).length === 0) return;

      const { error } = await supabase.from('cloud_backups').upsert({
        id: userId,
        user_id: userId,
        data: snapshot,
        updated_at: new Date().toISOString()
      });

      if (!error && !isDisposed) {
        setLastSync(new Date());
      }
    };

    const restoreFromCloudIfNeeded = async () => {
      const { data, error } = await supabase
        .from('cloud_backups')
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data?.data || isDisposed) return false;

      const restored = restoreCloudBackupSnapshot(data.data as Record<string, unknown>);
      if (restored) {
        setLastSync(data.updated_at ? new Date(data.updated_at) : new Date());
        const restoreVersion = data.updated_at ?? "no-updated-at";
        const reloadGuardKey = `${CLOUD_RESTORE_RELOAD_KEY_PREFIX}:${userId}`;
        const alreadyReloadedForVersion = sessionStorage.getItem(reloadGuardKey) === restoreVersion;

        if (!alreadyReloadedForVersion) {
          sessionStorage.setItem(reloadGuardKey, restoreVersion);
          window.location.reload();
        }

        return true;
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

    void (async () => {
      const restored = await restoreFromCloudIfNeeded();
      restoreComplete = true;
      if (!restored) {
        await syncToCloud();
      }
    })();

    return () => {
      isDisposed = true;
      clearTimeout(debounceTimer);
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, [userId]);

  return { lastSync };
}
