import { useState, useCallback, useRef, useEffect } from "react";
import { UserProfile } from "@/types/profile";

const STORAGE_KEY = "mampflogger-audio-guide";

/**
 * Section help texts – keyed by section id (without "section-" prefix for readability).
 * Add more sections here as needed.
 */
const SECTION_HELP_TEXTS: Record<string, string> = {
  "section-neuer-eintrag": `Los geht's! In diesem Abschnitt kannst du ein Lebensmittel eingeben. Falls das Lebensmittel mehrere Varianten hat oder die Eingabe unklar ist, klappt ein Optionsmenü auf, aus dem du unter Angabe der Nummer – sag zum Beispiel „Nummer eins" – auswählen kannst, um welches Lebensmittel es sich handelt. Anschließend springt der Cursor weiter in die Mengenangabe. Sag einfach eine Zahl für Gramm oder Milliliter und bestätige deine Eingabe mit dem Wort „Okay", woraufhin der Cursor wieder ins Feld Lebensmittel springt und bereit ist für ein neues Lebensmittel. Mit „Weiter" oder „Zurück" kannst du zwischen den Eingabefeldern hin- und herspringen. Du kannst auch auf die Uhrzeit springen. Und mit „Storno" kannst du eventuelle Fehleingaben wieder löschen. Hast du ein Lebensmittel bereits gebucht und es erscheint im Tagesprotokoll, kannst du es dort anklicken und hier im Abschnitt „Neuer Eintrag" korrigieren – anschließend wieder mit „Okay" speichern.`,
};

/**
 * Picks a German voice from available SpeechSynthesis voices.
 * Cross-gender logic: male profile → female voice, female profile → male voice.
 */
function pickVoice(profile: UserProfile | null): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const deVoices = voices.filter((v) => v.lang.startsWith("de"));
  if (deVoices.length === 0) return voices[0] ?? null;

  // Desired gender is opposite of profile gender
  const wantFemale = !profile || profile.gender === "male";

  // Heuristic: voice names often contain gendered hints
  const femaleHints = /\b(female|frau|woman|anna|petra|marlene|vicki|hedda)\b/i;
  const maleHints = /\b(male|mann|man|hans|stefan|markus|conrad|florian)\b/i;

  const preferred = deVoices.filter((v) =>
    wantFemale ? femaleHints.test(v.name) : maleHints.test(v.name),
  );

  if (preferred.length > 0) return preferred[0];

  // Fallback: just pick a German voice
  return deVoices[0];
}

export function useAudioGuide(profile: UserProfile | null) {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentSectionRef = useRef<string | null>(null);

  // Persist toggle
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) {
        // Turning off — stop any active speech
        speechSynthesis.cancel();
      }
      return !prev;
    });
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    currentSectionRef.current = null;
  }, []);

  const speak = useCallback(
    (sectionId: string | null) => {
      // Always cancel previous speech
      speechSynthesis.cancel();

      if (!enabled || !sectionId) {
        currentSectionRef.current = null;
        return;
      }

      // Don't repeat for the same section
      if (sectionId === currentSectionRef.current) return;
      currentSectionRef.current = sectionId;

      const text = SECTION_HELP_TEXTS[sectionId];
      if (!text) return;

      // Small delay so voices are loaded
      const doSpeak = () => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "de-DE";
        utter.rate = 1.0;
        utter.pitch = 1.0;

        const voice = pickVoice(profile);
        if (voice) utter.voice = voice;

        utteranceRef.current = utter;
        speechSynthesis.speak(utter);
      };

      if (speechSynthesis.getVoices().length > 0) {
        doSpeak();
      } else {
        speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
      }
    },
    [enabled, profile],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  return { enabled, toggle, speak, stop };
}
