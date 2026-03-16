import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const DISCLAIMER_KEY = "mampflogger-disclaimer-accepted";

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISCLAIMER_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, "1");
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold">
            Wichtiger Hinweis &amp; Haftungsausschluss
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Mampflogger ist ein privates Projekt zur Unterstützung deiner Ernährung.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Die Inhalte (insb. KI-Vorschläge) sind keine medizinische Beratung oder Diagnose.</li>
                <li>Konsultiere bei Allergien, Vorerkrankungen oder gesundheitlichen Fragen immer einen Arzt.</li>
                <li>Die Nutzung der App erfolgt auf eigene Gefahr. Wir übernehmen keine Haftung für gesundheitliche Folgen oder die Richtigkeit der Daten.</li>
              </ol>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAccept} className="w-full">
            Ich habe verstanden
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
