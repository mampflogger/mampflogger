import { SECTION_PAGE_MAP, SECTION_SETTINGS_TAB } from "@/hooks/useVoiceCommands";

/**
 * Voice Control debug overlay – secret mode for desktop only.
 * Shows local (section-specific) commands on the left and global commands on the right.
 */

const GLOBAL_COMMANDS: [string, string][] = [
  ["Mikro an / Mic on", "Mikrofon aktivieren"],
  ["Mikro aus / Standby", "Mikrofon in Standby"],
  ["Hilfe / Help", "Hilfetext abspielen"],
  ["Editor öffnen / Text öffnen", "Hilfetext-Editor öffnen"],
  ["Editor schließen / Text schließen", "Hilfetext-Editor schließen"],
  ["Fokus aus", "Kasten-Fokus entfernen"],
  ["Home / Start / Anfang", "Zurück zum Start"],
  ["Heute", "Zum heutigen Datum"],
  ["Datum", "Datumsfeld fokussieren"],
  ["Eingabe / Log", "Tab: Eingabe"],
  ["Statistik / Woche", "Tab: Statistik"],
  ["Einstellungen / Settings", "Einstellungen öffnen"],
  ["Profil", "Profil-Tab"],
  ["Lebensmittel", "Lebensmittel-Tab"],
  ["Rezepte", "Rezepte-Tab"],
  ["Daten", "Daten-Tab"],
  ["Design", "Design-Tab"],
  ["Dark Mode / Light Mode", "Modus wechseln"],
  ["Design + Farbe", "z.B. 'Design blau'"],
  ["Nach oben / Nach unten", "Eine Sektion scrollen"],
  ["Ganz oben / Ganz unten", "Zum Anfang/Ende"],
  ["Voice Control", "Overlay ein/aus"],
];

const SECTION_LOCAL_COMMANDS: Record<string, [string, string][]> = {
  "section-neuer-eintrag": [
    ["Lebensmittelname", "Eingabe ins Suchfeld"],
    ["Nummer 1-9", "Option aus Dropdown wählen"],
    ["Menge (Zahl)", "Grammzahl eingeben"],
    ["Okay / OK", "Eintrag speichern"],
    ["Weiter / Next", "Nächstes Feld"],
    ["Zurück / Back", "Vorheriges Feld"],
    ["Storno", "Letzten Eintrag löschen"],
    ["Löschen", "Feld leeren"],
    ["Kamera / Foto", "Foto-Erfassung"],
  ],
  "section-tagesuebersicht": [
    ["Detailansicht", "Einzelne Einträge zeigen"],
    ["Summenansicht", "Gleiche zusammenfassen"],
    ["Lebensmittel", "Nach Name sortieren"],
    ["Kcal / Kalorien", "Nach Kalorien sortieren"],
    ["Pro / Protein / Eiweiß", "Nach Protein sortieren"],
    ["Fat / Fett", "Nach Fett sortieren"],
    ["KH / Kohlenhydrate / Zucker", "Nach KH sortieren"],
    ["Fib / Fiber / Ballaststoffe", "Nach Ballaststoffen"],
    ["Gramm / Milliliter / Menge", "Nach Menge sortieren"],
    ["Zeit / Uhrzeit", "Nach Zeit sortieren"],
  ],
  "section-kalorienaufnahme": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-fastenanalyse": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-activity": [
    ["Aktivitätsname", "Eingabe ins Suchfeld"],
    ["Dauer (Zahl)", "Minuten eingeben"],
    ["Okay / OK", "Aktivität speichern"],
    ["Storno", "Letzte löschen"],
  ],
  "section-kalorienbilanz": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-makro-naehrstoffe": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-fluessigkeit": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-gewicht": [
    ["Zahl (kg)", "Gewicht eingeben"],
    ["Okay / OK", "Gewicht speichern"],
  ],
  "section-bmi": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-gewichts-verlauf": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-supplements": [
    ["Neu", "Neues Supplement anlegen"],
    ["Neues Supplement / Supplement hinzufügen", "Formular öffnen"],
    ["Okay / Speichern", "Supplement speichern"],
    ["Löschen / Entfernen", "Letztes Supplement löschen"],
    ["Storno / Abbrechen", "Eingabe abbrechen"],
  ],
  "section-uebersicht": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-kalorien-pro-tag": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-defizit-pro-tag": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-gewichtsverlust-pro-tag": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-makros-pro-tag": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-makro-verteilung": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-wochenansicht": [
    ["Detailansicht", "Einzelne Einträge zeigen"],
    ["Summenansicht", "Gleiche zusammenfassen"],
    ["Datum", "Nach Datum sortieren"],
    ["Lebensmittel", "Nach Name sortieren"],
    ["Kcal / Kalorien", "Nach Kalorien sortieren"],
    ["Pro / Protein / Eiweiß", "Nach Protein sortieren"],
    ["Fat / Fett", "Nach Fett sortieren"],
    ["KH / Kohlenhydrate / Zucker", "Nach KH sortieren"],
    ["Fib / Fiber / Ballaststoffe", "Nach Ballaststoffen"],
    ["Gramm / Milliliter / Menge", "Nach Menge sortieren"],
  ],
  "section-vitamine-7-tage": [
    ["Vitamin A-K", "Vitamin-Detail öffnen"],
    ["z.B. 'Vitamin C'", "Kachel aufklappen"],
  ],
  "section-mineralstoffe-7-tage": [
    ["Calcium / Eisen / etc.", "Mineralstoff-Detail öffnen"],
    ["z.B. 'Magnesium'", "Kachel aufklappen"],
  ],
  "section-ki-coach": [
    ["Analyse / Coach", "Analyse starten"],
  ],
  "section-persoenliche-daten": [
    ["Name / Geburtsjahr / Größe / Gewicht", "Werte eingeben"],
    ["Profil speichern", "Eingaben speichern"],
    ["Weiter / Next", "Nächstes Feld"],
  ],
  "section-ziele": [
    ["Kalorienziel / Proteinziel", "Werte eingeben"],
    ["Profil speichern", "Eingaben speichern"],
  ],
  "section-lebensmittelliste": [
    ["Lebensmittelname", "Suche in der Liste"],
    ["Neues Lebensmittel", "Neuen Eintrag erstellen"],
    ["Okay / OK", "Eintrag speichern"],
    ["Zurück / Back", "Editor schließen"],
  ],
  "section-gespeicherte-rezepte": [
    ["Neues Rezept", "Rezept erstellen"],
    ["Rezept Foto", "Foto-Import"],
    ["Rezeptname", "Rezeptsuche"],
  ],
  "section-design": [
    ["Dark Mode / Light Mode", "Modus wechseln"],
    ["Design + Farbe", "z.B. 'Design blau'"],
  ],
  "section-export": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-backup": [
    ["Backup erstellen", "Lokales Backup"],
    ["Backup laden", "Backup wiederherstellen"],
  ],
  "section-cloud-backup": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
  "section-loeschen": [
    ["(keine lokalen Befehle)", "Nur Anzeige"],
  ],
};

const SECTION_LABELS: Record<string, string> = {
  "section-neuer-eintrag": "Neuer Eintrag",
  "section-tagesuebersicht": "Tagesprotokoll",
  "section-kalorienaufnahme": "Kalorienaufnahme",
  "section-fastenanalyse": "Fastenanalyse",
  "section-activity": "Activity",
  "section-kalorienbilanz": "Kalorienbilanz",
  "section-makro-naehrstoffe": "Makro Nährstoffe",
  "section-fluessigkeit": "Flüssigkeit",
  "section-gewicht": "Gewicht",
  "section-bmi": "BMI",
  "section-gewichts-verlauf": "Gewichtsverlauf",
  "section-uebersicht": "Übersicht",
  "section-kalorien-pro-tag": "Kalorien pro Tag",
  "section-defizit-pro-tag": "Defizit pro Tag",
  "section-gewichtsverlust-pro-tag": "Gewichtsverlust pro Tag",
  "section-makros-pro-tag": "Makros pro Tag",
  "section-makro-verteilung": "Makroverteilung",
  "section-wochenansicht": "Wochenprotokoll",
  "section-vitamine-7-tage": "Vitamine",
  "section-mineralstoffe-7-tage": "Mineralstoffe",
  "section-ki-coach": "KI Coach",
  "section-persoenliche-daten": "Persönliche Daten",
  "section-ziele": "Ziele",
  "section-lebensmittelliste": "Lebensmittelliste",
  "section-gespeicherte-rezepte": "Rezepte",
  "section-design": "Design",
  "section-export": "Export",
  "section-backup": "Backup (Lokal)",
  "section-cloud-backup": "Cloud-Backup",
  "section-loeschen": "Daten löschen",
};

interface VoiceControlOverlayProps {
  activeSection: string | null;
}

const VoiceControlOverlay = ({ activeSection }: VoiceControlOverlayProps) => {
  const localCommands = activeSection
    ? SECTION_LOCAL_COMMANDS[activeSection] ?? [["(keine lokalen Befehle)", "Nur Anzeige"]]
    : [["Kein Kasten aktiv", "Navigiere zu einem Kasten"]];

  const sectionLabel = activeSection ? SECTION_LABELS[activeSection] ?? activeSection : "—";

  return (
    <>
      {/* Left panel – local commands */}
      <div className="fixed left-0 top-[120px] bottom-0 w-[220px] z-40 overflow-y-auto pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm border-r border-border p-3 min-h-full pointer-events-auto">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Lokal</h3>
          <p className="text-[10px] text-muted-foreground mb-3 truncate" title={sectionLabel}>
            📍 {sectionLabel}
          </p>
          <div className="space-y-1.5">
            {localCommands.map(([cmd, desc], i) => (
              <div key={i} className="text-[11px]">
                <span className="font-semibold text-foreground">{cmd}</span>
                <span className="text-muted-foreground ml-1">– {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – global commands */}
      <div className="fixed right-0 top-[120px] bottom-0 w-[220px] z-40 overflow-y-auto pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm border-l border-border p-3 min-h-full pointer-events-auto">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Global</h3>
          <div className="space-y-1.5">
            {GLOBAL_COMMANDS.map(([cmd, desc], i) => (
              <div key={i} className="text-[11px]">
                <span className="font-semibold text-foreground">{cmd}</span>
                <span className="text-muted-foreground ml-1">– {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default VoiceControlOverlay;
