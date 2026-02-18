import React, { useState, useEffect } from "react";
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
import {
  Settings, Sun, Moon, Trash2, Upload, Download, UserCircle, Save, Check,
  AlertCircle, FileSpreadsheet, UtensilsCrossed, Palette, BarChart3, FileUp,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { UserProfile, calculateBMR } from "@/types/profile";
import { NutritionEntry } from "@/types/nutrition";
import { foodDatabase, addFoodItem, removeFoodItem, updateFoodItem, clearFoodDatabase, reloadFoodDatabase, FoodItem } from "@/data/foodDatabase";
import {
  exportEntriesToCsv, exportFoodDatabaseCsv, exportCalorieBalanceCsv, exportActivitiesCsv,
} from "@/lib/csvExport";
import { parseImportText } from "@/lib/importParser";
import { BookedActivity } from "@/types/profile";
import { toast } from "sonner";

type SettingsTab = "profile" | "design" | "food" | "data";

export type ColorTheme = "green" | "yellow" | "blue" | "pink";

const THEME_COLORS: Record<ColorTheme, { label: string; primary: string; swatch: string }> = {
  yellow: { label: "Gelb", primary: "hsl(45, 80%, 50%)", swatch: "#d4a017" },
  blue: { label: "Blau", primary: "hsl(210, 70%, 50%)", swatch: "#2680c2" },
  pink: { label: "Pink", primary: "hsl(330, 60%, 55%)", swatch: "#c74882" },
  green: { label: "Grün", primary: "hsl(152, 55%, 42%)", swatch: "#3a9d6a" },
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
  onImportActivities: (activities: BookedActivity[]) => void;
  onCount: (from: string, to: string) => number;
  onDelete: (from: string, to: string) => number;
  onDeleteAll: () => number;
  onDeleteAllActivities: () => number;
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
  onImport, onImportActivities, onCount, onDelete, onDeleteAll, onDeleteAllActivities, openToNewFood, onOpenToNewFoodHandled,
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
  const [goalActivityBonus, setGoalActivityBonus] = useState("");

  // Import state
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<NutritionEntry[] | null>(null);
  const [foodPreview, setFoodPreview] = useState<FoodItem[] | null>(null);
  const [activityPreview, setActivityPreview] = useState<BookedActivity[] | null>(null);
  const [balanceHint, setBalanceHint] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const deleteToRef = React.useRef<HTMLInputElement>(null);
  const deletePreviewBtnRef = React.useRef<HTMLButtonElement>(null);

  // Delete state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deletePreview, setDeletePreview] = useState<number | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteFoodConfirm, setShowDeleteFoodConfirm] = useState(false);
  const [showDeleteRangeConfirm, setShowDeleteRangeConfirm] = useState(false);
  const [showDeleteActivitiesConfirm, setShowDeleteActivitiesConfirm] = useState(false);

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
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [, forceUpdate] = useState(0);
  const [foodNavIndex, setFoodNavIndex] = useState<number | null>(null);

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
      setGoalActivityBonus(profile.goalActivityBonus ? String(profile.goalActivityBonus) : "");
    }
    if (!isOpen) {
      setEditingFood(null);
      setShowUnitDropdown(false);
      setImportType(null);
      setRawText("");
      setPreview(null);
      setFoodPreview(null);
      setActivityPreview(null);
      setBalanceHint(false);
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
          goalActivityBonus: goalActivityBonus ? parseInt(goalActivityBonus) : undefined,
        }
      : null;

  const bmrPreview = currentProfile ? calculateBMR(currentProfile) : null;

  const handleSaveProfile = () => {
    if (!currentProfile) return;
    onSaveProfile(currentProfile);
    toast.success("Profil gespeichert!");
  };

  // Food editing
  const handleEditFood = (food: FoodItem, index?: number) => {
    setEditingFood(food);
    setEditFoodName(food.name);
    setEditFoodUnit(food.baseUnit);
    setEditFoodCal(String(food.calories));
    setEditFoodPro(String(food.protein));
    setEditFoodFat(String(food.fat));
    setEditFoodKh(String(food.carbs));
    setEditFoodFib(String(food.fiber));
    setEditFoodDefault(food.defaultAmount ? String(food.defaultAmount) : "");
    setEditFoodLiquid(food.liquidMl ? String(food.liquidMl) : "");
    if (index !== undefined) setFoodNavIndex(index);
  };

  const handleNavFood = (dir: -1 | 1) => {
    if (foodNavIndex === null) return;
    const newIndex = foodNavIndex + dir;
    if (newIndex < 0 || newIndex >= filteredFoods.length) return;
    handleEditFood(filteredFoods[newIndex], newIndex);
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
    };
    updateFoodItem(editingFood.name, updated);
    const isNew = !editingFood.name;
    // Stay in editor – update editingFood to reflect saved name
    setEditingFood(updated);
    forceUpdate((n) => n + 1);
    toast.success(isNew ? "Lebensmittel hinzugefügt!" : "Lebensmittel aktualisiert!");
  };

  // Import handlers - file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
        setPreview(null);
        setFoodPreview(null);
        setActivityPreview(null);
        setBalanceHint(false);
        const result = parseImportText(text);
        if (result.detectedType === "balance") {
          setBalanceHint(true);
          toast.info(`"${file.name}" – Bilanzdaten erkannt. Diese werden automatisch aus dem Protokoll berechnet und müssen nicht importiert werden.`);
          return;
        }
        if (result.activities.length > 0) {
          setActivityPreview(result.activities);
          toast.info(`"${file.name}" – ${result.activities.length} Aktivitäten erkannt`);
          return;
        }
        if (result.foodItems.length > 0) {
          setFoodPreview(result.foodItems);
          toast.info(`"${file.name}" – ${result.foodItems.length} Lebensmittel erkannt`);
          return;
        }
        if (result.entries.length > 0) {
          const typeLabel = "Einträge";
          setPreview(result.entries);
          toast.info(`"${file.name}" – ${result.entries.length} ${typeLabel} erkannt`);
          return;
        }
        setPreview([]);
        toast.error(`Keine Daten in "${file.name}" erkannt`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = () => {
    if (activityPreview && activityPreview.length > 0) {
      const existingKeys = new Set(
        bookedActivities.map((a) => `${a.date}|${a.activityName}|${a.value}`)
      );
      const unique = activityPreview.filter(
        (a) => !existingKeys.has(`${a.date}|${a.activityName}|${a.value}`)
      );
      onImportActivities(unique);
      toast.success(`${unique.length} neue Aktivitäten importiert${activityPreview.length - unique.length > 0 ? ` (${activityPreview.length - unique.length} Duplikate übersprungen)` : ""}`);
      resetImport();
      return;
    }
    if (foodPreview && foodPreview.length > 0) {
      let added = 0;
      foodPreview.forEach((item) => {
        if (!foodDatabase.find((f) => f.name.toLowerCase() === item.name.toLowerCase())) {
          addFoodItem(item);
          added++;
        }
      });
      reloadFoodDatabase();
      forceUpdate((n) => n + 1);
      toast.success(`${added} neue Lebensmittel importiert (${foodPreview.length - added} bereits vorhanden)`);
      resetImport();
      return;
    }
    if (!preview || preview.length === 0) return;
    const beforeCount = entries.length;
    onImport(preview);
    setTimeout(() => {
      const newCount = preview.length;
      const existingKeys = new Set(
        entries.map((e) => `${e.date}|${e.time}|${e.food}|${e.amount}`)
      );
      const dupes = preview.filter((e) => existingKeys.has(`${e.date}|${e.time}|${e.food}|${e.amount}`)).length;
      const added = newCount - dupes;
      toast.success(`${added} neue Einträge importiert${dupes > 0 ? ` (${dupes} Duplikate übersprungen)` : ""}`);
    }, 50);
    resetImport();
  };

  const resetImport = () => {
    setRawText("");
    setPreview(null);
    setFoodPreview(null);
    setActivityPreview(null);
    setBalanceHint(false);
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
    const count = onDeleteAll();
    setShowDeleteAllConfirm(false);
    toast.success(`${count} Einträge gelöscht!`);
    forceUpdate((n) => n + 1);
  };

  const handleDeleteAllFood = () => {
    const count = clearFoodDatabase();
    setShowDeleteFoodConfirm(false);
    toast.success(`${count} Lebensmittel gelöscht!`);
    forceUpdate((n) => n + 1);
  };

  const handleRemoveFood = (foodName: string) => {
    removeFoodItem(foodName);
    forceUpdate((n) => n + 1);
  };

  const filteredFoods = foodSearch
    ? foodDatabase.filter((f) => f.name.toLowerCase().includes(foodSearch.toLowerCase()))
    : [...foodDatabase].sort((a, b) => a.name.localeCompare(b.name));

  const hasImportResults = (preview && preview.length > 0) || (foodPreview && foodPreview.length > 0) || (activityPreview && activityPreview.length > 0);
  const importResultCount = preview?.length || foodPreview?.length || activityPreview?.length || 0;

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 pt-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Einstellungen</DialogTitle>
          <DialogDescription className="text-[11px]">Profil, Design, Lebensmittel und Datenmanagement</DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted rounded-lg p-0.5 mb-3">
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
          <div className="space-y-2">
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" className="h-8 text-sm bg-muted/50" autoCorrect="off" spellCheck={false} />
            </div>
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Geschlecht</Label>
              <div className="flex gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      gender === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g === "male" ? "Männlich" : "Weiblich"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Geburtsjahr</Label>
                <Input type="number" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1990" className="h-8 text-sm bg-muted/50" />
              </div>
              <div>
                <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Größe (cm)</Label>
                <Input type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="180" className="h-8 text-sm bg-muted/50" />
              </div>
              <div>
                <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Gewicht (kg)</Label>
                <Input type="number" inputMode="decimal" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="80.0" className="h-8 text-sm bg-muted/50" />
              </div>
            </div>
            {bmrPreview && (
              <div className="rounded-lg bg-accent/40 px-2 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">Grundumsatz (BMR)</span>
                <span className="text-base font-bold text-foreground">{bmrPreview} <span className="text-[10px] font-normal text-muted-foreground">kcal/Tag</span></span>
              </div>
            )}

            {/* Your Goals */}
            <div className="border-t border-border pt-2">
              <Label className="text-[10px] font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wider">YOUR DAILY GOALS</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Flüssigkeit ml</Label>
                  <Input type="number" inputMode="numeric" value={goalFluidMl} onChange={(e) => setGoalFluidMl(e.target.value)} placeholder="2500" className="h-8 text-sm bg-muted/50" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Defizit kcal</Label>
                  <Input type="number" inputMode="numeric" value={goalDeficit} onChange={(e) => setGoalDeficit(e.target.value)} placeholder="500" className="h-8 text-sm bg-muted/50" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Activity kcal</Label>
                  <Input type="number" inputMode="numeric" value={goalActivityBonus} onChange={(e) => setGoalActivityBonus(e.target.value)} placeholder="300" className="h-8 text-sm bg-muted/50" />
                </div>
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={!currentProfile} className="w-full h-8 text-xs gap-2">
              <Save className="w-4 h-4" />
              Profil speichern
            </Button>
          </div>
        )}

        {/* Design Tab */}
        {tab === "design" && (
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Modus</Label>
              <button
                onClick={onToggleDarkMode}
                className="flex items-center gap-3 w-full p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-xs font-medium">{darkMode ? "Dark Mode" : "Light Mode"}</span>
              </button>
            </div>
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Farbthema</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(THEME_COLORS) as ColorTheme[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => onChangeTheme(key)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors ${
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {editingFood.name ? "Lebensmittel bearbeiten" : "Neues Lebensmittel"}
                  </p>
                  {foodNavIndex !== null && editingFood.name && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleNavFood(-1)}
                        disabled={foodNavIndex <= 0}
                        className="h-6 w-6 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted disabled:opacity-30 transition-colors"
                        title="Vorheriges Lebensmittel"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-muted-foreground tabular-nums min-w-[36px] text-center">
                        {foodNavIndex + 1}/{filteredFoods.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNavFood(1)}
                        disabled={foodNavIndex >= filteredFoods.length - 1}
                        className="h-6 w-6 flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted disabled:opacity-30 transition-colors"
                        title="Nächstes Lebensmittel"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Lebensmittel</Label>
                  <Input value={editFoodName} onChange={(e) => setEditFoodName(e.target.value)} className="h-9 text-xs" autoCorrect="off" spellCheck={false} />
                </div>
                {/* Einheit als Dropdown */}
                {(() => {
                  const defaultPresets = ["100g", "100ml", "1 Stk", "1 Tasse", "1 Scheibe", "1 Portion"];
                  const dbUnits = [...new Set(foodDatabase.map(f => f.baseUnit))];
                  const allUnits = [...defaultPresets];
                  dbUnits.forEach(u => { if (!allUnits.includes(u)) allUnits.push(u); });
                  const isCustomInput = editFoodUnit && !allUnits.includes(editFoodUnit);
                  return (
                    <div className="relative">
                      <Label className="text-[10px] text-muted-foreground">Einheit</Label>
                      {isCustomInput ? (
                        <div className="flex gap-1">
                          <Input value={editFoodUnit} onChange={(e) => setEditFoodUnit(e.target.value)} className="h-9 text-xs flex-1" autoFocus />
                          <button type="button" onClick={() => { setEditFoodUnit("100g"); setShowUnitDropdown(false); }} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between h-9 px-3 text-xs rounded-md border border-input bg-background hover:bg-muted/60 transition-colors"
                            onClick={() => setShowUnitDropdown(v => !v)}
                          >
                            <span>{editFoodUnit || "Einheit wählen"}</span>
                            <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showUnitDropdown ? "rotate-90" : ""}`} />
                          </button>
                          {showUnitDropdown && (
                            <div className="absolute left-0 right-0 z-[200] mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                              {allUnits.map(u => (
                                <div
                                  key={u}
                                  className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                                    editFoodUnit === u
                                      ? "bg-primary/10 text-primary font-medium"
                                      : "hover:bg-muted/60"
                                  }`}
                                >
                                  <span
                                    className="flex-1"
                                    onPointerDown={(e) => {
                                      e.preventDefault();
                                      setEditFoodUnit(u);
                                      setShowUnitDropdown(false);
                                    }}
                                  >{u}</span>
                                  {u !== "100g" && (
                                    <button
                                      type="button"
                                      onPointerDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        foodDatabase.forEach(f => {
                                          if (f.baseUnit === u) {
                                            f.baseUnit = "100g";
                                            f.baseAmount = 100;
                                          }
                                        });
                                        localStorage.setItem("mampflogger-food-database", JSON.stringify(foodDatabase));
                                        if (editFoodUnit === u) setEditFoodUnit("100g");
                                        forceUpdate(n => n + 1);
                                        toast.success(`Einheit "${u}" entfernt`);
                                      }}
                                      className="p-1 rounded text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                                      title={`Einheit "${u}" löschen`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <div
                                className="px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 cursor-pointer border-t border-border"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  setEditFoodUnit("1 ");
                                  setShowUnitDropdown(false);
                                }}
                              >
                                Eigene…
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
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
                  <Button variant="ghost" onClick={() => { setEditingFood(null); setFoodNavIndex(null); }} className="h-9 text-xs">
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
                  {filteredFoods.map((f, idx) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleEditFood(f, idx)}
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
          <div className="space-y-2">

            {/* IMPORT Section */}
            <div className="rounded-lg border border-border bg-accent/20 p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Import</h3>
                <span className="text-[9px] text-muted-foreground ml-auto">Auto-Erkennung</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.tab"
                onChange={handleFileUpload}
                className="hidden"
              />
              {!hasImportResults ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-7 text-[11px] gap-1.5"
                >
                  <FileUp className="w-3 h-3" />
                  Datei auswählen (.csv, .tsv, .txt)
                </Button>
              ) : (
                <div className="rounded-lg bg-background border border-border p-2.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    {importResultCount} {activityPreview && activityPreview.length > 0 ? "Aktivitäten" : foodPreview && foodPreview.length > 0 ? "Lebensmittel" : "Einträge"} erkannt
                  </div>
                  {preview && preview.length > 0 && (() => {
                    const existingKeys = new Set(
                      entries.map((e) => `${e.date}|${e.time}|${e.food}|${e.amount}`)
                    );
                    const dupes = preview.filter((e) => existingKeys.has(`${e.date}|${e.time}|${e.food}|${e.amount}`)).length;
                    const newCount = preview.length - dupes;
                    return dupes > 0 ? (
                      <p className="text-[10px] text-muted-foreground">
                        {newCount} neu, {dupes} bereits vorhanden (werden übersprungen)
                      </p>
                    ) : null;
                  })()}
                  <div className="flex gap-2">
                    <Button className="flex-1 h-8 text-xs" onClick={handleImportConfirm}>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Importieren
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetImport}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
              {preview !== null && preview.length === 0 && !foodPreview && !activityPreview && !balanceHint && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Keine Daten erkannt.
                </div>
              )}
              {balanceHint && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background border border-border rounded-lg p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Bilanzdaten werden automatisch aus dem Protokoll berechnet und müssen nicht importiert werden.</span>
                </div>
              )}
            </div>

            {/* EXPORT Section */}
            <div className="rounded-lg border border-border bg-accent/20 p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Export</h3>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Protokoll", icon: <FileSpreadsheet className="w-3 h-3" />, action: () => exportEntriesToCsv(entries), disabled: entries.length === 0, count: entries.length },
                  { label: "Aktivitäten", icon: <BarChart3 className="w-3 h-3" />, action: () => exportActivitiesCsv(bookedActivities), disabled: bookedActivities.length === 0, count: bookedActivities.length },
                  { label: "Lebensmittel", icon: <UtensilsCrossed className="w-3 h-3" />, action: () => exportFoodDatabaseCsv(), disabled: foodDatabase.length === 0, count: foodDatabase.length },
                  { label: "Bilanz", icon: <Upload className="w-3 h-3" />, action: () => exportCalorieBalanceCsv(entries, bookedActivities), disabled: entries.length === 0, count: new Set(entries.map(e => e.date)).size },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    disabled={item.disabled}
                    className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg bg-background border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {item.icon}
                    <span className="text-[9px] font-semibold">{item.label}</span>
                    <span className="text-[8px] text-muted-foreground">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* DELETE Section */}
            <div className="rounded-lg border border-border bg-accent/20 p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Löschen</h3>
              </div>

              {/* Date range delete */}
              <div className="rounded-lg bg-background border border-border p-2 space-y-1.5">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Zeitraum</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Von TT.MM.JJ"
                    value={fromDate}
                    onChange={(e) => {
                      const v = formatDateInput(e.target.value);
                      setFromDate(v);
                      setDeletePreview(null);
                      setDeleteConfirmed(false);
                      if (v.length >= 8) deleteToRef.current?.focus();
                    }}
                    className="h-8 text-xs"
                  />
                  <Input
                    ref={deleteToRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="Bis TT.MM.JJ"
                    value={toDate}
                    onChange={(e) => {
                      const v = formatDateInput(e.target.value);
                      setToDate(v);
                      setDeletePreview(null);
                      setDeleteConfirmed(false);
                      if (v.length >= 8) deletePreviewBtnRef.current?.focus();
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                {deletePreview !== null && !deleteConfirmed && (
                  <p className="text-xs text-destructive font-medium">{deletePreview} Einträge werden gelöscht.</p>
                )}
                {deleteConfirmed && (
                  <p className="text-xs text-primary font-medium">✓ Gelöscht!</p>
                )}
                {deletePreview === null ? (
                  <Button ref={deletePreviewBtnRef} variant="secondary" size="sm" onClick={handleDeletePreview} disabled={!fromDate || !toDate || fromDate.length < 6 || toDate.length < 6} className="w-full h-8 text-xs">
                    Vorschau
                  </Button>
                ) : !deleteConfirmed && !showDeleteRangeConfirm ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowDeleteRangeConfirm(true)} disabled={deletePreview === 0} className="flex-1 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                      {deletePreview} Einträge löschen
                    </Button>
                    <Button variant="secondary" size="sm" autoFocus onClick={() => { setDeletePreview(null); setFromDate(""); setToDate(""); }} className="flex-1 h-8 text-xs ring-2 ring-primary">
                      Abbruch
                    </Button>
                  </div>
                ) : !deleteConfirmed && showDeleteRangeConfirm ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { handleDeleteConfirm(); setShowDeleteRangeConfirm(false); }} className="flex-1 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                      Löschen
                    </Button>
                    <Button variant="secondary" size="sm" autoFocus onClick={() => setShowDeleteRangeConfirm(false)} className="flex-1 h-8 text-xs ring-2 ring-primary">
                      Abbruch
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* Quick delete buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                {!showDeleteAllConfirm && !showDeleteFoodConfirm && !showDeleteActivitiesConfirm ? (
                  <>
                    <button
                      onClick={() => setShowDeleteAllConfirm(true)}
                      disabled={entries.length === 0}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-background border border-border hover:border-destructive/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="text-[9px] font-semibold text-destructive">Einträge</span>
                      <span className="text-[8px] text-muted-foreground">({entries.length})</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteActivitiesConfirm(true)}
                      disabled={bookedActivities.length === 0}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-background border border-border hover:border-destructive/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="text-[9px] font-semibold text-destructive">Aktivitäten</span>
                      <span className="text-[8px] text-muted-foreground">({bookedActivities.length})</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteFoodConfirm(true)}
                      disabled={foodDatabase.length === 0}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-background border border-border hover:border-destructive/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <span className="text-[9px] font-semibold text-destructive">Lebensmittel</span>
                      <span className="text-[8px] text-muted-foreground">({foodDatabase.length})</span>
                    </button>
                  </>
                ) : showDeleteAllConfirm ? (
                  <div className="col-span-3 rounded-lg border-2 border-destructive p-2.5 space-y-2">
                    <p className="text-xs font-semibold text-destructive">
                      Wirklich alle {entries.length} Einträge löschen?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleDeleteAll} className="flex-1 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        Löschen
                      </Button>
                      <Button variant="secondary" size="sm" autoFocus onClick={() => setShowDeleteAllConfirm(false)} className="flex-1 h-8 text-xs ring-2 ring-primary">
                        Abbruch
                      </Button>
                    </div>
                  </div>
                ) : showDeleteActivitiesConfirm ? (
                  <div className="col-span-3 rounded-lg border-2 border-destructive p-2.5 space-y-2">
                    <p className="text-xs font-semibold text-destructive">
                      Wirklich alle {bookedActivities.length} Aktivitäten löschen?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { const count = onDeleteAllActivities(); setShowDeleteActivitiesConfirm(false); toast.success(`${count} Aktivitäten gelöscht!`); }} className="flex-1 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        Löschen
                      </Button>
                      <Button variant="secondary" size="sm" autoFocus onClick={() => setShowDeleteActivitiesConfirm(false)} className="flex-1 h-8 text-xs ring-2 ring-primary">
                        Abbruch
                      </Button>
                    </div>
                  </div>
                ) : showDeleteFoodConfirm ? (
                  <div className="col-span-3 rounded-lg border-2 border-destructive p-2.5 space-y-2">
                    <p className="text-xs font-semibold text-destructive">
                      Wirklich alle {foodDatabase.length} Lebensmittel löschen?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleDeleteAllFood} className="flex-1 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                        Löschen
                      </Button>
                      <Button variant="secondary" size="sm" autoFocus onClick={() => setShowDeleteFoodConfirm(false)} className="flex-1 h-8 text-xs ring-2 ring-primary">
                        Abbruch
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
