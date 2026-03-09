import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardDrive, Check, X, Link, AlertCircle, Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCloudBackup } from "@/hooks/useCloudBackup";

const generateSyncCode = () => {
  return Array.from({ length: 2 }, () => 
    (Math.random() * 1000000).toString(36).slice(0, 3).toUpperCase()
  ).join('-');
};

export const CloudBackupSettings = () => {
  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempCode, setTempCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { lastSync } = useCloudBackup(syncCode);

  useEffect(() => {
    const saved = localStorage.getItem("mampflogger-sync-code");
    setSyncCode(saved);
  }, []);

  const handleActivate = async () => {
    setIsLoading(true);
    const newCode = generateSyncCode();
    
    // Test if we can write to cloud
    try {
      const { error } = await supabase.from('cloud_backups').upsert({
        id: newCode,
        data: { test: "connection" },
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      localStorage.setItem("mampflogger-sync-code", newCode);
      setSyncCode(newCode);
      setIsEditing(false);
      toast.success("Cloud-Backup aktiviert!");
    } catch (error) {
      toast.error("Fehler beim Aktivieren des Cloud-Backups");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!tempCode.trim()) {
      toast.error("Bitte einen Code eingeben");
      return;
    }

    setIsLoading(true);
    
    try {
      // Try to connect to existing backup
      const { data, error } = await supabase
        .from('cloud_backups')
        .select('data')
        .eq('id', tempCode.trim())
        .single();

      if (error || !data) {
        toast.error("Code nicht gefunden. Möglicherweise noch nicht synchronisiert.");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("mampflogger-sync-code", tempCode.trim());
      setSyncCode(tempCode.trim());
      setIsEditing(false);
      setTempCode("");
      
      // Restore data
      Object.entries(data.data as Record<string, string>).forEach(([key, value]) => {
        if (key !== "mampflogger-sync-code") {
          localStorage.setItem(key, value);
        }
      });
      
      toast.success("Mit Cloud-Backup verbunden und Daten wiederhergestellt!");
      
      // Reload page to apply restored data
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Fehler beim Verbinden");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem("mampflogger-sync-code");
    setSyncCode(null);
    toast.success("Cloud-Backup deaktiviert");
  };

  if (!syncCode) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Sichere deine Daten automatisch in der Cloud und synchronisiere sie zwischen Geräten.
        </p>
        
        {!isEditing ? (
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
              onClick={() => setIsEditing(true)}
            >
              <Link className="w-3.5 h-3.5" />
              Verbinden
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Code von anderem Gerät</Label>
              <div className="flex gap-1.5">
                <Input
                  value={tempCode}
                  onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                  placeholder="ABC-DEF"
                  className="h-8 text-xs font-mono flex-1"
                  maxLength={7}
                />
                <Button 
                  size="sm" 
                  onClick={handleConnect}
                  disabled={!tempCode.trim() || isLoading}
                  className="h-8 text-xs"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => { setIsEditing(false); setTempCode(""); }}
                  className="h-8 text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="bg-accent/50 rounded-lg p-2 text-xs text-muted-foreground">
              Gib den Code von einem anderen Gerät ein, auf dem Cloud-Backup bereits aktiv ist.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
        <div className="w-2 h-2 rounded-full bg-primary"></div>
        <span className="text-xs font-medium text-primary">Cloud-Backup aktiv</span>
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs">Synchronisation-Code</Label>
        <div className="flex gap-1.5">
          <div className="flex-1 bg-accent/50 rounded-md px-2 py-1.5 font-mono text-xs border">
            {syncCode}
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(syncCode);
              toast.success("Code kopiert!");
            }}
            className="h-8 text-xs"
          >
            Kopieren
          </Button>
        </div>
      </div>
      
      {lastSync && (
        <div className="text-xs text-muted-foreground">
          Letzte Synchronisation: {lastSync.toLocaleTimeString()}
        </div>
      )}
      
      <div className="bg-accent/50 rounded-lg p-2 text-xs text-muted-foreground">
        Verwende diesen Code auf anderen Geräten, um deine Daten zu synchronisieren.
      </div>
      
      <Button 
        size="sm" 
        variant="outline"
        onClick={handleDisconnect}
        className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        Deaktivieren
      </Button>
    </div>
  );
};