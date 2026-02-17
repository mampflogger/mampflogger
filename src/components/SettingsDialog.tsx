import { useState, useEffect } from "react";
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
import {
  Settings, Sun, Moon, Trash2, Upload, Download, UserCircle, Save, Check,
  AlertCircle, FileSpreadsheet, UtensilsCrossed, Palette,
} from "lucide-react";
import { UserProfile, calculateBMR } from "@/types/profile";
import { NutritionEntry } from "@/types/nutrition";
import { foodDatabase, removeFoodItem, updateFoodItem, FoodItem } from "@/data/foodDatabase";
import {
  exportEntriesToCsv, exportFoodDatabaseCsv, exportCalorieBalanceCsv,
  parseEntriesCsv, parseFoodDatabaseCsv, parseCalorieBalanceCsv,
} from "@/lib/csvExport";
import { BookedActivity } from "@/types/profile";
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
  openToNewFood?: boolean;
  onOpenToNewFoodHandled?: () => void;
}

type ImportType = "csv-entries" | "csv-balance" | "csv-food";

// Date auto-format helpers
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + "." + digits.slice(2);
  return digits.slice(0, 2) + "." + digits.slice(2, 4) + "." + digits.slice(4);
}

function parseDateInputToISO(text: string): string {
  const parts = text.split(".");
  if (parts.length < 3 || parts[2].length < 2) return "";
  const d = parts[0].padStart(2, "0");
  const m = parts[1].padStart(2, "0");
  let y = parseInt(parts[2]);
  if (isNaN(y)) return "";
  if (y < 100) y += 2000;
  return `${y}-${m}-${d}`;
}

const SettingsDialog = ({
  profile, onSaveProfile, darkMode, onToggleDarkMode,
  colorTheme, onChangeTheme, entries, bookedActivities,
  onImport, onCount, onDelete, openToNewFood, onOpenToNewFoodHandled,
}: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("profile");

  // Profile state
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [goalFluidMl, setGoalFluidMl] = useState("");
  const [goalDeficit, setGoalDeficit] = useState("");

  // Import state
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<NutritionEntry[] | null>(null);
  const [foodPreview, setFoodPreview] = useState<FoodItem[] | null>(null);

  // Delete state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deletePreview, setDeletePreview] = useState<number | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Food list state
  const [foodSearch, setFoodSearch] = useState("");
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editFoodName, setEditFoodName] = useState("");
  const [editFoodUnit, setEditFoodUnit] = useState("");
  const [editFoodCal, setEditFoodCal] = useState("");
  const [editFoodPro, setEditFoodPro] = useState("");
  const [editFoodFat, setEditFoodFat] = useState("");
  const [editFoodKh, setEditFoodKh] = useState("");
  const [editFoodFib, setEditFoodFib] = useState("");
  const [editFoodDefault, setEditFoodDefault] = useState("");
  const [editFoodLiquid, setEditFoodLiquid] = useState("");
  const [, forceUpdate] = useState(0);

  // Handle external "New Food" trigger
  useEffect(() => {
    if (openToNewFood) {
      setOpen(true);
      setTab("food");
      handleNewFood();
      onOpenToNewFoodHandled?.();
    }
  }, [openToNewFood]);

  const handleNewFood = () => {
    const blank: FoodItem = {
      name: "",
      baseUnit: "100g",
      baseAmount: 100,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      fiber: 0,
    };
    setEditingFood(blank);
    setEditFoodName("");
    setEditFoodUnit("100g");
    setEditFoodCal("");
    setEditFoodPro("");
    setEditFoodFat("");
    setEditFoodKh("");
    setEditFoodFib("");
    setEditFoodDefault("");
    setEditFoodLiquid("");
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && profile) {
      setName(profile.name);
      setBirthYear(String(profile.birthYear));
      setHeightCm(String(profile.heightCm));
      setWeightKg(String(profile.weightKg));
      setGender(profile.gender);
      setGoalFluidMl(profile.goalFluidMl ? String(profile.goalFluidMl) : "");
      setGoalDeficit(profile.goalDeficit ? String(profile.goalDeficit) : "");
    }
    if (!isOpen) {
      setEditingFood(null);
      setImportType(null);
      setRawText("");
      setPreview(null);
      setFoodPreview(null);
    }
  };

  const currentProfile: UserProfile | null =
    name && birthYear && heightCm && weightKg
      ? {
          name,
          birthYear: parseInt(birthYear),
          heightCm: parseInt(heightCm),
          weightKg: parseFloat(weightKg),
          gender,
          goalFluidMl: goalFluidMl ? parseInt(goalFluidMl) : undefined,
          goalDeficit: goalDeficit ? parseInt(goalDeficit) : undefined,
        }
      : null;

  const bmrPreview = currentProfile ? calculateBMR(currentProfile) : null;

  const handleSaveProfile = () => {
    if (!currentProfile) return;
    onSaveProfile(currentProfile);
    toast.success("Profil gespeichert!");
  };

  // Food editing
  const handleEditFood = (food: FoodItem) => {
    setEditingFood(food);
    setEditFoodName(food.name);
    setEditFoodUnit(food.baseUnit);
    setEditFoodCal(String(food.calories));
    setEditFoodPro(String(food.protein));
    setEditFoodFat(String(food.fat));
    setEditFoodKh(String(food.carbs));
    setEditFoodFib(String(food.fiber));
    setEditFoodDefault(food.defaultAmount ? String(food.defaultAmount) : "");
    setEditFoodLiquid((food as any).liquidMl ? String((food as any).liquidMl) : "");
  };

  const handleSaveFood = () => {
    if (!editingFood || !editFoodName.trim()) return;
    const updated: FoodItem = {
      name: editFoodName.trim(),
      baseUnit: editFoodUnit || "100g",
      baseAmount: editFoodUnit.startsWith("1 ") ? 1 : 100,
      calories: parseFloat(editFoodCal) || 0,
      protein: parseFloat(editFoodPro) || 0,
      fat: parseFloat(editFoodFat) || 0,
      carbs: parseFloat(editFoodKh) || 0,
      fiber: parseFloat(editFoodFib) || 0,
      defaultAmount: editFoodDefault ? parseFloat(editFoodDefault) || undefined : undefined,
      liquidMl: editFoodLiquid ? parseFloat(editFoodLiquid) || undefined : undefined,
    } as any;
    updateFoodItem(editingFood.name, updated);
    const isNew = !editingFood.name;
    setEditingFood(null);
    forceUpdate((n) => n + 1);
    toast.success(isNew ? "Lebensmittel hinzugefügt!" : "Lebensmittel aktualisiert!");
  };

  // Import handlers
  const handleParse = () => {
    setFoodPreview(null);
    setPreview(null);
    if (!importType) return;
    if (importType === "csv-food") {
      setFoodPreview(parseFoodDatabaseCsv(rawText));
    } else if (importType === "csv-balance") {
      setPreview(parseCalorieBalanceCsv(rawText));
    } else {
      setPreview(parseEntriesCsv(rawText));
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
      resetImport();
      return;
    }
    if (!preview || preview.length === 0) return;
    onImport(preview);
    toast.success(`${preview.length} Einträge importiert!`);
    resetImport();
  };

  const resetImport = () => {
    setRawText("");
    setPreview(null);
    setFoodPreview(null);
    setImportType(null);
  };

  const handleDeletePreview = () => {
    const from = parseDateInputToISO(fromDate);
    const to = parseDateInputToISO(toDate);
    if (!from || !to) return;
    setDeletePreview(onCount(from, to));
  };

  const handleDeleteConfirm = () => {
    const from = parseDateInputToISO(fromDate);
    const to = parseDateInputToISO(toDate);
    if (!from || !to) return;
    onDelete(from, to);
    setDeleteConfirmed(true);
    toast.success("Einträge gelöscht!");
    setTimeout(() => {
      setFromDate("");
      setToDate("");
      setDeletePreview(null);
      setDeleteConfirmed(false);
    }, 1200);
  };

  const handleDeleteAll = () => {
    const count = onDelete("0000-01-01", "9999-12-31");
    setShowDeleteAllConfirm(false);
    toast.success(`${count} Einträge gelöscht!`);
    forceUpdate((n) => n + 1);
  };

  const handleRemoveFood = (foodName: string) => {
    removeFoodItem(foodName);
    forceUpdate((n) => n + 1);
  };

  const filteredFoods = foodSearch
    ? foodDatabase.filter((f) => f.name.toLowerCase().includes(foodSearch.toLowerCase()))
    : [...foodDatabase].sort((a, b) => a.name.localeCompare(b.name));

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
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" className="h-11 bg-muted/50" autoCorrect="off" spellCheck={false} />
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

            {/* Your Goals */}
            <div className="border-t border-border pt-4">
              <Label className="text-xs font-semibold text-muted-foreground mb-3 block uppercase tracking-wider">Your Goals</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Flüssigkeit (ml/Tag)</Label>
                  <Input type="number" inputMode="numeric" value={goalFluidMl} onChange={(e) => setGoalFluidMl(e.target.value)} placeholder="z.B. 2500" className="h-11 bg-muted/50" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kalorien Defizit</Label>
                  <Input type="number" inputMode="numeric" value={goalDeficit} onChange={(e) => setGoalDeficit(e.target.value)} placeholder="z.B. 500" className="h-11 bg-muted/50" />
                </div>
              </div>
            </div>

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
            {editingFood ? (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{editingFood.name ? "Lebensmittel bearbeiten" : "Neues Lebensmittel"}</p>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Lebensmittel</Label>
                    <Input value={editFoodName} onChange={(e) => setEditFoodName(e.target.value)} className="h-9 text-xs" autoCorrect="off" spellCheck={false} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Einheit</Label>
                    {(() => {
                      const presets = ["100g", "100ml", "1 Stk", "1 Tasse", "1 Scheibe", "1 Portion"];
                      const isCustom = editFoodUnit && !presets.includes(editFoodUnit);
                      return isCustom ? (
                        <div className="flex gap-1">
                          <Input value={editFoodUnit} onChange={(e) => setEditFoodUnit(e.target.value)} className="h-9 text-xs flex-1" autoFocus />
                          <button type="button" onClick={() => setEditFoodUnit("100g")} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                      ) : (
                        <select value={editFoodUnit} onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setEditFoodUnit("1 ");
                          } else {
                            setEditFoodUnit(e.target.value);
                          }
                        }} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                          {presets.map(u => <option key={u} value={u}>{u}</option>)}
                          <option value="__custom__">Eigene…</option>
                        </select>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">kcal</Label>
                    <Input type="number" inputMode="decimal" value={editFoodCal} onChange={(e) => setEditFoodCal(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">PRO</Label>
                    <Input type="number" inputMode="decimal" value={editFoodPro} onChange={(e) => setEditFoodPro(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">FAT</Label>
                    <Input type="number" inputMode="decimal" value={editFoodFat} onChange={(e) => setEditFoodFat(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">KH</Label>
                    <Input type="number" inputMode="decimal" value={editFoodKh} onChange={(e) => setEditFoodKh(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">FIB</Label>
                    <Input type="number" inputMode="decimal" value={editFoodFib} onChange={(e) => setEditFoodFib(e.target.value)} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Standardwert</Label>
                    <Input type="number" inputMode="decimal" value={editFoodDefault} onChange={(e) => setEditFoodDefault(e.target.value)} placeholder="z.B. 125" className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Flüssigkeit in ml</Label>
                    <Input type="number" inputMode="decimal" value={editFoodLiquid} onChange={(e) => setEditFoodLiquid(e.target.value)} placeholder="z.B. 250" className="h-9 text-xs" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveFood} className="flex-1 h-9 text-xs">
                    <Save className="w-3.5 h-3.5 mr-1" /> Speichern
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingFood(null)} className="h-9 text-xs">
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={handleNewFood}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  + New Food
                </button>
                <Input
                  placeholder="Lebensmittel suchen..."
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  className="h-9 text-xs"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {filteredFoods.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleEditFood(f)}
                    >
                      <div className="truncate">
                        <span className="font-medium">{f.name}</span>
                        <span className="text-muted-foreground ml-2">{f.calories} kcal/{f.baseUnit}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveFood(f.name); }}
                        className="p-0.5 rounded text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{foodDatabase.length} Lebensmittel in der Datenbank</p>
              </>
            )}
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
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Button
                  variant={importType === "csv-entries" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => { setImportType(importType === "csv-entries" ? null : "csv-entries"); setRawText(""); setPreview(null); setFoodPreview(null); }}
                  className="text-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Protokoll
                </Button>
                <Button
                  variant={importType === "csv-balance" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => { setImportType(importType === "csv-balance" ? null : "csv-balance"); setRawText(""); setPreview(null); setFoodPreview(null); }}
                  className="text-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Bilanz
                </Button>
                <Button
                  variant={importType === "csv-food" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => { setImportType(importType === "csv-food" ? null : "csv-food"); setRawText(""); setPreview(null); setFoodPreview(null); }}
                  className="text-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" /> Lebensmittel
                </Button>
              </div>
              {importType && (
                <div className="space-y-2">
                  <div className="rounded-lg bg-accent/40 p-2 text-xs text-muted-foreground">
                    <p className="font-mono text-[10px]">
                      {importType === "csv-entries" && "Datum;Zeit;Lebensmittel;Menge;kcal;PRO;FAT;KH;FIB"}
                      {importType === "csv-balance" && "Datum;kcal;PRO;FAT;KH;FIB;Bonus;Defizit"}
                      {importType === "csv-food" && "Lebensmittel;Einheit;kcal;PRO;FAT;KH;FIB;Standard"}
                    </p>
                  </div>
                  <Textarea
                    placeholder="Daten hier einfügen..."
                    value={rawText}
                    onChange={(e) => { setRawText(e.target.value); setPreview(null); setFoodPreview(null); }}
                    className="min-h-[100px] font-mono text-xs"
                    rows={5}
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <Button variant="secondary" className="w-full" onClick={handleParse} disabled={!rawText.trim()}>
                    Vorschau
                  </Button>
                  {(preview !== null || foodPreview !== null) && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      {hasImportResults ? (
                        <>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Check className="w-4 h-4 text-success" />
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
              )}
            </div>

            {/* Delete */}
            <div className="border-t border-border pt-4">
              <Label className="text-xs font-medium text-destructive mb-2 block">Einträge löschen</Label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Von (TT.MM.JJ)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="01.01.26"
                    value={fromDate}
                    onChange={(e) => { setFromDate(formatDateInput(e.target.value)); setDeletePreview(null); setDeleteConfirmed(false); }}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Bis (TT.MM.JJ)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="31.12.26"
                    value={toDate}
                    onChange={(e) => { setToDate(formatDateInput(e.target.value)); setDeletePreview(null); setDeleteConfirmed(false); }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
              {deletePreview !== null && !deleteConfirmed && (
                <p className="text-sm text-destructive font-medium mb-2">{deletePreview} Einträge werden gelöscht.</p>
              )}
              {deleteConfirmed && (
                <p className="text-sm text-success font-medium mb-2">✓ Einträge gelöscht!</p>
              )}
              <div className="flex gap-2">
                {deletePreview === null ? (
                  <Button variant="secondary" onClick={handleDeletePreview} disabled={!fromDate || !toDate || fromDate.length < 6 || toDate.length < 6} className="flex-1">
                    Vorschau
                  </Button>
                ) : !deleteConfirmed ? (
                  <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deletePreview === 0} className="flex-1">
                    {deletePreview} Einträge löschen
                  </Button>
                ) : null}
              </div>

              {/* Delete All */}
              <div className="mt-3">
                {!showDeleteAllConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteAllConfirm(true)}
                    disabled={entries.length === 0}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Alles löschen ({entries.length} Einträge)
                  </Button>
                ) : (
                  <div className="rounded-lg border-2 border-destructive p-3 space-y-2">
                    <p className="text-sm font-semibold text-destructive">
                      Wirklich alle {entries.length} Einträge unwiderruflich löschen?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleDeleteAll} className="flex-1">
                        Ja, alles löschen
                      </Button>
                      <Button variant="ghost" onClick={() => setShowDeleteAllConfirm(false)} className="flex-1">
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
