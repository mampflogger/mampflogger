import { useCallback, useRef, useEffect } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { toast } from "sonner";
import { parseSpokenSelectionIndex } from "@/lib/voiceSelection";
import { bestFuzzyMatch } from "@/lib/fuzzyMatch";

interface VoiceCommand {
  patterns: RegExp[];
  action: string | ((transcript: string) => string | null);
}

const RECIPE_NUMBER_PATTERN = "\\d{1,3}|eins|ein|erste|erster|erstes|ersten|zwei|zweite|zweiten|drei|dritte|dritten|vier|vierte|fünf|fuenf|fünfte|sechs|sechste|sieben|siebte|acht|achte|neun|neunte|zehn|zehnte|elf|zwölf|zwoelf|dreizehn|vierzehn|fünfzehn|fuenfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|einundzwanzig|zweiundzwanzig|dreiundzwanzig|vierundzwanzig|fünfundzwanzig|fuenfundzwanzig";

function parseRecipeVoiceAction(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim();
  if (!/\brezept\b/.test(lower)) return null;

  const recipeIndex = parseSpokenSelectionIndex(lower, {
    allowBareNumber: false,
    keywords: ["rezept", "zeige", "öffne", "oeffne", "nimm", "nummer"],
  });

  if (recipeIndex === null) return null;
  return `recipe:${Math.max(0, recipeIndex)}`;
}

const COMMANDS: VoiceCommand[] = [
  // === Section navigation (most specific first) ===
  // Log page sections
  { patterns: [/\bneue[rn]?\s+eintrag\b/i, /\bneue\s+eingabe\b/i], action: "section:neuer-eintrag" },
  { patterns: [/\bnährstoff/i], action: "section:makro-naehrstoffe" },
  { patterns: [/\btagesübersicht\b/i], action: "section:tagesuebersicht" },
  { patterns: [/\bkalorienaufnahme\b/i], action: "section:kalorienaufnahme" },
  { patterns: [/\bfasten/i], action: "section:fastenanalyse" },
  { patterns: [/\bactivit/i, /\baktivität/i, /\baktivitaet\b/i, /\baktivitäten\b/i, /\bworkout\b/i, /\bworkouts\b/i], action: "section:activity" },
  { patterns: [/\bkalorienbilanz\b/i, /\bbilanz\b/i], action: "section:kalorienbilanz" },
  { patterns: [/\bflüssigkeit\b/i], action: "section:fluessigkeit" },

  // Stats page sections (specific before generic)
  { patterns: [/\bkalorien\s+pro\s+tag\b/i], action: "section:kalorien-pro-tag" },
  { patterns: [/\bdefizit/i], action: "section:defizit-pro-tag" },
  { patterns: [/\bmakros?\s+pro\s+tag\b/i], action: "section:makros-pro-tag" },
  { patterns: [/\bmakro.?verteilung\b/i, /\bverteilung\b/i], action: "section:makro-verteilung" },
  { patterns: [/\bvitamine?\b/i], action: "section:vitamine-7-tage" },
  { patterns: [/\bmineralstoffe?\b/i, /\bspurenelemente?\b/i], action: "section:mineralstoffe-7-tage" },
  { patterns: [/\bwochenanalyse\b/i, /\bwoche\s+analysieren\b/i, /^\s*analyse\s*$/i, /\bernährungsberater\b/i, /\bernährungscoach\b/i, /\bcoach\b/i], action: "action:weekly-analysis" },
  { patterns: [/\bübersicht\b/i], action: "section:uebersicht" },

  // Settings sections
  { patterns: [/\bpersönliche\s+daten\b/i], action: "section:persoenliche-daten" },
  { patterns: [/\bgoals?\b/i, /\bziele?\b/i], action: "section:ziele" },
  { patterns: [/\brezeptgenerator\b/i, /\bgenerator\b/i], action: "section:rezeptgenerator" },
  { patterns: [/\bgespeicherte\s+rezepte?\b/i], action: "section:gespeicherte-rezepte" },
  { patterns: [/\bimport\b/i], action: "section:import" },
  { patterns: [/\bexport\b/i], action: "section:export" },
  { patterns: [/\bbackup\b/i, /\bsicherung\b/i], action: "section:backup" },
  { patterns: [/\bcancel\b/i], action: "section:loeschen" },

  // Scroll up/down
  { patterns: [/\bganz\s*nach\s*unten\b/i, /\bganz\s*unten\b/i], action: "scroll:bottom" },
  { patterns: [/\bganz\s*nach\s*oben\b/i, /\bganz\s*oben\b/i], action: "scroll:top" },
  { patterns: [/\brunter\b/i, /\bnach\s*unten\b/i, /\bunten\b/i, /\bscroll\s*runter\b/i], action: "scroll:down" },
  { patterns: [/\bhoch\b/i, /\brauf\b/i, /\bnach\s*oben\b/i, /\boben\b/i, /\bscroll\s*hoch\b/i], action: "scroll:up" },

  // Navigation
  { patterns: [/\bheute\b/i], action: "action:date-today" },
  { patterns: [/\bdatum\b/i], action: "action:date-focus" },
  { patterns: [/\beingabe\b/i, /\blog\b/i], action: "nav:log" },
  { patterns: [/\bstatistik\b/i, /\bwoche\b/i], action: "nav:weekly" },

  // Settings tabs
  { patterns: [/\beinstellung/i, /\bsettings?\b/i], action: "settings:open" },
  { patterns: [/\brezept\s+suchen\b/i], action: "action:recipe-search" },
  { patterns: [new RegExp(`\\brezept\\b.*\\b(?:\\d{1,2}|${RECIPE_NUMBER_PATTERN})\\b`, "i"), new RegExp(`\\b(?:öffne|zeige)\\s+rezept\\b.*\\b(?:\\d{1,2}|${RECIPE_NUMBER_PATTERN})\\b`, "i")], action: parseRecipeVoiceAction },
  { patterns: [/\bprofil\s+speichern\b/i], action: "click:profil-speichern" },
  { patterns: [/\bprofil\b/i], action: "settings:profile" },
  { patterns: [/\bnew\s*food\b/i], action: "click:new-food" },
  { patterns: [/\blebensmittel\s+suchen\b/i], action: "click:food-search" },
  { patterns: [/\blebensmittel\b/i], action: "settings:food" },
  { patterns: [/\brezepte?\b/i], action: "settings:recipes" },
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

  // Contextual field commands (active form only)
  { patterns: [/\bzurück\b/i, /\bzurueck\b/i, /\bback\b/i], action: "field:prev" },
  { patterns: [/\bweiter\b/i, /\bvorwärts\b/i, /\bvorwaerts\b/i, /\bnext\b/i], action: "field:next" },
  { patterns: [/\blöschen\b/i, /\bloeschen\b/i], action: "field:clear" },
  { patterns: [/\bauswahl\b/i, /\boptionen?\b/i], action: "field:open-dropdown" },
  { patterns: [/\bescape\b/i], action: "field:close-dropdown" },

  // Actions
  { patterns: [/\bkamera\b/i, /\bfoto\b/i, /\bphoto\b/i, /\bbild\b/i], action: "action:camera" },
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
  "section-vitamine-7-tage": "weekly",
  "section-mineralstoffe-7-tage": "weekly",
  "section-ki-coach": "weekly",
};

export const SECTION_SETTINGS_TAB: Record<string, string> = {
  "section-persoenliche-daten": "profile",
  "section-ziele": "profile",
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
              const action = typeof cmd.action === "function" ? cmd.action(lower) : cmd.action;
              if (action) {
                onCommandRef.current(action);
                return;
              }
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
