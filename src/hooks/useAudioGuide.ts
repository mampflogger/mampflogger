import { useState, useCallback, useRef, useEffect } from "react";
import { UserProfile } from "@/types/profile";
import { synthesizeEdgeTTS } from "@/lib/edgeTts";

type SpeakingCallback = (speaking: boolean) => void;

const STORAGE_KEY = "mampflogger-audio-guide";
const CUSTOM_TEXTS_KEY = "mampflogger-audio-guide-texts";

/**
 * Section help texts – keyed by section id.
 * These are the defaults; custom overrides are stored in localStorage.
 */
const DEFAULT_HELP_TEXTS: Record<string, string> = {
  "section-neuer-eintrag": `Los geht's! In diesem Abschnitt kannst du ein Lebensmittel eingeben. Falls das Lebensmittel mehrere Varianten hat oder die Eingabe unklar ist, klappt ein Optionsmenü auf, aus dem du unter Angabe der Nummer – sag zum Beispiel „Nummer eins" – auswählen kannst, um welches Lebensmittel es sich handelt. Anschließend springt der Cursor weiter in die Mengenangabe. Sag einfach eine Zahl für Gramm oder Milliliter und bestätige deine Eingabe mit dem Wort „Okay", woraufhin der Cursor wieder ins Feld Lebensmittel springt und bereit ist für ein neues Lebensmittel. Mit „Weiter" oder „Zurück" kannst du zwischen den Eingabefeldern hin- und herspringen. Du kannst auch auf die Uhrzeit springen. Und mit „Storno" kannst du eventuelle Fehleingaben wieder löschen. Hast du ein Lebensmittel bereits gebucht und es erscheint im Tagesprotokoll, kannst du es dort anklicken und hier im Abschnitt „Neuer Eintrag" korrigieren – anschließend wieder mit „Okay" speichern.`,
};

function loadHelpTexts(): Record<string, string> {
  try {
    const stored = localStorage.getItem(CUSTOM_TEXTS_KEY);
    if (stored) {
      return { ...DEFAULT_HELP_TEXTS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_HELP_TEXTS };
}

function saveCustomTexts(texts: Record<string, string>) {
  const custom: Record<string, string> = {};
  for (const [key, value] of Object.entries(texts)) {
    if (value !== DEFAULT_HELP_TEXTS[key]) {
      custom[key] = value;
    }
  }
  localStorage.setItem(CUSTOM_TEXTS_KEY, JSON.stringify(custom));
}

/**
 * Pick Edge TTS voice name based on cross-gender logic.
 * Male profile → female voice, female profile → male voice.
 */
function pickVoiceName(profile: UserProfile | null): string {
  const wantFemale = !profile || profile.gender === "male";
  return wantFemale ? "de-DE-KatjaNeural" : "de-DE-ConradNeural";
}

const EDGE_TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edge-tts`;

export function useAudioGuide(profile: UserProfile | null) {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const [helpTexts, setHelpTexts] = useState<Record<string, string>>(loadHelpTexts);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSectionRef = useRef<string | null>(null);
  const onSpeakingChangeRef = useRef<SpeakingCallback | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const onSpeakingChange = useCallback((cb: SpeakingCallback | null) => {
    onSpeakingChangeRef.current = cb;
  }, []);

  const notifySpeaking = useCallback((val: boolean) => {
    setIsSpeaking(val);
    onSpeakingChangeRef.current?.(val);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const stopAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    currentSectionRef.current = null;
    notifySpeaking(false);
  }, [notifySpeaking]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) stopAudio();
      return !prev;
    });
  }, [stopAudio]);

  const speak = useCallback(
    async (sectionId: string | null) => {
      stopAudio();
      if (!enabled || !sectionId) return;
      if (sectionId === currentSectionRef.current) return;
      currentSectionRef.current = sectionId;

      const text = helpTexts[sectionId];
      if (!text) return;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        notifySpeaking(true);

        const response = await fetch(EDGE_TTS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text,
            voice: pickVoiceName(profile),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error("Edge TTS error:", response.status);
          notifySpeaking(false);
          return;
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = 0.5;
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          notifySpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          notifySpeaking(false);
        };

        await audio.play();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("TTS playback error:", err);
        }
        notifySpeaking(false);
      }
    },
    [enabled, profile, helpTexts, notifySpeaking, stopAudio],
  );

  const updateHelpText = useCallback((sectionId: string, text: string) => {
    setHelpTexts((prev) => {
      const next = { ...prev, [sectionId]: text };
      saveCustomTexts(next);
      return next;
    });
  }, []);

  const getHelpText = useCallback(
    (sectionId: string) => helpTexts[sectionId] ?? "",
    [helpTexts],
  );

  const openEditor = useCallback(() => setEditorOpen(true), []);
  const closeEditor = useCallback(() => setEditorOpen(false), []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return {
    enabled,
    isSpeaking,
    toggle,
    speak,
    stop: stopAudio,
    helpTexts,
    updateHelpText,
    getHelpText,
    editorOpen,
    openEditor,
    closeEditor,
    onSpeakingChange,
  };
}
