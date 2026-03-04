import { useCallback, useRef, useEffect } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { toast } from "sonner";

interface VoiceCommand {
  patterns: RegExp[];
  action: string;
}

const COMMANDS: VoiceCommand[] = [
  // === Section navigation (most specific first) ===
  // Log page sections
  { patterns: [/\bneue[rn]?\s+eintrag\b/i, /\bneue\s+eingabe\b/i], action: "section:neuer-eintrag" },
  { patterns: [/\bnährstoff/i], action: "section:makro-naehrstoffe" },
  { patterns: [/\btagesübersicht\b/i], action: "section:tagesuebersicht" },
  { patterns: [/\bkalorienaufnahme\b/i], action: "section:kalorienaufnahme" },
  { patterns: [/\bfasten/i], action: "section:fastenanalyse" },
  { patterns: [/\bactivit/i, /\baktivität/i, /\baktivitäten\b/i], action: "section:activity" },
  { patterns: [/\bkalorienbilanz\b/i, /\bbilanz\b/i], action: "section:kalorienbilanz" },
  { patterns: [/\bflüssigkeit\b/i], action: "section:fluessigkeit" },

  // Stats page sections (specific before generic)
  { patterns: [/\bkalorien\s+pro\s+tag\b/i], action: "section:kalorien-pro-tag" },
  { patterns: [/\bdefizit/i], action: "section:defizit-pro-tag" },
  { patterns: [/\bmakros?\s+pro\s+tag\b/i], action: "section:makros-pro-tag" },
  { patterns: [/\bmakro.?verteilung\b/i, /\bverteilung\b/i], action: "section:makro-verteilung" },
  { patterns: [/\bwochenanalyse\b/i, /\bwoche\s+analysieren\b/i, /^\s*analyse\s*$/i, /\bernährungsberater\b/i, /\bernährungscoach\b/i, /\bcoach\b/i], action: "action:weekly-analysis" },
  { patterns: [/\bübersicht\b/i], action: "section:uebersicht" },

  // Settings sections
  { patterns: [/\bpersönliche\s+daten\b/i], action: "section:persoenliche-daten" },
  { patterns: [/\bgoals?\b/i, /\bziele?\b/i], action: "section:goals" },
  { patterns: [/\brezeptgenerator\b/i, /\bgenerator\b/i], action: "section:rezeptgenerator" },
  { patterns: [/\bgespeicherte\s+rezepte?\b/i], action: "section:gespeicherte-rezepte" },
  { patterns: [/\bimport\b/i], action: "section:import" },
  { patterns: [/\bexport\b/i], action: "section:export" },
  { patterns: [/\bbackup\b/i, /\bsicherung\b/i], action: "section:backup" },
  { patterns: [/\blöschen\b/i], action: "section:loeschen" },

  // Scroll up/down
  { patterns: [/\brunter\b/i, /\bnach\s*unten\b/i, /\bunten\b/i, /\bscroll\s*runter\b/i], action: "scroll:down" },
  { patterns: [/\bhoch\b/i, /\brauf\b/i, /\bnach\s*oben\b/i, /\boben\b/i, /\bscroll\s*hoch\b/i], action: "scroll:up" },

  // Navigation
  { patterns: [/\beingabe\b/i, /\blog\b/i], action: "nav:log" },
  { patterns: [/\bstatistik\b/i, /\bwoche\b/i], action: "nav:weekly" },

  // Settings tabs
  { patterns: [/\beinstellung/i, /\bsettings?\b/i], action: "settings:open" },
  { patterns: [/\bprofil\s+speichern\b/i], action: "click:profil-speichern" },
  { patterns: [/\bprofil\b/i], action: "settings:profile" },
  { patterns: [/\bnew\s*food\b/i], action: "click:new-food" },
  { patterns: [/\blebensmittel\s+suchen\b/i], action: "click:food-search" },
  { patterns: [/\blebensmittel/i], action: "settings:food" },
  { patterns: [/\brezept/i], action: "settings:recipes" },
  { patterns: [/\bdaten\b/i], action: "settings:data" },

  // Theme – specific color commands BEFORE generic "design"
  { patterns: [/\bdesign\s+blau\b/i, /\bblau(?:es?)?\s+design\b/i], action: "theme:blue" },
  { patterns: [/\bdesign\s+gelb\b/i, /\bgelb(?:es?)?\s+design\b/i], action: "theme:yellow" },
  { patterns: [/\bdesign\s+pink\b/i, /\bpink(?:es?)?\s+design\b/i], action: "theme:pink" },
  { patterns: [/\bdesign\s+grün\b/i, /\bgrün(?:es?)?\s+design\b/i], action: "theme:green" },
  { patterns: [/\bdark\s*mode\b/i, /\bdunkler?\s+modus\b/i], action: "theme:dark" },
  { patterns: [/\blight\s*mode\b/i, /\bheller?\s+modus\b/i], action: "theme:light" },

  // Generic design → settings design tab (after specific theme commands)
  { patterns: [/\bdesign\b/i], action: "settings:design" },

  // Actions
  { patterns: [/\bkamera\b/i, /\bfoto\b/i, /\bphoto\b/i], action: "action:camera" },
];

// Map section IDs to the page they belong to
export const SECTION_PAGE_MAP: Record<string, "log" | "weekly"> = {
  "section-neuer-eintrag": "log",
  "section-makro-naehrstoffe": "log",
  "section-tagesuebersicht": "log",
  "section-kalorienaufnahme": "log",
  "section-fastenanalyse": "log",
  "section-activity": "log",
  "section-kalorienbilanz": "log",
  "section-fluessigkeit": "log",
  "section-uebersicht": "weekly",
  "section-kalorien-pro-tag": "weekly",
  "section-defizit-pro-tag": "weekly",
  "section-makros-pro-tag": "weekly",
  "section-makro-verteilung": "weekly",
  "section-ki-coach": "weekly",
};

export const SECTION_SETTINGS_TAB: Record<string, string> = {
  "section-persoenliche-daten": "profile",
  "section-goals": "profile",
  "section-rezeptgenerator": "recipes",
  "section-gespeicherte-rezepte": "recipes",
  "section-import": "data",
  "section-export": "data",
  "section-backup": "data",
  "section-loeschen": "data",
};

const INACTIVITY_TIMEOUT_MS = 60_000;

interface UseVoiceCommandsOptions {
  onCommand: (action: string) => void;
  onUnhandledSpeech: (transcript: string, isInterim: boolean) => void;
}

interface StartVoiceOptions {
  silent?: boolean;
}

export function useVoiceCommands({ onCommand, onUnhandledSpeech }: UseVoiceCommandsOptions) {
  const onCommandRef = useRef(onCommand);
  const onUnhandledRef = useRef(onUnhandledSpeech);
  onCommandRef.current = onCommand;
  onUnhandledRef.current = onUnhandledSpeech;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopFnRef = useRef<() => void>(() => {});

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      stopFnRef.current();
      toast("🎤 Mikrofon nach 1 Min. Inaktivität deaktiviert.");
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  const voice = useSpeechRecognition({
    onResult: useCallback((transcript: string, isInterim: boolean) => {
      resetTimeout();

      // Try matching commands (only on final results)
      if (!isInterim) {
        const lower = transcript.toLowerCase().trim();
        for (const cmd of COMMANDS) {
          for (const pattern of cmd.patterns) {
            if (pattern.test(lower)) {
              onCommandRef.current(cmd.action);
              return;
            }
          }
        }
      }

      // No command matched → delegate to active field handler
      onUnhandledRef.current(transcript, isInterim);
    }, [resetTimeout]),
    onError: useCallback((error: string) => {
      if (error === "not-allowed" || error === "service-not-allowed") {
        toast.error("Mikrofon blockiert – bitte Browser-Zugriff erlauben.");
      } else if (error === "not-supported") {
        toast.error("Spracherkennung nicht unterstützt.");
      } else if (error === "audio-capture") {
        toast.error("Kein Mikrofon erkannt.");
      } else if (error === "restart-requires-gesture") {
        toast.error("Mikrofon pausiert – bitte erneut tippen.");
      } else if (error === "start-failed") {
        toast.error("Mikrofon konnte nicht gestartet werden.");
      }
    }, []),
  });

  stopFnRef.current = voice.stop;

  const start = useCallback((options?: StartVoiceOptions) => {
    voice.start(options);
    resetTimeout();
  }, [voice.start, resetTimeout]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    voice.stop();
  }, [voice.stop]);

  const toggle = useCallback(() => {
    voice.isListening ? stop() : start();
  }, [voice.isListening, start, stop]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isListening: voice.isListening, toggle, start, stop, isSupported: voice.isSupported };
}
