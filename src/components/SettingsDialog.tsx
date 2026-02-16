import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Sun, Moon, Trash2, Upload, Download, UserCircle, Save, Check, AlertCircle, FileSpreadsheet, UtensilsCrossed, Palette } from "lucide-react";
import { UserProfile, calculateBMR } from "@/types/profile";
import { NutritionEntry } from "@/types/nutrition";
import { foodDatabase, removeFoodItem } from "@/data/foodDatabase";
import { exportEntriesToCsv, exportFoodDatabaseCsv, exportCalorieBalanceCsv, parseEntriesCsv, parseFoodDatabaseCsv } from "@/lib/csvExport";
import { BookedActivity } from "@/types/profile";
import { FoodItem } from "@/data/foodDatabase";
import { toast } from "sonner";

type SettingsTab = "profile" | "design" | "food" | "data";

export type ColorTheme = "green" | "yellow" | "blue" | "pink";

const THEME_COLORS: Record<ColorTheme, { label: string; primary: string; swatch: string }> = {
  green: { label: "Grün", primary: "hsl(152, 55%, 42%)", swatch: "#3a9d6a" },
  yellow: { label: "Gelb", primary: "hsl(45, 80%, 50%)", swatch: "#d4a017" },
  blue: { label: "Blau", primary: "hsl(210, 70%, 50%)", swatch: "#2680c2" },
  pink: { label: "Pink", primary: "hsl(330, 60%, 55%)", swatch: "#c74882" },
};

interface SettingsDialogProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  colorTheme: ColorTheme;
  onChangeTheme: (theme: ColorTheme) => void;
  entries: NutritionEntry[];
  bookedActivities: BookedActivity[];
  onImport: (entries: NutritionEntry[]) => void;
  onCount: (from: string, to: string) => number;
  onDelete: (from: string, to: string) => number;
}

// Import logic (moved from ImportDialog)
type ImportType = "tsv" | "csv-entries" | "csv-food";

function parseImportData(text: string): NutritionEntry[] {
  const lines = text.trim().split("\n");
  const entries: NutritionEntry[] = [];
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 7) continue;
    const first = cols[0].trim().toLowerCase();
    if (first.includes("datum") || first.includes("date") || first === "" || first.includes("tag")) continue;
    const dateStr = cols[0]?.trim() || "";
    const timeStr = cols[1]?.trim() || "";
    const food = cols[2]?.trim() || "";
    const amountStr = cols[3]?.trim() || "";
    const calStr = cols[4]?.trim() || "";
    const protStr = cols[5]?.trim() || "";
    const fatStr = cols[6]?.trim() || "";
    const carbStr = cols[7]?.trim() || "";
    const fiberStr = cols[8]?.trim() || "";
    const dateParts = dateStr.split(".");
    if (dateParts.length < 3) continue;
    const day = dateParts[0].padStart(2, "0");
    const month = dateParts[1].padStart(2, "0");
    let year = parseInt(dateParts[2]);
    if (isNaN(year)) continue;
    if (year < 100) year += 2000;
    const date = `${year}-${month}-${day}`;
    const time = timeStr.includes(":") ? timeStr.slice(0, 5) : "00:00";
    const amountMatch = amountStr.match(/(\d+(?:[.,]\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;
    const parseVal = (val: string): number => {
      if (!val) return 0;
      const cleaned = val.split("/")[0].trim().replace(",", ".");
      return parseFloat(cleaned) || 0;
    };
    if (!food) continue;
    entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date, time, food, amount,
      calories: Math.round(parseVal(calStr)),
      protein: Math.round(parseVal(protStr)),
      carbs: Math.round(parseVal(carbStr)),
      fat: Math.round(parseVal(fatStr)),
      fiber: Math.round(parseVal(fiberStr)),
    });
  }
  return entries;
}

const SettingsDialog = ({
  profile, onSaveProfile, darkMode, onToggleDarkMode,
  colorTheme, onChangeTheme, entries, bookedActivities,
  onImport, onCount, onDelete,
}: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("profile");

  // Profile state
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // Import state
  const [importType, setImportType] = useState<ImportType>("tsv");
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<NutritionEntry[] | null>(null);
  const [foodPreview, setFoodPreview] = useState<FoodItem[] | null>(null);

  // Delete state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deletePreview, setDeletePreview] = useState<number | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // Food list state
  const [foodSearch, setFoodSearch] = useState("");
  const [, forceUpdate] = useState(0);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && profile) {
      setName(profile.name);
      setBirthYear(String(profile.birthYear));
      setHeightCm(String(profile.heightCm));
      setWeightKg(String(profile.weightKg));
      setGender(profile.gender);
    }
  };

  const currentProfile: UserProfile | null =
    name && birthYear && heightCm && weightKg
      ? { name, birthYear: parseInt(birthYear), heightCm: parseInt(heightCm), weightKg: parseFloat(weightKg), gender }
      : null;

  const bmrPreview = currentProfile ? calculateBMR(currentProfile) : null;

  const handleSaveProfile = () => {
    if (!currentProfile) return;
    onSaveProfile(currentProfile);
    toast.success("Profil gespeichert!");
  };

  // Import handlers
  const handleParse = () => {
    setFoodPreview(null);
    setPreview(null);
    if (importType === "csv-food") {
      setFoodPreview(parseFoodDatabaseCsv(rawText));
    } else if (importType === "csv-entries") {
      setPreview(parseEntriesCsv(rawText));
    } else {
      setPreview(parseImportData(rawText));
    }
  };

  const handleImportConfirm = () => {
    if (importType === "csv-food" && foodPreview && foodPreview.length > 0) {
      foodPreview.forEach((item) => {
        if (!foodDatabase.find((f) => f.name === item.name)) {
          foodDatabase.push(item);
        }
      });
      toast.success(`${foodPreview.length} Lebensmittel importiert!`);
      setRawText(""); setPreview(null); setFoodPreview(null);
      return;
    }
    if (!preview || preview.length === 0) return;
    onImport(preview);
    toast.success(`${preview.length} Einträge importiert!`);
    setRawText(""); setPreview(null); setFoodPreview(null);
  };

  const handleDeletePreview = () => {
    if (!fromDate || !toDate) return;
    setDeletePreview(onCount(fromDate, toDate));
  };

  const handleDeleteConfirm = () => {
    if (!fromDate || !toDate) return;
    onDelete(fromDate, toDate);
    setDeleteConfirmed(true);
    setTimeout(() => {
      setFromDate(""); setToDate(""); setDeletePreview(null); setDeleteConfirmed(false);
    }, 1200);
  };

  const filteredFoods = foodSearch
    ? foodDatabase.filter((f) => f.name.toLowerCase().includes(foodSearch.toLowerCase()))
    : [...foodDatabase].sort((a, b) => a.name.localeCompare(b.name));

  const handleRemoveFood = (name: string) => {
    removeFoodItem(name);
    forceUpdate((n) => n + 1);
  };

  const hasImportResults = (preview && preview.length > 0) || (foodPreview && foodPreview.length > 0);
  const importResultCount = preview?.length || foodPreview?.length || 0;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profil", icon: <UserCircle className="w-3.5 h-3.5" /> },
    { id: "design", label: "Design", icon: <Palette className="w-3.5 h-3.5" /> },
    { id: "food", label: "Lebensmittel", icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
    { id: "data", label: "Daten", icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Einstellungen">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>Profil, Design, Lebensmittel und Datenmanagement</DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5 mb-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" className="h-11 bg-muted/50" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Geschlecht</Label>
              <div className="flex gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      gender === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g === "male" ? "Männlich" : "Weiblich"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Geburtsjahr</Label>
                <Input type="number" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1990" className="h-11 bg-muted/50" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Größe (cm)</Label>
                <Input type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="180" className="h-11 bg-muted/50" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Gewicht (kg)</Label>
                <Input type="number" inputMode="decimal" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="80.0" className="h-11 bg-muted/50" />
              </div>
            </div>
            {bmrPreview && (
              <div className="rounded-xl bg-accent/40 p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">Grundumsatz (BMR)</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{bmrPreview}</p>
                <p className="text-xs text-muted-foreground">kcal / Tag</p>
              </div>
            )}
            <Button onClick={handleSaveProfile} disabled={!currentProfile} className="w-full h-11 gap-2">
              <Save className="w-4 h-4" />
              Profil speichern
            </Button>
          </div>
        )}

        {/* Design Tab */}
        {tab === "design" && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Modus</Label>
              <button
                onClick={onToggleDarkMode}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <span className="text-sm font-medium">{darkMode ? "Dark Mode" : "Light Mode"}</span>
              </button>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Farbthema</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(THEME_COLORS) as ColorTheme[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => onChangeTheme(key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                      colorTheme === key ? "border-primary bg-accent/40" : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: THEME_COLORS[key].swatch }} />
                    <span className="text-xs font-medium">{THEME_COLORS[key].label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Food List Tab */}
        {tab === "food" && (
          <div className="space-y-3">
            <Input
              placeholder="Lebensmittel suchen..."
              value={foodSearch}
              onChange={(e) => setFoodSearch(e.target.value)}
              className="h-9 text-xs"
            />
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {filteredFoods.map((f) => (
                <div key={f.name} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/30">
                  <div className="truncate">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground ml-2">{f.calories} kcal/{f.baseUnit}</span>
                  </div>
                  <button onClick={() => handleRemoveFood(f.name)} className="p-0.5 rounded text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{foodDatabase.length} Lebensmittel in der Datenbank</p>
          </div>
        )}

        {/* Data Tab */}
        {tab === "data" && (
          <div className="space-y-4">
            {/* Export */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Export</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" size="sm" onClick={() => exportEntriesToCsv(entries)} disabled={entries.length === 0} className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> Protokoll
                </Button>
                <Button variant="secondary" size="sm" onClick={() => exportCalorieBalanceCsv(entries, bookedActivities)} disabled={entries.length === 0} className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> Bilanz
                </Button>
                <Button variant="secondary" size="sm" onClick={() => exportFoodDatabaseCsv()} className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> Lebensmittel
                </Button>
              </div>
            </div>

            {/* Import */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Import</Label>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5 mb-2">
                {([
                  { id: "tsv" as ImportType, label: "TSV" },
                  { id: "csv-entries" as ImportType, label: "Protokoll" },
                  { id: "csv-food" as ImportType, label: "Lebensmittel" },
                ]).map((t) => (
                  <button key={t.id} onClick={() => { setImportType(t.id); setPreview(null); setFoodPreview(null); }}
                    className={`flex-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                      importType === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-accent/40 p-2 text-xs text-muted-foreground mb-2">
                <p className="font-mono text-[10px]">
                  {importType === "tsv" && "Datum → Uhrzeit → Lebensmittel → Menge → kcal → PRO → FAT → KH → FIB"}
                  {importType === "csv-entries" && "Datum;Zeit;Lebensmittel;Menge;kcal;PRO;FAT;KH;FIB"}
                  {importType === "csv-food" && "Lebensmittel;Einheit;kcal;PRO;FAT;KH;FIB"}
                </p>
              </div>
              <Textarea
                placeholder="Daten hier einfügen..."
                value={rawText}
                onChange={(e) => { setRawText(e.target.value); setPreview(null); setFoodPreview(null); }}
                className="min-h-[100px] font-mono text-xs mb-2"
                rows={5}
              />
              <Button variant="secondary" className="w-full mb-2" onClick={handleParse} disabled={!rawText.trim()}>
                Vorschau
              </Button>
              {(preview !== null || foodPreview !== null) && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  {hasImportResults ? (
                    <>
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        {importResultCount} {importType === "csv-food" ? "Lebensmittel" : "Einträge"} erkannt
                      </div>
                      <Button className="w-full" onClick={handleImportConfirm}>
                        <Check className="w-4 h-4 mr-2" />
                        Importieren
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      Keine Einträge erkannt.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delete */}
            <div className="border-t border-border pt-4">
              <Label className="text-xs font-medium text-destructive mb-2 block">Einträge löschen</Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Von</Label>
                  <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setDeletePreview(null); setDeleteConfirmed(false); }} className="h-9 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Bis</Label>
                  <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setDeletePreview(null); setDeleteConfirmed(false); }} className="h-9 text-xs" />
                </div>
              </div>
              {deletePreview !== null && !deleteConfirmed && (
                <p className="text-sm text-destructive font-medium mb-2">{deletePreview} Einträge werden gelöscht.</p>
              )}
              {deleteConfirmed && (
                <p className="text-sm text-primary font-medium mb-2">✓ Einträge gelöscht!</p>
              )}
              {deletePreview === null ? (
                <Button variant="secondary" onClick={handleDeletePreview} disabled={!fromDate || !toDate} className="w-full">
                  Vorschau
                </Button>
              ) : !deleteConfirmed ? (
                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deletePreview === 0} className="w-full">
                  {deletePreview} Einträge löschen
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
