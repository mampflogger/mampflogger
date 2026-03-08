import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface HelpTopic {
  label: string;
  description: string;
}

type HelpTab = "eingabe" | "statistik" | "einstellungen";

const HELP_TABS: { id: HelpTab; label: string }[] = [
  { id: "eingabe", label: "Eingabemaske" },
  { id: "statistik", label: "Statistik" },
  { id: "einstellungen", label: "Einstellungen" },
];

const HELP_TOPICS: Record<HelpTab, HelpTopic[]> = {
  eingabe: [
    {
      label: "Neuer Eintrag",
      description:
        "Hier gibst du ein neues Lebensmittel ein. Wähle die Uhrzeit, tippe den Namen des Lebensmittels und gib die Menge in Gramm oder Milliliter an. Du kannst auch das Kamera-Symbol nutzen, um ein Foto deiner Mahlzeit zu machen – die App erkennt automatisch, was auf dem Teller liegt.",
    },
    {
      label: "Makro Nährstoffverteilung",
      description:
        "Zeigt dir die prozentuale Verteilung von Eiweiß, Fett und Kohlenhydraten für den aktuellen Tag als Balkendiagramm an. So siehst du auf einen Blick, ob deine Makros im gewünschten Verhältnis liegen.",
    },
    {
      label: "Tagesübersicht",
      description:
        "Listet alle Lebensmittel auf, die du heute eingetragen hast – inklusive Kalorien und Makronährstoffe. Du kannst Einträge bearbeiten oder löschen und siehst die Gesamtsumme unten.",
    },
    {
      label: "Kalorienaufnahme 24 Stunden",
      description:
        "Ein Diagramm, das deine Kalorienaufnahme über die letzten 24 Stunden als Zeitverlauf darstellt. Hilft dir zu erkennen, wann du gegessen hast und wie sich die Kalorien über den Tag verteilen.",
    },
    {
      label: "Fastenanalyse",
      description:
        "Analysiert deine Essenszeiten und zeigt dir, wie lange deine Fastenperioden sind. Besonders nützlich, wenn du Intervallfasten (z. B. 16:8) praktizierst.",
    },
    {
      label: "Activity",
      description:
        "Trage hier deine sportlichen Aktivitäten ein, um deinen Kalorienverbrauch zu erfassen. Der Activity-Bonus wird in deiner Kalorienbilanz berücksichtigt.",
    },
    {
      label: "Kalorienbilanz",
      description:
        "Zeigt die Differenz zwischen deinem Kalorienbedarf (Grundumsatz + Activity) und deiner Kalorienaufnahme. Ein Defizit bedeutet, dass du weniger Kalorien aufgenommen hast als verbraucht – ideal zum Abnehmen.",
    },
    {
      label: "Flüssigkeit",
      description:
        "Trackt deine Flüssigkeitsaufnahme. Getränke werden automatisch aus deinen Einträgen erkannt. Du siehst, wie viel du bereits getrunken hast und wie viel noch fehlt bis zu deinem Tagesziel.",
    },
  ],
  statistik: [
    {
      label: "Übersicht",
      description:
        "Zeigt dir die wichtigsten Kennzahlen der letzten 7 Tage auf einen Blick: Durchschnittsdefizit, durchschnittliche Kalorienaufnahme und wie viele Tage du noch bis zu deinem Zielgewicht brauchst.",
    },
    {
      label: "Kalorien pro Tag",
      description:
        "Ein Balkendiagramm mit deiner täglichen Kalorienaufnahme der letzten 7 Tage. So erkennst du Trends und kannst Tage mit besonders hoher oder niedriger Aufnahme identifizieren.",
    },
    {
      label: "Defizit pro Tag",
      description:
        "Zeigt dein tägliches Kaloriendefizit (oder -überschuss) als Balkendiagramm. Grüne Balken = Defizit (gut zum Abnehmen), rote Balken = Überschuss.",
    },
    {
      label: "Makros pro Tag",
      description:
        "Gestapeltes Balkendiagramm, das dir für jeden der letzten 7 Tage die Verteilung von Eiweiß, Fett und Kohlenhydraten in Gramm zeigt.",
    },
    {
      label: "Makro-Verteilung (7 Tage)",
      description:
        "Zeigt die durchschnittliche prozentuale Makronährstoffverteilung der letzten 7 Tage. Hilfreich, um zu prüfen, ob du langfristig im gewünschten Verhältnis isst.",
    },
    {
      label: "Vitamine (Ø 7 Tage)",
      description:
        "Zeigt deine geschätzte Vitaminabdeckung basierend auf den eingetragenen Lebensmitteln. Jeder Balken zeigt den Prozentsatz deines Tagesbedarfs. Tippe auf ein Vitamin für Details und Lebensmitteltipps.",
    },
    {
      label: "Mineralstoffe & Spurenelemente (Ø 7 Tage)",
      description:
        "Wie bei den Vitaminen, nur für Mineralstoffe und Spurenelemente. Zeigt dir, wo du gut versorgt bist und wo eventuell Lücken bestehen.",
    },
    {
      label: "KI-Coach",
      description:
        "Der KI-Ernährungscoach analysiert dein Essverhalten der letzten 7 Tage und gibt dir personalisierte Tipps und Empfehlungen. Drücke auf 'Analysieren', um eine neue Auswertung zu starten.",
    },
  ],
  einstellungen: [
    {
      label: "Profil",
      description:
        "Hier gibst du deine persönlichen Daten ein: Name, Geschlecht, Alter, Größe, Gewicht und Zielgewicht. Diese Daten werden für die Berechnung deines Grundumsatzes und Kalorienbedarfs verwendet.",
    },
    {
      label: "Design",
      description:
        "Passe das Erscheinungsbild der App an. Wähle zwischen verschiedenen Farbthemen und aktiviere oder deaktiviere den Dark Mode nach deinem Geschmack.",
    },
    {
      label: "Lebensmittel",
      description:
        "Verwalte deine persönliche Lebensmitteldatenbank. Du kannst eigene Lebensmittel hinzufügen, bestehende bearbeiten oder löschen. Die Datenbank wird für die Autovervollständigung bei der Eingabe verwendet.",
    },
    {
      label: "Rezepte",
      description:
        "Erstelle und verwalte eigene Rezepte mit mehreren Zutaten. Du kannst Rezepte manuell anlegen, per KI generieren lassen oder ein Foto eines Rezepts hochladen. Gespeicherte Rezepte erscheinen als Vorschlag bei der Eingabe.",
    },
    {
      label: "Daten",
      description:
        "Import- und Export-Funktionen für deine Daten. Du kannst deine Einträge als CSV exportieren, Daten aus anderen Apps importieren oder einzelne Zeiträume löschen. Hier findest du auch die Testdaten-Funktion.",
    },
  ],
};

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HelpDialog = ({ open, onOpenChange }: HelpDialogProps) => {
  const [activeTab, setActiveTab] = useState<HelpTab>("eingabe");
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  const topics = HELP_TOPICS[activeTab];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hilfeseiten</DialogTitle>
          <DialogDescription>
            Hier findest du mehr Informationen zu den einzelnen Funktionen. Bei welchem Thema brauchst du Hilfe?
          </DialogDescription>
        </DialogHeader>

        {/* Tab pills */}
        <div className="flex flex-wrap gap-2 mt-2">
          {HELP_TABS.map((tab) => (
            <Badge
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              className="cursor-pointer select-none text-xs px-3 py-1"
              onClick={() => {
                setActiveTab(tab.id);
                setOpenTopic(null);
              }}
            >
              {tab.label}
            </Badge>
          ))}
        </div>

        {/* Topic badges with collapsible descriptions */}
        <div className="flex flex-col gap-1.5 mt-3">
          {topics.map((topic) => {
            const isOpen = openTopic === topic.label;
            return (
              <Collapsible
                key={topic.label}
                open={isOpen}
                onOpenChange={(o) => setOpenTopic(o ? topic.label : null)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full text-left group">
                    <Badge
                      variant="secondary"
                      className="cursor-pointer select-none text-xs px-3 py-1.5 transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      {topic.label}
                    </Badge>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
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
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
