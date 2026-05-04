import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function UpdateBanner() {
  const { needsUpdate, applyUpdate } = usePwaUpdate();

  if (!needsUpdate) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] max-w-[95vw]">
      <div className="flex items-center gap-3 rounded-full bg-primary text-primary-foreground px-4 py-2 shadow-lg">
        <RefreshCw className="h-4 w-4" />
        <span className="text-sm font-medium">Neue Version verfügbar</span>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full h-7"
          onClick={() => applyUpdate()}
        >
          Aktualisieren
        </Button>
      </div>
    </div>
  );
}
