import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { collectCloudBackupSnapshot, restoreCloudBackupSnapshot, isCloudBackupKey } from "@/lib/cloudBackup";

export function useCloudBackup(userId: string | null) {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    let isDisposed = false;

    const syncToCloud = async () => {
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
        window.location.reload();
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
