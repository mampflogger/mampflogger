import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

interface HelpTopic {
  label: string;
  description: string;
}

type HelpTab = "eingabe" | "statistik" | "sprache" | "einstellungen";

const HELP_TABS: { id: HelpTab; label: string }[] = [
  { id: "eingabe", label: "Eingabemaske" },
  { id: "statistik", label: "Statistik" },
  { id: "sprache", label: "Sprachsteuerung" },
  { id: "einstellungen", label: "Einstellungen" },
];

const HELP_TOPICS: Record<HelpTab, HelpTopic[]> = {
  eingabe: [
    { label: "Neuer Eintrag", description: "Hier gibst du ein neues Lebensmittel ein. Wähle die Uhrzeit, tippe den Namen des Lebensmittels und gib die Menge in Gramm oder Milliliter an. Du kannst auch das Kamera-Symbol nutzen, um ein Foto deiner Mahlzeit zu machen – die App erkennt automatisch, was auf dem Teller liegt." },
    { label: "Makro Nährstoffverteilung", description: "Zeigt dir die prozentuale Verteilung von Eiweiß, Fett, Kohlenhydraten und Ballaststoffen für den aktuellen Tag als Balkendiagramm an. So siehst du auf einen Blick, ob deine Makros im gewünschten Verhältnis liegen." },
    { label: "Tagesübersicht", description: "Listet alle Lebensmittel auf, die du heute eingetragen hast – inklusive Kalorien und Makronährstoffe. Du kannst Einträge bearbeiten oder löschen und siehst die Gesamtsumme unten." },
    { label: "Kalorienaufnahme 24 Stunden", description: "Ein Diagramm, das deine Kalorienaufnahme über die letzten 24 Stunden als Zeitverlauf darstellt. Hilft dir zu erkennen, wann du gegessen hast und wie sich die Kalorien über den Tag verteilen." },
    { label: "Fastenanalyse", description: "Analysiert deine Essenszeiten und zeigt dir, wie lange deine Fastenperioden sind. Besonders nützlich, wenn du Intervallfasten (z. B. 16:8) praktizierst." },
    { label: "Activity", description: "Trage hier deine sportlichen Aktivitäten ein, um deinen Kalorienverbrauch zu erfassen. Der Activity-Bonus wird in deiner Kalorienbilanz berücksichtigt." },
    { label: "Kalorienbilanz", description: "Zeigt die Differenz zwischen deinem Kalorienbedarf (Grundumsatz + Activity) und deiner Kalorienaufnahme. Ein Defizit bedeutet, dass du weniger Kalorien aufgenommen hast als verbraucht – ideal zum Abnehmen." },
    { label: "Flüssigkeit", description: "Trackt deine Flüssigkeitsaufnahme. Getränke werden automatisch aus deinen Einträgen erkannt. Du siehst, wie viel du bereits getrunken hast und wie viel noch fehlt bis zu deinem Tagesziel." },
  ],
  statistik: [
    { label: "Übersicht", description: "Zeigt dir die wichtigsten Kennzahlen der letzten 7 Tage auf einen Blick: Durchschnittsdefizit, durchschnittliche Kalorienaufnahme und wie viele Tage du noch bis zu deinem Zielgewicht brauchst." },
    { label: "Kalorien pro Tag", description: "Ein Balkendiagramm mit deiner täglichen Kalorienaufnahme der letzten 7 Tage. So erkennst du Trends und kannst Tage mit besonders hoher oder niedriger Aufnahme identifizieren." },
    { label: "Defizit pro Tag", description: "Zeigt dein tägliches Kaloriendefizit (oder -überschuss) als Balkendiagramm. Grüne Balken = Defizit (gut zum Abnehmen), rote Balken = Überschuss." },
    { label: "Makros pro Tag", description: "Gestapeltes Balkendiagramm, das dir für jeden der letzten 7 Tage die Verteilung von Eiweiß, Fett, Kohlenhydraten und Ballaststoffen in Gramm zeigt." },
    { label: "Makro-Verteilung (7 Tage)", description: "Zeigt die durchschnittliche prozentuale Makronährstoffverteilung der letzten 7 Tage. Hilfreich, um zu prüfen, ob du langfristig im gewünschten Verhältnis isst." },
    { label: "KI-Coach", description: "Der KI-Ernährungscoach analysiert dein Essverhalten der letzten 7 Tage und gibt dir personalisierte Tipps und Empfehlungen. Drücke auf 'Analysieren', um eine neue Auswertung zu starten." },
  ],
  sprache: [
    { label: "Mikrofon aktivieren", description: "Tippe auf das Mikrofon-Symbol im Header, um die Sprachsteuerung zu starten. Wenn das Mikrofon rot pulsiert, hört die App zu. Nochmal tippen schaltet es wieder aus." },
    { label: "Lebensmittel diktieren", description: "Sage z. B. '200 Gramm Hähnchenbrust' oder 'ein Apfel'. Die App erkennt das Lebensmittel und die Menge und trägt es automatisch ein." },
    { label: "Navigation per Sprache", description: "Du kannst per Sprache zwischen den Bereichen wechseln. Sage z. B. 'zeig mir die Statistik', 'öffne Einstellungen' oder 'gehe zur Eingabe'." },
    { label: "Weitere Sprachbefehle", description: "Du kannst auch Aktivitäten diktieren ('30 Minuten Joggen'), Einträge löschen ('lösche den letzten Eintrag') oder nach Informationen fragen ('wie viel Kalorien habe ich heute?')." },
  ],
  einstellungen: [
    { label: "Profil", description: "Hier gibst du deine persönlichen Daten ein: Name, Geschlecht, Alter, Größe, Gewicht und Zielgewicht. Diese Daten werden für die Berechnung deines Grundumsatzes und Kalorienbedarfs verwendet." },
    { label: "Design", description: "Passe das Erscheinungsbild der App an. Wähle zwischen verschiedenen Farbthemen und aktiviere oder deaktiviere den Dark Mode nach deinem Geschmack." },
    { label: "Lebensmittel", description: "Verwalte deine persönliche Lebensmitteldatenbank. Du kannst eigene Lebensmittel hinzufügen, bestehende bearbeiten oder löschen. Die Datenbank wird für die Autovervollständigung bei der Eingabe verwendet." },
    { label: "Rezepte", description: "Erstelle und verwalte eigene Rezepte mit mehreren Zutaten. Du kannst Rezepte manuell anlegen, per KI generieren lassen oder ein Foto eines Rezepts hochladen. Gespeicherte Rezepte erscheinen als Vorschlag bei der Eingabe." },
    { label: "Daten", description: "Import- und Export-Funktionen für deine Daten. Du kannst deine Einträge als CSV exportieren, Daten aus anderen Apps importieren oder einzelne Zeiträume löschen. Hier findest du auch die Testdaten-Funktion." },
  ],
};

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  { question: "Muss ich wirklich alles grammgenau abwiegen?", answer: "Nein, du musst nicht alles auf das Gramm genau wiegen. Grobe Schätzungen reichen oft aus, um einen guten Überblick zu bekommen. Mit der Zeit entwickelst du ein gutes Augenmaß. Wichtiger als Perfektion ist Konstanz beim Tracking." },
  { question: "Wie funktioniert die Foto-Erkennung?", answer: "Tippe auf das Kamera-Symbol in der Eingabemaske und fotografiere deine Mahlzeit. Die KI analysiert das Bild, erkennt die einzelnen Lebensmittel und schätzt Menge sowie Nährwerte. Du kannst die Vorschläge anschließend noch anpassen, bevor du sie übernimmst." },
  { question: "Kann ich eigene Rezepte speichern?", answer: "Ja! Gehe in die Einstellungen unter 'Rezepte'. Dort kannst du eigene Rezepte manuell anlegen, per KI generieren lassen oder ein Foto eines Rezepts hochladen. Gespeicherte Rezepte erscheinen danach als Vorschlag bei der Eingabe." },
  { question: "Was bedeutet das Kaloriendefizit?", answer: "Das Kaloriendefizit ist die Differenz zwischen deinem Kalorienverbrauch (Grundumsatz + Aktivität) und deiner Kalorienaufnahme. Ein Defizit bedeutet, dass du weniger Kalorien zu dir nimmst als du verbrauchst – das ist die Grundlage zum Abnehmen. Ein Defizit von ca. 500 kcal pro Tag entspricht etwa 0,5 kg Gewichtsverlust pro Woche." },
  { question: "Wie genau ist die Sprachsteuerung?", answer: "Die Sprachsteuerung erkennt Lebensmittel, Mengenangaben und Navigationsbefehle zuverlässig auf Deutsch. Sprich deutlich und nenne Menge und Lebensmittel zusammen, z. B. '200 Gramm Hähnchenbrust'. Bei Hintergrundgeräuschen kann die Erkennung eingeschränkt sein." },
  { question: "Werden meine Daten in der Cloud gespeichert?", answer: "Deine Ernährungsdaten werden lokal auf deinem Gerät gespeichert. Du kannst sie jederzeit über die Einstellungen als CSV exportieren oder importieren, um ein Backup zu erstellen oder die Daten auf ein anderes Gerät zu übertragen." },
  { question: "Was ist Intervallfasten und wie hilft die Fastenanalyse?", answer: "Intervallfasten bedeutet, dass du nur in einem bestimmten Zeitfenster isst, z. B. 8 Stunden essen, 16 Stunden fasten (16:8). Die Fastenanalyse erkennt automatisch deine Essenspausen anhand deiner Einträge und zeigt dir, wie lange deine Fastenperioden sind." },
  { question: "Wie kann ich meine Fortschritte sehen?", answer: "Wechsle zum Statistik-Tab. Dort findest du eine 7-Tage-Übersicht mit Kalorien, Defizit und Makronährstoffen als Diagramme. Außerdem zeigt dir die Übersicht, wie viele Tage du bei deinem aktuellen Defizit noch bis zu deinem Zielgewicht brauchst." },
  { question: "Zählen Getränke automatisch zur Flüssigkeit?", answer: "Ja! Getränke wie Wasser, Tee, Kaffee oder Saft werden automatisch aus deinen Einträgen erkannt und zur Flüssigkeitsaufnahme gezählt. Du siehst im Flüssigkeits-Widget, wie viel du bereits getrunken hast und wie viel noch bis zu deinem Tagesziel fehlt." },
  { question: "Kann ich Daten aus anderen Apps importieren?", answer: "Ja! In den Einstellungen unter 'Daten' findest du eine Import-Funktion. Du kannst CSV-Dateien von anderen Ernährungs-Apps hochladen. Die Daten werden dann in die App importiert und stehen dir zur Verfügung." },
  { question: "Wie wird mein täglicher Kalorienbedarf berechnet?", answer: "Der Kalorienbedarf wird basierend auf deinen Profildaten (Alter, Geschlecht, Größe, Gewicht) und deinem Aktivitätslevel berechnet. Die App nutzt anerkannte Formeln wie die Harris-Benedict-Formel für deinen Grundumsatz und berücksichtigt deine erfassten Aktivitäten." },
  { question: "Was sind Mikronährstoffe und kann ich diese tracken?", answer: "Mikronährstoffe sind Vitamine und Mineralien wie Vitamin C, Eisen, Kalium oder Calcium. Die App zeigt dir in der Übersicht, wie gut deine Nährstoffversorgung ist und warnt dich, wenn wichtige Mikronährstoffe zu kurz kommen." },
  { question: "Kann ich mehrere Profile erstellen?", answer: "Aktuell unterstützt die App ein Hauptprofil. Du kannst deine Profildaten aber jederzeit in den Einstellungen anpassen, wenn sich deine Ziele oder persönlichen Daten ändern." },
  { question: "Kann ich Rezepte per WhatsApp oder E-Mail verschicken?", answer: "Ja! Öffne ein gespeichertes Rezept und tippe auf das Teilen-Symbol. Du kannst das Rezept direkt per WhatsApp, E-Mail oder andere Messenger verschicken. Die Rezeptinformationen werden übersichtlich formatiert und mit allen Zutaten und Nährwerten angezeigt." },
  { question: "Kann ich ein Rezeptfoto fotografieren und ein Rezept daraus erstellen?", answer: "Ja! Gehe in die Rezepte-Einstellungen und nutze das Kamera-Symbol. Fotografiere ein Rezept oder eine Mahlzeit – die KI erkennt automatisch die Zutaten, erstellt ein vollständiges Rezept mit Zubereitungsschritten und berechnet alle Makronährstoffe. Das Originalfoto wird im Rezept gespeichert." },
  { question: "Kann ich mit meinen eigenen Lebensmitteln Rezepte von der KI erstellen lassen?", answer: "Ja! In den Rezepte-Einstellungen kannst du bis zu 5 Zutaten aus deiner Lebensmitteldatenbank auswählen und die KI bietet dir Rezeptvorschläge an. Die KI generiert dann ein komplettes Rezept mit Zubereitungsschritten und berechnet automatisch alle Nährwerte." },
  { question: "Wie speichere ich ein KI-generiertes Rezept dauerhaft?", answer: "Nach der KI-Generierung wird das Rezept zunächst als Vorschlag angezeigt. Mit dem Button 'Speichern' kannst du es in deine Rezeptsammlung aufnehmen. Du kannst es danach jederzeit bearbeiten, erneut generieren oder als Mahlzeit buchen." },
  { question: "Kann ich ein gespeichertes Rezept nachträglich bearbeiten oder die KI neu berechnen lassen?", answer: "Ja! Öffne ein Rezept und tippe auf das Stift-Symbol zum Bearbeiten. Du kannst Zutaten ändern, Mengen anpassen oder den KI-Rechner verwenden, um Zubereitungsschritte und Nährwerte neu berechnen zu lassen." },
];

const HelpContent = () => {
  const [activeCategory, setActiveCategory] = useState<HelpTab>("eingabe");
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const topics = HELP_TOPICS[activeCategory];

  return (
    <>
      {/* Category tiles card */}
      <div className="glass-card rounded-xl p-3 mb-3">
        <SectionHeading className="mb-2">Hauptkategorien</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          {HELP_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id);
                  setOpenTopic(null);
                }}
                className={`rounded-xl px-3 py-3 text-xs font-semibold text-center transition-colors border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-accent/50 text-foreground border-border hover:bg-accent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Badges card */}
      <div className="glass-card rounded-xl p-3 mb-3">
        <SectionHeading className="mb-2">
          {HELP_TABS.find((t) => t.id === activeCategory)?.label}
        </SectionHeading>
        <div className="flex flex-col gap-1.5">
          {topics.map((topic) => {
            const isOpen = openTopic === topic.label;
            return (
              <Collapsible
                key={topic.label}
                open={isOpen}
                onOpenChange={(o) => setOpenTopic(o ? topic.label : null)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center w-full text-left group">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none ${
                        isOpen
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-transparent hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      {topic.label}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-1 mt-1.5 mb-1 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground leading-relaxed">
                    {topic.description}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* FAQ card */}
      <div className="glass-card rounded-xl p-3 mb-3">
        <SectionHeading className="mb-2">FAQs</SectionHeading>
        <div className="flex flex-col gap-1.5">
          {FAQ_ITEMS.map((faq) => {
            const isOpen = openFaq === faq.question;
            return (
              <Collapsible
                key={faq.question}
                open={isOpen}
                onOpenChange={(o) => setOpenFaq(o ? faq.question : null)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center w-full text-left group">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer select-none ${
                        isOpen
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-transparent hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      {faq.question}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-1 mt-1.5 mb-1 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* Spacer so last sections can scroll to top */}
      <div style={{ height: "calc(100vh - 14rem)" }} />
    </>
  );
};

export default HelpContent;
