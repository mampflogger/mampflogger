import { useCallback, useRef, useEffect } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { toast } from "sonner";

interface VoiceCommand {
  patterns: RegExp[];
  action: string;
}

const COMMANDS: VoiceCommand[] = [
  // Navigation
  { patterns: [/\beingabe\b/i, /\blog\b/i], action: "nav:log" },
  { patterns: [/\bstatistik\b/i, /\bübersicht\b/i, /\bwoche\b/i], action: "nav:weekly" },

  // Settings tabs
  { patterns: [/\beinstellung/i, /\bsettings?\b/i], action: "settings:open" },
  { patterns: [/\bprofil\b/i], action: "settings:profile" },
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

  // Deep-link focus
  { patterns: [/\bneue[rn]?\s+eintrag\b/i, /\bneue\s+eingabe\b/i], action: "focus:food" },
  { patterns: [/\baktivität/i, /\bactivity\b/i], action: "focus:activity" },

  // Actions
  { patterns: [/\bbackup\b/i, /\bsicherung\b/i], action: "action:backup" },
  { patterns: [/\bkamera\b/i, /\bfoto\b/i, /\bphoto\b/i], action: "action:camera" },
];

const INACTIVITY_TIMEOUT_MS = 60_000;

interface UseVoiceCommandsOptions {
  onCommand: (action: string) => void;
  onUnhandledSpeech: (transcript: string, isInterim: boolean) => void;
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

  const start = useCallback(() => {
    voice.start();
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
