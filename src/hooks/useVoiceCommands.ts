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
  { patterns: [/\bneue[rn]?\s+eintrag\s+(?:foto|photo|kamera|bild|camera)\b/i, /\beingabe\s+(?:foto|photo|kamera|bild|camera)\b/i], action: "action:entry+camera" },
  { patterns: [/\bneue[rn]?\s+eintrag\b/i, /\bneue\s+eingabe\b/i], action: "section:neuer-eintrag" },
  { patterns: [/\bnährstoff/i], action: "section:makro-naehrstoffe" },
  { patterns: [/\btagesübersicht\b/i, /\btagesprotokoll\b/i, /\bprotokoll\b/i], action: "section:tagesuebersicht" },
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

  // Individual vitamins (BEFORE the general "Vitamine" pattern!)
  { patterns: [/\bvitamin\s*a\b/i, /\bretinol\b/i], action: "nutrient:vitA:vitamins" },
  { patterns: [/\bvitamin\s*b\s*1\b/i, /\bthiamin\b/i], action: "nutrient:vitB1:vitamins" },
  { patterns: [/\bvitamin\s*b\s*2\b/i, /\briboflavin\b/i], action: "nutrient:vitB2:vitamins" },
  { patterns: [/\bvitamin\s*b\s*3\b/i, /\bniacin\b/i], action: "nutrient:vitB3:vitamins" },
  { patterns: [/\bvitamin\s*b\s*5\b/i, /\bpantothensäure\b/i], action: "nutrient:vitB5:vitamins" },
  { patterns: [/\bvitamin\s*b\s*6\b/i, /\bpyridoxin\b/i], action: "nutrient:vitB6:vitamins" },
  { patterns: [/\bvitamin\s*b\s*7\b/i, /\bbiotin\b/i], action: "nutrient:vitB7:vitamins" },
  { patterns: [/\bvitamin\s*b\s*9\b/i, /\bfolsäure\b/i], action: "nutrient:vitB9:vitamins" },
  { patterns: [/\bvitamin\s*b\s*12\b/i, /\bcobalamin\b/i], action: "nutrient:vitB12:vitamins" },
  { patterns: [/\bvitamin\s*c\b/i, /\bascorbinsäure\b/i], action: "nutrient:vitC:vitamins" },
  { patterns: [/\bvitamin\s*d\b/i, /\bcalciferol\b/i], action: "nutrient:vitD:vitamins" },
  { patterns: [/\bvitamin\s*e\b/i, /\btocopherol\b/i], action: "nutrient:vitE:vitamins" },
  { patterns: [/\bvitamin\s*k\b/i, /\bphyllochinon\b/i], action: "nutrient:vitK:vitamins" },

  // Individual minerals (BEFORE the general "Mineralstoffe" pattern!)
  { patterns: [/\bcalcium\b/i, /\bkalzium\b/i], action: "nutrient:calcium:minerals" },
  { patterns: [/\beisen\b/i], action: "nutrient:eisen:minerals" },
  { patterns: [/\bmagnesium\b/i], action: "nutrient:magnesium:minerals" },
  { patterns: [/\bzink\b/i], action: "nutrient:zink:minerals" },
  { patterns: [/\bkalium\b/i], action: "nutrient:kalium:minerals" },
  { patterns: [/\bnatrium\b/i], action: "nutrient:natrium:minerals" },
  { patterns: [/\bphosphor\b/i], action: "nutrient:phosphor:minerals" },
  { patterns: [/\bkupfer\b/i], action: "nutrient:kupfer:minerals" },
  { patterns: [/\bmangan\b/i], action: "nutrient:mangan:minerals" },
  { patterns: [/\bfluorid\b/i], action: "nutrient:fluorid:minerals" },
  { patterns: [/\bchlor(?:id)?\b/i], action: "nutrient:chlorid:minerals" },
  { patterns: [/\bschwefel\b/i], action: "nutrient:schwefel:minerals" },

  // General vitamin/mineral section navigation
  { patterns: [/\bvitamine\b/i], action: "section:vitamine-7-tage" },
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
  { patterns: [/\bsichern\b/i, /\bupload\b/i], action: "backup-create" },
  { patterns: [/\bladen\b/i, /\bdownload\b/i], action: "backup-load" },
  { patterns: [/\bcancel\b/i], action: "section:loeschen" },

  // Scroll up/down
  { patterns: [/\bganz\s*nach\s*unten\b/i, /\bganz\s*unten\b/i], action: "scroll:bottom" },
  { patterns: [/\bganz\s*nach\s*oben\b/i, /\bganz\s*oben\b/i], action: "scroll:top" },
  { patterns: [/\brunter\b/i, /\bnach\s*unten\b/i, /\bunten\b/i, /\bscroll\s*runter\b/i], action: "scroll:down" },
  { patterns: [/\bhoch\b/i, /\brauf\b/i, /\bnach\s*oben\b/i, /\boben\b/i, /\bscroll\s*hoch\b/i], action: "scroll:up" },

  // Global escape / home
  { patterns: [/\bhome\b/i, /\bstart\b/i, /\bstartseite\b/i, /\bhauptseite\b/i, /\banfang\b/i], action: "action:home" },

  // Navigation
  { patterns: [/\bheute\b/i], action: "action:date-today" },
  { patterns: [/\bdatum\b/i], action: "action:date-focus" },
  { patterns: [/\beingabe\b/i, /\blog\b/i], action: "nav:log" },
  { patterns: [/\bstatistik\b/i, /\bwoche\b/i], action: "nav:weekly" },

  // Settings tabs
  { patterns: [/\beinstellung/i, /\bsettings?\b/i], action: "settings:open" },
  { patterns: [/\brezept\s+suchen\b/i], action: "action:recipe-search" },
  { patterns: [new RegExp(`\\brezept\\b.*\\b(?:\\d{1,2}|${RECIPE_NUMBER_PATTERN})\\b`, "i"), new RegExp(`\\b(?:öffne|zeige)\\s+rezept\\b.*\\b(?:\\d{1,2}|${RECIPE_NUMBER_PATTERN})\\b`, "i")], action: parseRecipeVoiceAction },
  { patterns: [/\brezept\s+speichern\b/i], action: "click:rezept-speichern" },
  { patterns: [/\bprofil\s+speichern\b/i], action: "click:profil-speichern" },
  { patterns: [/\bprofil\b/i], action: "settings:profile" },
  { patterns: [/\bnew\s*food\b/i, /\bneue?s?\s+lebensmittel\b/i], action: "click:new-food" },
  { patterns: [/\blebensmittel\s+suchen\b/i], action: "click:food-search" },
  { patterns: [/\blebensmittel\b/i], action: "settings:food" },
  { patterns: [/\brezepte?\s+neu\b/i, /\bneue?s?\s+rezepte?\b/i], action: "settings:recipes+new" },
  { patterns: [/\brezepte?\s+kamera\b/i, /\brezepte?\s+foto\b/i], action: "settings:recipes+camera" },
  { patterns: [/\brezepte?\b/i], action: "settings:recipes" },
  { patterns: [/\bdaten\b/i], action: "settings:data" },

  // Theme – specific color commands BEFORE generic "design"
  { patterns: [/\bdesign\s+blau\b/i, /\bblau(?:es?)?\s+design\b/i], action: "theme:blue" },
  { patterns: [/\bdesign\s+gelb\b/i, /\bgelb(?:es?)?\s+design\b/i], action: "theme:yellow" },
  { patterns: [/\bdesign\s+pink\b/i, /\bpink(?:es?)?\s+design\b/i], action: "theme:pink" },
  { patterns: [/\bdesign\s+grün\b/i, /\bgrün(?:es?)?\s+design\b/i], action: "theme:green" },
  { patterns: [/\bdesign\s+orange\b/i, /\borange(?:s?)?\s+design\b/i], action: "theme:orange" },
  { patterns: [/\bdesign\s+t(?:ü|ue)rkis\b/i, /\bt(?:ü|ue)rkis(?:es?)?\s+design\b/i], action: "theme:teal" },
  { patterns: [/\bdesign\s+rot\b/i, /\brote?s?\s+design\b/i], action: "theme:red" },
  { patterns: [/\bdesign\s+grau\b/i, /\bgraue?s?\s+design\b/i], action: "theme:gray" },
  { patterns: [/\bdark\s*mode\b/i, /\bdunkler?\s+modus\b/i], action: "theme:dark" },
  { patterns: [/\blight\s*mode\b/i, /\bheller?\s+modus\b/i], action: "theme:light" },

  // Bare color words (context-sensitive: only work on design tab)
  { patterns: [/^\s*(?:farbe\s+)?blau(?:es|en|em)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:blue" },
  { patterns: [/^\s*(?:farbe\s+)?gelb(?:e|en|em|es)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:yellow" },
  { patterns: [/^\s*(?:farbe\s+)?pink(?:e|en|em|es)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:pink" },
  { patterns: [/^\s*(?:farbe\s+)?gr(?:ü|ue)n(?:e|en|em|es)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:green" },
  { patterns: [/^\s*(?:farbe\s+)?orange(?:n|s)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:orange" },
  { patterns: [/^\s*(?:farbe\s+)?t(?:ü|ue)rkis(?:e|en|em|es)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:teal" },
  { patterns: [/^\s*(?:farbe\s+)?rot(?:e|en|em|es)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:red" },
  { patterns: [/^\s*(?:farbe\s+)?grau(?:e|en|em|es)?(?:\s+bitte)?[.!?]?\s*$/i], action: "ctx-color:gray" },

  // Generic design → settings design tab (after specific theme commands)
  { patterns: [/\bdesign\b/i], action: "settings:design" },

  // Contextual field commands (active form only)
  { patterns: [/\bzurück\b/i, /\bzurueck\b/i, /\bback\b/i], action: "field:prev" },
  { patterns: [/\bweiter\b/i, /\bvorwärts\b/i, /\bvorwaerts\b/i, /\bnext\b/i], action: "field:next" },
  { patterns: [/\blöschen\b/i, /\bloeschen\b/i], action: "field:clear" },
  { patterns: [/\b(?:auswahl|optionen?|option|ausklappen|aufklappen|dropdown|liste)\b/i], action: "field:open-dropdown" },
  { patterns: [/\b(?:escape|schließen|schliessen|zu\s*klappen|zuklappen|zumachen|abbrechen|storn(?:o|ier|ierung)?|cancel)\b/i], action: "field:close-dropdown" },

  // Actions
  { patterns: [/\bhilfe\b/i, /\bhelp\b/i], action: "action:help" },
  { patterns: [/\bmikro\s*aus\b/i, /\bmikrofon\s*aus\b/i, /\bmic\s*off\b/i], action: "action:mic-off" },
  { patterns: [/\bkamera\s*foto\b/i, /\bkamera\s*bild\b/i, /\bfoto\s*kamera\b/i], action: "action:camera" },
  { patterns: [/\bkamera\b/i, /\bcamera\b/i, /\bfoto\b/i, /\bphoto\b/i, /\bbild\b/i, /\bfoto(?:s|grafie)?\b/i], action: "action:camera" },
];

// Fuzzy keyword → action map for fallback matching when regex fails
const FUZZY_KEYWORD_MAP: [string, string][] = [
  ["neuer eintrag", "section:neuer-eintrag"],
  ["neue eingabe", "section:neuer-eintrag"],
  ["naehrstoffe", "section:makro-naehrstoffe"],
  ["naehrstoff", "section:makro-naehrstoffe"],
  ["tagesuebersicht", "section:tagesuebersicht"],
  ["tagesprotokoll", "section:tagesuebersicht"],
  ["protokoll", "section:tagesuebersicht"],
  ["kalorienaufnahme", "section:kalorienaufnahme"],
  ["fastenanalyse", "section:fastenanalyse"],
  ["fasten", "section:fastenanalyse"],
  ["aktivitaet", "section:activity"],
  ["aktivitaeten", "section:activity"],
  ["workout", "section:activity"],
  ["kalorienbilanz", "section:kalorienbilanz"],
  ["bilanz", "section:kalorienbilanz"],
  ["fluessigkeit", "section:fluessigkeit"],
  ["kalorien pro tag", "section:kalorien-pro-tag"],
  ["defizit", "section:defizit-pro-tag"],
  ["makros pro tag", "section:makros-pro-tag"],
  ["makroverteilung", "section:makro-verteilung"],
  ["verteilung", "section:makro-verteilung"],
  ["vitamin a", "nutrient:vitA:vitamins"],
  ["vitamin d", "nutrient:vitD:vitamins"],
  ["vitamin e", "nutrient:vitE:vitamins"],
  ["vitamin k", "nutrient:vitK:vitamins"],
  ["vitamin c", "nutrient:vitC:vitamins"],
  ["eisen", "nutrient:eisen:minerals"],
  ["magnesium", "nutrient:magnesium:minerals"],
  ["calcium", "nutrient:calcium:minerals"],
  ["zink", "nutrient:zink:minerals"],
  ["vitamine", "section:vitamine-7-tage"],
  ["mineralstoffe", "section:mineralstoffe-7-tage"],
  ["spurenelemente", "section:mineralstoffe-7-tage"],
  ["wochenanalyse", "action:weekly-analysis"],
  ["ernaehrungsberater", "action:weekly-analysis"],
  ["ernaehrungscoach", "action:weekly-analysis"],
  ["coach", "action:weekly-analysis"],
  ["uebersicht", "section:uebersicht"],
  ["persoenliche daten", "section:persoenliche-daten"],
  ["ziele", "section:ziele"],
  ["rezeptgenerator", "section:rezeptgenerator"],
  ["generator", "section:rezeptgenerator"],
  ["gespeicherte rezepte", "section:gespeicherte-rezepte"],
  ["import", "section:import"],
  ["export", "section:export"],
  ["backup", "section:backup"],
  ["sicherung", "section:backup"],
  ["sichern", "backup-create"],
  ["upload", "backup-create"],
  ["laden", "backup-load"],
  ["download", "backup-load"],
  ["einstellungen", "settings:open"],
  ["settings", "settings:open"],
  ["statistik", "nav:weekly"],
  ["eingabe", "nav:log"],
  ["profil", "settings:profile"],
  ["lebensmittel", "settings:food"],
  ["rezepte", "settings:recipes"],
  ["daten", "settings:data"],
  ["design", "settings:design"],
  ["dark mode", "theme:dark"],
  ["dunkler modus", "theme:dark"],
  ["light mode", "theme:light"],
  ["heller modus", "theme:light"],
  ["kamera", "action:camera"],
  ["kamerafoto", "action:camera"],
  ["kamerabild", "action:camera"],
  ["foto", "action:camera"],
  ["photo", "action:camera"],
  ["bild", "action:camera"],
  ["fotokamera", "action:camera"],
  ["bild aufnehmen", "action:camera"],
  ["foto aufnehmen", "action:camera"],
  ["foto machen", "action:camera"],
  ["bild machen", "action:camera"],
  ["mikro aus", "action:mic-off"],
  ["mikrofon aus", "action:mic-off"],
  ["mikro an", "action:mic-on"],
  ["mikrofon an", "action:mic-on"],
  ["hilfe", "action:help"],
  ["help", "action:help"],
  ["home", "action:home"],
  ["start", "action:home"],
  ["startseite", "action:home"],
  ["anfang", "action:home"],
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

type VoiceCommandScope = "global" | "scoped-input";

const SCOPED_INPUT_ALLOWED_PREFIXES = ["field:", "nav:", "settings:", "section:", "scroll:", "action:", "theme:", "nutrient:"];
const SCOPED_INPUT_ALLOWED_ACTIONS = new Set(["action:mic-off", "action:home", "backup-create", "backup-load", "click:rezept-speichern"]);

function getVoiceCommandScope(): VoiceCommandScope {
  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) return "global";

  const isTextEntryElement =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement.isContentEditable;

  if (isTextEntryElement) return "scoped-input";

  const isScopedContainerActive =
    !!activeElement.closest('[data-voice-scope="manual-recipe"]') ||
    !!activeElement.closest('[data-voice-scope="profile"]') ||
    !!activeElement.closest("#section-neuer-eintrag") ||
    !!activeElement.closest("#section-activity");

  return isScopedContainerActive ? "scoped-input" : "global";
}

function isActionAllowedInScope(action: string, scope: VoiceCommandScope): boolean {
  if (scope === "global") return true;
  if (SCOPED_INPUT_ALLOWED_PREFIXES.some((prefix) => action.startsWith(prefix))) return true;
  return SCOPED_INPUT_ALLOWED_ACTIONS.has(action);
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

        // 0. If a food dropdown is open and the transcript looks like a number selection,
        //    skip global command matching and let the dropdown handler pick it up.
        const dropdownActive = !!document.querySelector("[data-voice-dropdown-active]");
        if (dropdownActive) {
          const selIdx = parseSpokenSelectionIndex(lower, { allowBareNumber: true, keywords: ["nummer", "position", "nimm", "nehme", "zeige", "eintrag", "liste", "dropdown"] });
          if (selIdx !== null) {
            onUnhandledRef.current(transcript, isInterim);
            return;
          }
        }

        const scope = getVoiceCommandScope();

        // 0b. If Tagesübersicht is active and transcript matches a table keyword,
        //     skip global commands and let onUnhandledSpeech handle table sorting/view changes.
        const activeElement = document.activeElement as HTMLElement | null;
        const tagesSection = document.getElementById("section-tagesuebersicht");
        const tagesRect = tagesSection?.getBoundingClientRect();
        const tagesVisible =
          !!tagesRect &&
          tagesRect.bottom > Math.min(window.innerHeight * 0.2, 120) &&
          tagesRect.top < window.innerHeight - Math.min(window.innerHeight * 0.2, 120);
        const normalizedTableTranscript = lower
          .replace(/[.,;:!?]/g, " ")
          .replace(/\beiweiß\b/g, "eiweiss")
          .replace(/\beiweis\b/g, "eiweiss")
          .replace(/\bt[\s.-]*i[\s.-]*m[\s.-]*e\b/g, "time")
          .replace(/\bp[\s.-]*r[\s.-]*o\b/g, "pro")
          .replace(/\bf[\s.-]*a[\s.-]*t\b/g, "fat")
          .replace(/\bk[\s.-]*h\b/g, "kh")
          .replace(/\bf[\s.-]*i[\s.-]*b\b/g, "fib")
          .replace(/\bpfeffer\b/g, "fiber")
          .replace(/\s+/g, " ")
          .trim();
        const tagesActive =
          !!tagesSection &&
          (tagesSection.getAttribute("data-voice-active-section") === "true" ||
            tagesSection.getAttribute("data-section-active") === "true" ||
            !!activeElement?.closest("#section-tagesuebersicht") ||
            tagesVisible);
        const TABLE_VOICE_RE =
          /\b(?:detail(?:ansicht)?|summen?(?:ansicht)?|kompakt|komprimiert|zeit|uhrzeit|time|tim|taim|lebensmittel|food|alphabetisch|anz(?:ahl)?|count|haeufigkeit|häufigkeit|gramm|g(?:\s*\/\s*|\s+pro\s+)ml|menge|kcal|kalorien|kilokalorien|calories|pro|protein(?:e|en)?|eiweiss|fat|fett(?:e)?|kh|kohlenhydrate?|carbs?|carbohydrates?|fib|fiber|fibre|pfeffer|ballaststoffe?|ballast|faser(?:n)?)\b/i;
        if (tagesActive && TABLE_VOICE_RE.test(normalizedTableTranscript)) {
          onUnhandledRef.current(transcript, isInterim);
          return;
        }

        // 1. Exact regex pattern matching (fast path)
        for (const cmd of COMMANDS) {
          for (const pattern of cmd.patterns) {
            if (pattern.test(lower)) {
              const action = typeof cmd.action === "function" ? cmd.action(lower) : cmd.action;
              if (action && isActionAllowedInScope(action, scope)) {
                onCommandRef.current(action);
                return;
              }
            }
          }
        }

        // 2. Fuzzy fallback – only in global scope to avoid accidental tab/section jumps while typing
        if (scope === "global") {
          const keywords = FUZZY_KEYWORD_MAP.map(([kw]) => kw);
          const { index, score } = bestFuzzyMatch(lower, keywords, 0.62);
          if (index >= 0 && score >= 0.62) {
            const action = FUZZY_KEYWORD_MAP[index][1];
            if (isActionAllowedInScope(action, scope)) {
              console.debug(`[Voice] fuzzy match: "${lower}" → "${keywords[index]}" (${(score * 100).toFixed(0)}%) → ${action}`);
              onCommandRef.current(action);
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
