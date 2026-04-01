import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCloudBackup(userId: string | null) {
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout>;

    const syncToCloud = async () => {
      // Gather backup
      const snapshot: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("mampflogger-") || key === "nutrition-log-entries" || key === "nutrition-log-profile" || key === "nutrition-log-activities")) {
          snapshot[key] = localStorage.getItem(key) ?? "";
        }
      }

      const { error } = await supabase.from('cloud_backups').upsert({
        id: userId,
        user_id: userId,
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

    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, [key, value]);
      if (key.startsWith("mampflogger-") || key === "nutrition-log-entries" || key === "nutrition-log-profile" || key === "nutrition-log-activities") {
        handleStorageChange();
      }
    };

    localStorage.removeItem = function(key) {
      originalRemoveItem.apply(this, [key]);
      if (key.startsWith("mampflogger-") || key === "nutrition-log-entries" || key === "nutrition-log-profile" || key === "nutrition-log-activities") {
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
  }, [userId]);

  return { lastSync };
}
