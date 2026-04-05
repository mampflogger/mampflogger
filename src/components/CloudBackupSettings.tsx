import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCloudBackup } from "@/hooks/useCloudBackup";
import { collectCloudBackupSnapshot } from "@/lib/cloudBackup";

export const CloudBackupSettings = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { lastSync } = useCloudBackup(isActive ? userId : null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        // Check if cloud backup is active
        const saved = localStorage.getItem("mampflogger-cloud-backup-active");
        setIsActive(saved === "true");
      }
    });
  }, []);

  const handleActivate = async () => {
    if (!userId) {
      toast.error("Bitte erst einloggen.");
      return;
    }
    setIsLoading(true);
    try {
      const snapshot = collectCloudBackupSnapshot();
      const { error } = await supabase.from('cloud_backups').upsert({
        id: userId,
        user_id: userId,
        data: snapshot,
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      localStorage.setItem("mampflogger-cloud-backup-active", "true");
      setIsActive(true);
      toast.success("Cloud-Backup aktiviert!");
    } catch (error) {
      toast.error("Fehler beim Aktivieren des Cloud-Backups");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cloud_backups')
        .select('data')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        toast.error("Kein Cloud-Backup gefunden.");
        setIsLoading(false);
        return;
      }

      Object.entries(data.data as Record<string, string>).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      toast.success("Daten aus Cloud-Backup wiederhergestellt!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Fehler beim Wiederherstellen");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = () => {
    localStorage.removeItem("mampflogger-cloud-backup-active");
    setIsActive(false);
    toast.success("Cloud-Backup deaktiviert");
  };

  if (!isActive) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Sichere deine Daten automatisch in der Cloud. Deine Daten sind mit deinem Account verknüpft und auf allen Geräten verfügbar.
        </p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={handleActivate}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
            Aktivieren
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={handleRestore}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Wiederherstellen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
        <div className="w-2 h-2 rounded-full bg-primary"></div>
        <span className="text-xs font-medium text-primary">Cloud-Backup aktiv</span>
      </div>
      
      {lastSync && (
        <div className="text-xs text-muted-foreground">
          Letzte Synchronisation: {lastSync.toLocaleTimeString()}
        </div>
      )}
      
      <div className="bg-accent/50 rounded-lg p-2 text-xs text-muted-foreground">
        Deine Daten werden automatisch mit deinem Account synchronisiert.
      </div>
      
      <Button 
        size="sm" 
        variant="outline"
        onClick={handleDeactivate}
        className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        Deaktivieren
      </Button>
    </div>
  );
};
