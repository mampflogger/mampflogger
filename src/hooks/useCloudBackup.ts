import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCloudBackup(syncCode: string | null) {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!syncCode) return;

    let debounceTimer: ReturnType<typeof setTimeout>;

    const syncToCloud = async () => {
      // Gather backup
      const snapshot: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("mampflogger-") || key === "nutrition-log-entries")) {
          // exclude the sync code itself from backup just in case
          if (key !== "mampflogger-sync-code") {
            snapshot[key] = localStorage.getItem(key) ?? "";
          }
        }
      }

      const { error } = await supabase.from('cloud_backups').upsert({
        id: syncCode,
        data: snapshot,
        updated_at: new Date().toISOString()
      });

      if (!error) {
        setLastSync(new Date());
      }
    };

    // Listen to local storage changes to trigger sync
    const handleStorageChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(syncToCloud, 2000);
    };

    // We monkey patch setItem and removeItem for the relevant keys
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, [key, value]);
      if (key.startsWith("mampflogger-") || key === "nutrition-log-entries") {
        handleStorageChange();
      }
    };

    localStorage.removeItem = function(key) {
      originalRemoveItem.apply(this, [key]);
      if (key.startsWith("mampflogger-") || key === "nutrition-log-entries") {
        handleStorageChange();
      }
    };

    // initial sync
    syncToCloud();

    return () => {
      clearTimeout(debounceTimer);
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, [syncCode]);

  return { lastSync };
}
