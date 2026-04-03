import { useState, useCallback, useRef, useEffect } from "react";
import { UserProfile } from "@/types/profile";
import { synthesizeEdgeTTS, speakWithBrowserTTS } from "@/lib/edgeTts";

type SpeakingCallback = (speaking: boolean) => void;

const STORAGE_KEY = "mampflogger-audio-guide";
const CUSTOM_TEXTS_KEY = "mampflogger-audio-guide-texts";

/**
 * Section help texts – keyed by section id.
 * These are the defaults; custom overrides are stored in localStorage.
 */
const DEFAULT_HELP_TEXTS: Record<string, string> = {
  "section-neuer-eintrag": `Los geht's! In diesem Abschnitt kannst du ein Lebensmittel eingeben. Falls das Lebensmittel mehrere Varianten hat oder die Eingabe unklar ist, klappt ein Optionsmenü auf, aus dem du unter Angabe der Nummer – sag zum Beispiel „Nummer eins" – auswählen kannst, um welches Lebensmittel es sich handelt. Anschließend springt der Cursor weiter in die Mengenangabe. Sag einfach eine Zahl für Gramm oder Milliliter und bestätige deine Eingabe mit dem Wort „Okay", woraufhin der Cursor wieder ins Feld Lebensmittel springt und bereit ist für ein neues Lebensmittel. Mit „Weiter" oder „Zurück" kannst du zwischen den Eingabefeldern hin- und herspringen. Du kannst auch auf die Uhrzeit springen. Und mit „Storno" kannst du eventuelle Fehleingaben wieder löschen. Hast du ein Lebensmittel bereits gebucht und es erscheint im Tagesprotokoll, kannst du es dort anklicken und hier im Abschnitt „Neuer Eintrag" korrigieren – anschließend wieder mit „Okay" speichern.`,

  "section-tagesuebersicht": `Im Tagesprotokoll siehst du alle heute gebuchten Lebensmittel mit Uhrzeit, Menge und Nährwerten. Du kannst zwischen Detailansicht und Summenansicht wechseln, indem du „Detailansicht" oder „Summenansicht" sagst. In der Detailansicht wird jeder einzelne Eintrag angezeigt. In der Summenansicht werden gleiche Lebensmittel zusammengefasst. Du kannst die Liste sortieren, zum Beispiel nach Kalorien, Fett, Protein, Kohlenhydraten oder Menge – sag einfach den Namen der Spalte. Tippe auf einen Eintrag, um ihn oben im Bereich „Neuer Eintrag" zu bearbeiten.`,

  "section-kalorienaufnahme": `Dieser Kasten zeigt dir deine Kalorienaufnahme der letzten 24 Stunden als Balkendiagramm. Jeder Balken steht für eine Stunde. So erkennst du auf einen Blick, wann du wie viel gegessen hast und ob deine Mahlzeiten gleichmäßig über den Tag verteilt sind.`,

  "section-fastenanalyse": `Die Fastenanalyse zeigt dir, wie lange deine letzte Fastenperiode war und wann du zuletzt gegessen hast. Du siehst außerdem deinen aktuellen Fastenstatus – ob du gerade fastest oder nicht. Das hilft dir, Intervallfasten besser zu verfolgen.`,

  "section-activity": `Im Activity-Kasten kannst du sportliche Aktivitäten und Bewegung eintragen. Gib die Art der Aktivität und die Dauer ein, um den Kalorienverbrauch zu berechnen. Die verbrannten Kalorien fließen in deine Kalorienbilanz ein.`,

  "section-kalorienbilanz": `Die Kalorienbilanz zeigt dir, wie viele Kalorien du heute noch essen kannst oder ob du dein Tagesziel bereits überschritten hast. Sie berechnet sich aus deinem Grundumsatz plus Aktivitätsverbrauch minus aufgenommene Kalorien. Grün bedeutet, du bist im Defizit. Rot bedeutet, du hast dein Ziel überschritten.`,

  "section-makro-naehrstoffe": `Hier siehst du die Verteilung deiner Makronährstoffe für den heutigen Tag. Die Balken zeigen dir, wie viel Protein, Kohlenhydrate, Fett und Ballaststoffe du aufgenommen hast – sowohl in Gramm als auch prozentual. So erkennst du, ob deine Ernährung ausgewogen ist.`,

  "section-fluessigkeit": `Der Flüssigkeitskasten zeigt dir, wie viel du heute getrunken hast im Verhältnis zu deinem Tagesziel. Getränke und wasserhaltige Lebensmittel werden automatisch erfasst. Der Fortschrittsbalken zeigt dir, wie nah du an deinem Flüssigkeitsziel bist.`,

  "section-supplements": `Im Supplement-Kasten verwaltest du deine Nahrungsergänzungsmittel. Du kannst Vitamine und Mineralstoffe als Kapseln eintragen, inklusive der Menge pro Einheit und der Stückzahl. Aktiviere die Checkbox „Täglich", damit die Dosen automatisch jeden Tag in deine Vitamin- und Mineralstoffbilanz eingerechnet werden. So musst du nicht jeden Tag einzeln dokumentieren. Du kannst auch Kombipräparate anlegen, die mehrere Nährstoffe gleichzeitig enthalten.`,

  "section-uebersicht": `Die Übersicht zeigt dir die wichtigsten Kennzahlen der letzten sieben Tage auf einen Blick. Du siehst den Durchschnitt deiner täglichen Kalorienaufnahme, dein durchschnittliches Defizit und – falls ein Zielgewicht hinterlegt ist – die geschätzte Anzahl der Tage bis zum Ziel.`,

  "section-kalorien-pro-tag": `Dieses Diagramm zeigt dir die Kalorienaufnahme der letzten sieben Tage als Balkendiagramm. Jeder Balken steht für einen Tag. Dein Tagesziel wird als gestrichelte Linie angezeigt, sodass du sofort erkennst, an welchen Tagen du über oder unter dem Ziel lagst.`,

  "section-defizit-pro-tag": `Hier siehst du dein tägliches Kaloriendefizit oder deinen Überschuss der letzten sieben Tage als Balkendiagramm. Balken nach oben bedeuten ein Defizit – du hast weniger gegessen als verbraucht. Balken nach unten zeigen einen Überschuss an. Alle Balken sind in der Hauptfarbe der App dargestellt.`,

  "section-makro-verteilung": `Die Makro-Verteilung zeigt dir den Durchschnitt deiner Makronährstoffe über die letzten sieben Tage. Du siehst Protein, Kohlenhydrate, Fett und Ballaststoffe als Kreisdiagramm und in Prozent. So erkennst du langfristige Trends in deiner Ernährung.`,

  "section-makros-pro-tag": `Diese Tabelle zeigt dir die tägliche Aufschlüsselung deiner Makronährstoffe für jeden der letzten sieben Tage. Du siehst Protein, Kohlenhydrate, Fett und Ballaststoffe in Gramm pro Tag.`,

  "section-wochenansicht": `Das Wochenprotokoll zeigt dir alle Lebensmittel der letzten sieben Tage – wie das Tagesprotokoll, nur über eine ganze Woche. Du kannst zwischen Detailansicht und Summenansicht wechseln. In der Summenansicht werden gleiche Lebensmittel zusammengefasst. Die Sortierung funktioniert genauso wie im Tagesprotokoll – sag einfach den Namen der Spalte.`,

  "section-vitamine-7-tage": `Hier siehst du deine Vitaminversorgung der letzten sieben Tage. Jede Kachel steht für ein Vitamin und zeigt dir in Prozent, wie gut du versorgt bist. Der Fortschrittsbalken füllt sich je nach Deckungsgrad. Tippe auf eine Kachel für mehr Details. Du kannst auch per Sprachbefehl ein einzelnes Vitamin aufrufen, zum Beispiel „Vitamin C".`,

  "section-mineralstoffe-7-tage": `Dieser Kasten zeigt dir deine Mineralstoffversorgung der letzten sieben Tage. Wie bei den Vitaminen zeigt jede Kachel den Deckungsgrad in Prozent an. Der Fortschrittsbalken füllt sich entsprechend. Achte besonders auf Eisen, Calcium und Magnesium – diese Mineralstoffe sind häufig unterversorgt. Du kannst auch per Sprachbefehl einen einzelnen Mineralstoff aufrufen, zum Beispiel „Eisen" oder „Magnesium".`,

  "section-ki-coach": `Der KI-Ernährungscoach analysiert deine Ernährungsdaten und gibt dir personalisierte Empfehlungen. Er berücksichtigt dein Profil, deine Ziele und deine tatsächliche Nahrungsaufnahme. Tippe auf „Analysieren", um eine neue Analyse zu starten.`,

  "section-lebensmittelliste": `In der Lebensmittelliste findest du alle verfügbaren Lebensmittel mit ihren Nährwerten. Du kannst Lebensmittel suchen, neue hinzufügen, bestehende bearbeiten oder löschen. Die Liste dient als Grundlage für die Eingabe im Tagesprotokoll.`,

  "section-gespeicherte-rezepte": `Hier verwaltest du deine gespeicherten Rezepte. Du kannst Rezepte manuell erstellen, aus einem Foto generieren oder von der KI vorschlagen lassen. Jedes Rezept enthält die Zutaten mit Mengenangaben und berechneten Nährwerten. Tippe auf ein Rezept, um es aufzuklappen und die Details zu sehen.`,

  "section-persoenliche-daten": `In den persönlichen Daten gibst du deinen Namen, dein Geschlecht, Geburtsjahr, Größe und Gewicht ein. Diese Angaben werden für die Berechnung deines Grundumsatzes und BMI verwendet. Vergiss nicht, auf „Profil speichern" zu drücken, damit deine Daten erhalten bleiben.`,

  "section-ziele": `Hier legst du deine persönlichen Ziele fest. Du kannst ein Zielgewicht, ein tägliches Kaloriendefizit, einen Aktivitätsbonus und ein Flüssigkeitsziel definieren. Außerdem kannst du Zielwerte für Protein, Fett, Kohlenhydrate und Ballaststoffe in Gramm angeben. Diese Ziele werden in der Statistik als Markierungen angezeigt.`,

  "section-import": `Im Import-Bereich kannst du Daten aus CSV-Dateien laden. Du kannst Ernährungseinträge, Kalorienbilanz-Daten oder Lebensmitteldatenbanken importieren. Wähle den passenden Import-Typ und lade die Datei hoch oder füge den Text direkt ein.`,

  "section-export": `Hier kannst du deine Daten als CSV-Dateien exportieren. Du hast die Wahl zwischen verschiedenen Export-Formaten: Ernährungseinträge, Lebensmitteldatenbank, Kalorienbilanz oder Aktivitäten. Die exportierten Dateien kannst du in anderen Programmen wie Excel öffnen.`,

  "section-backup": `Im Backup-Bereich kannst du eine lokale Sicherungsdatei deiner gesamten App-Daten erstellen. Das Backup enthält alle Einträge, Einstellungen und Lebensmitteldaten als JSON-Datei. Du kannst ein Backup auch wiederherstellen, um deine Daten auf einem anderen Gerät zu laden.`,

  "section-cloud-backup": `Das Cloud-Backup synchronisiert deine Daten automatisch in die Cloud. Du erhältst einen sechsstelligen Sync-Code, mit dem du deine Daten auf anderen Geräten wiederherstellen kannst. Aktiviere die Echtzeit-Synchronisation, damit Änderungen sofort gesichert werden.`,

  "section-loeschen": `Im Lösch-Bereich kannst du gezielt Daten entfernen. Du kannst einen Zeitraum angeben, um nur bestimmte Einträge zu löschen, oder alle Daten auf einmal zurücksetzen. Jede Löschaktion erfordert eine Bestätigung, damit nichts versehentlich verloren geht.`,
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
  // Multilingual Neural voices sound significantly more natural than standard Neural
  return wantFemale ? "de-DE-SeraphinaMultilingualNeural" : "de-DE-FlorianMultilingualNeural";
}



export function useAudioGuide(profile: UserProfile | null) {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const [helpTexts, setHelpTexts] = useState<Record<string, string>>(loadHelpTexts);
  const [editorOpenSection, setEditorOpenSection] = useState<string | null>(null);
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
      if (!sectionId) return;
      currentSectionRef.current = sectionId;

      const text = helpTexts[sectionId];
      if (!text) return;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        notifySpeaking(true);

        const wantFemale = !profile || profile.gender === "male";
        const result = await synthesizeEdgeTTS(
          text,
          pickVoiceName(profile),
          controller.signal,
        );
        if (controller.signal.aborted) return;

        if (result === "USE_SPEECH_SYNTHESIS") {
          // Fallback to browser built-in speech
          await speakWithBrowserTTS(text, wantFemale, 0.5, controller.signal);
          notifySpeaking(false);
          return;
        }

        const url = URL.createObjectURL(result);
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

  const openEditor = useCallback((sectionId?: string) => {
    if (sectionId) setEditorOpenSection(sectionId);
  }, []);
  const closeEditor = useCallback(() => setEditorOpenSection(null), []);
  const isEditorOpenFor = useCallback((sectionId: string) => editorOpenSection === sectionId, [editorOpenSection]);

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
    editorOpenSection,
    openEditor,
    closeEditor,
    isEditorOpenFor,
    onSpeakingChange,
  };
}
