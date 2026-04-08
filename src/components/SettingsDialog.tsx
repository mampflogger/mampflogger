import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Settings, Sun, Moon, Trash2, Upload, Download, UserCircle, Save, Check,
  AlertCircle, FileSpreadsheet, UtensilsCrossed, Palette, BarChart3, FileUp,
  ChevronLeft, ChevronRight, RefreshCw, List, Sparkles, Loader2, HardDrive, BookOpen, Search,
  X, Mic, HelpCircle, Ear, ArrowUp, ArrowDown,
} from "lucide-react";
import CookIcon from "@/components/CookIcon";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile, calculateBMR } from "@/types/profile";
import { NutritionEntry } from "@/types/nutrition";
import { foodDatabase, addFoodItem, removeFoodItem, updateFoodItem, clearFoodDatabase, reloadFoodDatabase, resetFoodDatabase, saveFoodDatabase, DEFAULT_FOODS, FoodItem, FoodVitamins, FoodMinerals, FoodDietaryFlags, DIETARY_FLAG_KEYS, DIETARY_FLAG_LABELS, FOOD_CATEGORIES, FoodCategory } from "@/data/foodDatabase";
import {
  exportEntriesToCsv, exportFoodDatabaseCsv, exportCalorieBalanceCsv, exportActivitiesCsv,
} from "@/lib/csvExport";

import { parseImportText } from "@/lib/importParser";
import { parseGermanSpokenNumber } from "@/lib/spokenNumbers";
import { BookedActivity } from "@/types/profile";
import { toast } from "sonner";
import { syncRemoteFoodDatabase, loadRemoteUrl } from "@/lib/remoteFoodSync";
import RecipeGenerator from "@/components/RecipeGenerator";
import RecipesTab from "@/components/RecipesTab";
import { CloudBackupSettings } from "@/components/CloudBackupSettings";
import VoiceControlOverlay from "@/components/VoiceControlOverlay";
import { collectManualBackupSnapshot, restoreManualBackupSnapshot } from "@/lib/cloudBackup";

type SettingsTab = "profile" | "design" | "food" | "recipes" | "data";

export type ColorTheme = "yellow" | "blue" | "pink" | "green" | "orange" | "teal" | "red" | "gray";

const THEME_COLORS: Record<ColorTheme, { label: string; primary: string; swatch: string }> = {
  yellow: { label: "Gelb", primary: "hsl(45, 80%, 50%)", swatch: "#d4a017" },
  blue: { label: "Blau", primary: "hsl(210, 70%, 50%)", swatch: "#2680c2" },
  pink: { label: "Pink", primary: "hsl(330, 60%, 55%)", swatch: "#c74882" },
  green: { label: "Grün", primary: "hsl(152, 55%, 42%)", swatch: "#3a9d6a" },
  orange: { label: "Orange", primary: "hsl(25, 95%, 53%)", swatch: "#f06820" },
  teal: { label: "Türkis", primary: "hsl(180, 65%, 42%)", swatch: "#25a1a1" },
  red: { label: "Rot", primary: "hsl(0, 75%, 50%)", swatch: "#df2020" },
  gray: { label: "Grau", primary: "hsl(220, 10%, 45%)", swatch: "#6b7280" },
};

interface SettingsDialogProps {
  profile: UserProfile | null;
  onSaveProfile: (profile: UserProfile) => void;
  onApplyTestData: (gender: "male" | "female") => void;
  onDeleteTestData: () => void;
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
  openToRecipes?: boolean;
  onOpenToRecipesHandled?: () => void;
  activeTab: "log" | "weekly";
  onSetActiveTab: (tab: "log" | "weekly") => void;
  initialOpen?: boolean;
  initialTab?: SettingsTab;
  selectedDate: string;
  onAddEntry: (entry: NutritionEntry) => void;
  recipeVoiceInputRef?: React.MutableRefObject<((transcript: string, isInterim: boolean) => void) | undefined>;
  voiceOpenTab?: string | null;
  onVoiceOpenTabHandled?: () => void;
  voiceCloseRequest?: boolean;
  onVoiceCloseHandled?: () => void;
  onOpenChange?: (open: boolean) => void;
  onTabChange?: (tab: SettingsTab) => void;
  isMicSupported?: boolean;
  isMicListening?: boolean;
  onMicToggle?: () => void;
  isAudioGuideEnabled?: boolean;
  onAudioGuideToggle?: () => void;
  onAudioGuideStop?: () => void;
  isAudioGuideSpeaking?: boolean;
  onPlaySettingsHelp?: (sectionId: string) => void;
  voiceAction?: string | null;
  onVoiceActionHandled?: () => void;
  highlightedTab?: boolean;
  profileVoiceInputRef?: React.MutableRefObject<((transcript: string, isInterim: boolean) => void) | undefined>;
  voiceControlVisible?: boolean;
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
  profile, onSaveProfile, onApplyTestData, onDeleteTestData, darkMode, onToggleDarkMode,
  colorTheme, onChangeTheme, entries, bookedActivities,
  onImport, onImportActivities, onCount, onDelete, onDeleteAll, onDeleteAllActivities, openToNewFood, onOpenToNewFoodHandled, openToRecipes, onOpenToRecipesHandled,
  activeTab, onSetActiveTab, initialOpen, initialTab, selectedDate, onAddEntry,
  recipeVoiceInputRef,
  voiceOpenTab, onVoiceOpenTabHandled,
  voiceCloseRequest, onVoiceCloseHandled,
  onOpenChange: onOpenChangeProp, onTabChange,
  isMicSupported, isMicListening, onMicToggle,
  isAudioGuideEnabled, onAudioGuideToggle, onAudioGuideStop, isAudioGuideSpeaking, onPlaySettingsHelp,
  voiceAction, onVoiceActionHandled,
  highlightedTab,
  profileVoiceInputRef,
  voiceControlVisible,
}: SettingsDialogProps) => {
  const [open, setOpen] = useState(initialOpen ?? false);
  const [tab, setTab] = useState<SettingsTab>(initialTab ?? "profile");

  useEffect(() => {
    if (initialOpen) {
      setOpen(true);
      onOpenChangeProp?.(true);
      if (initialTab) setTab(initialTab);
    }
  }, [initialOpen, initialTab, onOpenChangeProp]);

  // Profile state
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [goalFluidMl, setGoalFluidMl] = useState("");
  const [goalDeficit, setGoalDeficit] = useState("");
  const [goalActivityBonus, setGoalActivityBonus] = useState("");
  const [goalWeightKg, setGoalWeightKg] = useState("");
  const [goalProteinG, setGoalProteinG] = useState("");
  const [goalFatG, setGoalFatG] = useState("");
  const [goalCarbsG, setGoalCarbsG] = useState("");
  const [goalFiberG, setGoalFiberG] = useState("");

  // Import state
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<NutritionEntry[] | null>(null);
  const [foodPreview, setFoodPreview] = useState<FoodItem[] | null>(null);
  const [activityPreview, setActivityPreview] = useState<BookedActivity[] | null>(null);
  const [balanceHint, setBalanceHint] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const backupInputRef = React.useRef<HTMLInputElement>(null);
  const deleteToRef = React.useRef<HTMLInputElement>(null);
  const deletePreviewBtnRef = React.useRef<HTMLButtonElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const foodNameInputRef = React.useRef<HTMLInputElement>(null);

  // Delete state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deletePreview, setDeletePreview] = useState<number | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteFoodConfirm, setShowDeleteFoodConfirm] = useState(false);
  const [showDeleteRangeConfirm, setShowDeleteRangeConfirm] = useState(false);
  const [showDeleteActivitiesConfirm, setShowDeleteActivitiesConfirm] = useState(false);
  const [showResetFoodConfirm, setShowResetFoodConfirm] = useState(false);
  const [showResetMicroConfirm, setShowResetMicroConfirm] = useState(false);
  const [showTestDataConfirm, setShowTestDataConfirm] = useState(false);
  const [showDeleteTestDataConfirm, setShowDeleteTestDataConfirm] = useState(false);

  // Food list state
  type FoodSortKey = "name" | "calories" | "protein" | "fat" | "carbs" | "fiber" | "gi";
  type FoodSortDir = "asc" | "desc";
  const [foodSortKey, setFoodSortKey] = useState<FoodSortKey>("name");
  const [foodSortDir, setFoodSortDir] = useState<FoodSortDir>("asc");
  const [foodSearch, setFoodSearch] = useState("");
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editFoodName, setEditFoodName] = useState("");
  const [editFoodUnit, setEditFoodUnit] = useState("");
  const [editFoodCal, setEditFoodCal] = useState("");
  const [editFoodPro, setEditFoodPro] = useState("");
  const [editFoodFat, setEditFoodFat] = useState("");
  const [editFoodKh, setEditFoodKh] = useState("");
  const [editFoodFib, setEditFoodFib] = useState("");
  const [editFoodGi, setEditFoodGi] = useState("");
  const [editFoodDefault, setEditFoodDefault] = useState("");
   const [editFoodLiquid, setEditFoodLiquid] = useState("");
   const [editFoodCategory, setEditFoodCategory] = useState<FoodCategory | "">("");
   const [editFoodNotes, setEditFoodNotes] = useState("");
  const [editVitamins, setEditVitamins] = useState<FoodVitamins>({});
  const [editMinerals, setEditMinerals] = useState<FoodMinerals>({});
  const [editDietary, setEditDietary] = useState<FoodDietaryFlags>({});
  
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [, forceUpdate] = useState(0);
  const [foodNavIndex, setFoodNavIndex] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedDietaryFilters, setSelectedDietaryFilters] = useState<Set<keyof FoodDietaryFlags>>(new Set());
  const [selectedRecipeFoods, setSelectedRecipeFoods] = useState<FoodItem[]>([]);
  const [batchEnriching, setBatchEnriching] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");

  const foodSearchRef = React.useRef<HTMLInputElement>(null);
  const [recipeVoiceIndex, setRecipeVoiceIndex] = useState<number | null>(null);
  const [highlightedSettingsTab, setHighlightedSettingsTab] = useState<string | null>(null);
  const highlightSettingsTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const [highlightedSettingsSection, setHighlightedSettingsSection] = useState<string | null>(null);
  const [activeSettingsSection, setActiveSettingsSection] = useState<string | null>(null);
  const highlightSettingsSectionTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Keep active settings section heading colored
  useEffect(() => {
    const container = document.querySelector('[role="dialog"]');
    if (!container) return;
    container.querySelectorAll<HTMLElement>("[id^='section-']").forEach((el) => {
      if (el.id === activeSettingsSection) {
        el.setAttribute("data-section-active", "true");
      } else {
        el.removeAttribute("data-section-active");
      }
    });
  }, [activeSettingsSection]);

  // Track active section on click/focus within settings
  useEffect(() => {
    const handler = (e: Event) => {
      const el = e.target as HTMLElement;
      // Only handle events within the settings dialog
      if (!el?.closest?.('[role="dialog"]')) return;
      const target = el.closest?.("[id^='section-']") as HTMLElement | null;
      if (target?.id) setActiveSettingsSection(target.id);
    };
    document.addEventListener("focusin", handler, true);
    document.addEventListener("click", handler, true);
    return () => {
      document.removeEventListener("focusin", handler, true);
      document.removeEventListener("click", handler, true);
    };
  }, []);

  useEffect(() => {
    if (voiceOpenTab) {
      if (highlightSettingsTimerRef.current) clearTimeout(highlightSettingsTimerRef.current);
      setHighlightedSettingsTab(voiceOpenTab);
      highlightSettingsTimerRef.current = setTimeout(() => setHighlightedSettingsTab(null), 1500);
    }
  }, [voiceOpenTab]);

  // State for individual food delete confirmation
  const [foodToDelete, setFoodToDelete] = useState<string | null>(null);

  // Handle voice actions within settings
  useEffect(() => {
    if (!voiceAction) return;
    if (voiceAction === "profil-speichern") {
      const btn = document.getElementById("settings-save") as HTMLButtonElement;
      btn?.click();
    } else if (voiceAction === "new-food") {
      setTab("food");
      setTimeout(() => handleNewFood(), 100);
    } else if (voiceAction === "food-clear-search") {
      setTab("food");
      setEditingFood(null);
      setFoodSearch("");
      setTimeout(() => foodSearchRef.current?.focus(), 100);
    } else if (voiceAction === "food-search") {
      setTab("food");
      setTimeout(() => foodSearchRef.current?.focus(), 100);
    } else if (voiceAction.startsWith("food-search-text:")) {
      const text = voiceAction.replace("food-search-text:", "");
      setTab("food");
      setEditingFood(null);
      setFoodSearch(text);
      setTimeout(() => foodSearchRef.current?.focus(), 100);
    } else if (voiceAction === "recipe-search") {
      setOpen(true);
      onOpenChangeProp?.(true);
      setTab("recipes");
      onTabChange?.("recipes");
      setTimeout(() => window.dispatchEvent(new Event("mampflogger:focus-recipe-search")), 150);
    } else if (voiceAction === "new-recipe") {
      setOpen(true);
      onOpenChangeProp?.(true);
      setTab("recipes");
      onTabChange?.("recipes");
      setTimeout(() => window.dispatchEvent(new Event("mampflogger:open-new-recipe")), 150);
    } else if (voiceAction === "recipe-photo") {
      setOpen(true);
      onOpenChangeProp?.(true);
      setTab("recipes");
      onTabChange?.("recipes");
      setTimeout(() => window.dispatchEvent(new Event("mampflogger:open-recipe-photo")), 150);
    } else if (voiceAction === "open-dropdown") {
      // Open category dropdown in food editor
      if (tab === "food" && editingFood) {
        setShowCategoryDropdown(true);
      }
    } else if (voiceAction === "close-dropdown") {
      // Close category dropdown
      if (showCategoryDropdown) {
        setShowCategoryDropdown(false);
      }
    } else if (voiceAction === "food-save") {
      if (tab === "food" && editingFood) {
        handleSaveFood();
      }
    } else if (voiceAction === "food-next") {
      if (tab === "food" && editingFood) {
        handleSaveFood();
        handleNewFood();
      }
    } else if (voiceAction === "food-back") {
      if (tab === "food") {
        setEditingFood(null);
        setFoodNavIndex(null);
      }
    } else if (voiceAction === "food-ai-lookup") {
      if (tab === "food" && editingFood && editFoodName.trim()) {
        handleAiLookup();
      }
    } else if (voiceAction === "rezept-speichern") {
      // Click the save button inside the manual recipe form
      const btn = document.querySelector('[data-voice-scope="manual-recipe"] button[data-voice-action="save"]') as HTMLButtonElement;
      btn?.click();
    } else if (voiceAction === "backup-create") {
      setTab("data");
      setTimeout(() => {
        const btn = document.getElementById("backup-create-btn") as HTMLButtonElement;
        btn?.click();
      }, 100);
    } else if (voiceAction === "backup-load") {
      setTab("data");
      setTimeout(() => {
        // Scroll to backup section and highlight the load button
        const backupSection = document.getElementById("section-backup");
        backupSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveSettingsSection("section-backup");
        setHighlightedSettingsSection("section-backup");
        if (highlightSettingsSectionTimerRef.current) clearTimeout(highlightSettingsSectionTimerRef.current);
        highlightSettingsSectionTimerRef.current = setTimeout(() => setHighlightedSettingsSection(null), 3000);
        // Try programmatic click – may be blocked by browser security
        const clicked = backupInputRef.current;
        if (clicked) {
          try { clicked.click(); } catch { /* ignored */ }
        }
        // Always show a toast as fallback since browsers often block programmatic file dialogs from non-user-gesture contexts
        toast("📂 Bitte tippe auf 'Laden', um eine Backup-Datei auszuwählen.", { duration: 4000 });
      }, 200);
    } else if (voiceAction.startsWith("category:")) {
      const cat = voiceAction.replace("category:", "");
      if (cat === "alle") {
        setSelectedCategories(new Set());
        setSelectedAnimal(null);
      } else {
        setSelectedCategories(prev => {
          const next = new Set(prev);
          if (next.has(cat)) next.delete(cat);
          else next.add(cat);
          return next;
        });
      }
    } else if (voiceAction.startsWith("filter:")) {
      const key = voiceAction.replace("filter:", "") as keyof FoodDietaryFlags;
      setSelectedDietaryFilters(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    } else if (voiceAction.startsWith("food-item:")) {
      const idx = parseInt(voiceAction.replace("food-item:", ""), 10);
      if (idx >= 0 && idx < filteredFoods.length) {
        handleEditFood(filteredFoods[idx], idx);
      } else if (filteredFoods.length > 0) {
        toast.error(`Nur ${filteredFoods.length} Einträge sichtbar.`);
      }
    } else if (voiceAction.startsWith("recipe-food:")) {
      const idx = parseInt(voiceAction.replace("recipe-food:", ""), 10);
      if (idx >= 0 && idx < filteredFoods.length) {
        toggleRecipeFood(filteredFoods[idx]);
      } else if (filteredFoods.length > 0) {
        toast.error(`Nur ${filteredFoods.length} Hilfsmittel sichtbar.`);
      }
    } else if (voiceAction.startsWith("food-category-option:")) {
      const idx = parseInt(voiceAction.replace("food-category-option:", ""), 10);
      if (!showCategoryDropdown) {
        toast.info("Öffne zuerst das Kategorie-Dropdown.");
      } else if (idx >= 0 && idx < FOOD_CATEGORIES.length) {
        setEditFoodCategory(FOOD_CATEGORIES[idx]);
        setShowCategoryDropdown(false);
      } else {
        toast.error(`Nur ${FOOD_CATEGORIES.length} Kategorien verfügbar.`);
      }
    } else if (voiceAction.startsWith("scroll:")) {
      const id = voiceAction.replace("scroll:", "");
      setHighlightedSettingsTab(null); // clear tab highlight
      setHighlightedSettingsSection(id);
      setActiveSettingsSection(id);
      if (highlightSettingsSectionTimerRef.current) clearTimeout(highlightSettingsSectionTimerRef.current);
      highlightSettingsSectionTimerRef.current = setTimeout(() => setHighlightedSettingsSection(null), 3000);
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        // Focus first input of the target section
        if (id === "section-persoenliche-daten") {
          setTimeout(() => nameInputRef.current?.focus(), 400);
        } else if (id === "section-ziele") {
          setTimeout(() => (document.getElementById("settings-goalweight") as HTMLInputElement)?.focus(), 400);
        }
      }, 200);
    } else if (voiceAction.startsWith("recipe:")) {
      const idx = parseInt(voiceAction.replace("recipe:", ""), 10);
      if (!isNaN(idx)) setRecipeVoiceIndex(idx);
    } else if (voiceAction.startsWith("switch-tab:")) {
      const newTab = voiceAction.replace("switch-tab:", "") as SettingsTab;
      setTab(newTab);
      onTabChange?.(newTab);
    }
    onVoiceActionHandled?.();
  }, [voiceAction, showCategoryDropdown, onVoiceActionHandled]);

  // Focus on search field when food tab becomes active
  useEffect(() => {
    if (tab === "food" && open) {
      setTimeout(() => foodSearchRef.current?.focus(), 50);
    }
  }, [tab, open]);

  // Handle external "New Food" trigger
  useEffect(() => {
    if (openToNewFood) {
      setOpen(true);
      setTab("food");
      handleNewFood();
      onOpenToNewFoodHandled?.();
    }
  }, [openToNewFood]);

  // Handle external "Recipes" trigger
  useEffect(() => {
    if (openToRecipes) {
      setOpen(true);
      setTab("recipes");
      onOpenToRecipesHandled?.();
    }
  }, [openToRecipes]);

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
    setEditFoodGi("");
    setEditFoodDefault("");
     setEditFoodLiquid("");
     setEditFoodCategory("");
     setEditFoodNotes("");
    setEditVitamins({});
    setEditMinerals({});
    setEditDietary({});
    setTimeout(() => foodNameInputRef.current?.focus(), 0);
  };

  const parseDietaryFlagValue = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
      return undefined;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toUpperCase();
      if (["J", "Y", "YES", "TRUE", "1"].includes(normalized)) return true;
      if (["N", "NO", "FALSE", "0"].includes(normalized)) return false;
    }
    return undefined;
  };

  // Determine which enrichable fields are missing for a food item
  const getMissingFields = (food: FoodItem): string[] => {
    const missing: string[] = [];
    // Dietary flags
    const dietaryKeys = ["vgn", "vgt", "lc", "hp", "ket", "gf", "lf", "zf"] as const;
    for (const k of dietaryKeys) {
      const current = food.dietary?.[k];
      if (typeof current !== "boolean") missing.push(k);
    }
    // GI
    if (food.gi === undefined || food.gi === null) missing.push("gi");
    // Category
    if (!food.category) missing.push("category");
    // Notes
    if (!food.notes) missing.push("notes");
    // Vitamins
    const vitKeys = ["vitA", "vitB1", "vitB2", "vitB3", "vitB5", "vitB6", "vitB7", "vitB9", "vitB12", "vitC", "vitD", "vitE", "vitK"] as const;
    for (const k of vitKeys) {
      if (food.vitamins?.[k] == null) missing.push(k);
    }
    // Minerals
    const minKeys = ["calcium", "chlorid", "eisen", "fluorid", "kalium", "kupfer", "magnesium", "mangan", "natrium", "phosphor", "schwefel", "zink"] as const;
    for (const k of minKeys) {
      if (food.minerals?.[k] == null) missing.push(k);
    }
    return missing;
  };

  // Batch enrichment: only fill missing fields
  const handleBatchDietary = async () => {
    setBatchEnriching(true);
    setBatchProgress("Prüfe Lebensmittel...");
    try {
      // Find foods with missing fields
      const initialFoodsWithGaps: { food: FoodItem; missing: string[] }[] = [];
      for (const food of foodDatabase) {
        const missing = getMissingFields(food);
        if (missing.length > 0) {
          initialFoodsWithGaps.push({ food, missing });
        }
      }

      if (initialFoodsWithGaps.length === 0) {
        setBatchProgress("Alle Lebensmittel sind vollständig!");
        toast.success("Alle Lebensmittel sind bereits vollständig ausgefüllt!");
        return;
      }

      const BATCH_SIZE = 25;
      const MAX_PASSES = 2;
      const changedFoods = new Set<string>();
      let pending = initialFoodsWithGaps;

      setBatchProgress(`${pending.length} Lebensmittel mit Lücken gefunden...`);

      for (let pass = 1; pass <= MAX_PASSES && pending.length > 0; pass++) {
        const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

        for (let start = 0; start < pending.length; start += BATCH_SIZE) {
          const batch = pending.slice(start, start + BATCH_SIZE);
          const batchNum = Math.floor(start / BATCH_SIZE) + 1;
          setBatchProgress(
            `Durchlauf ${pass}/${MAX_PASSES} – Batch ${batchNum}/${totalBatches} (${Math.min(start + BATCH_SIZE, pending.length)}/${pending.length})`
          );

          const foods = batch.map(({ food, missing }) => ({
            name: food.name,
            calories: food.calories,
            protein: food.protein,
            fat: food.fat,
            carbs: food.carbs,
            fiber: food.fiber,
            category: food.category || "",
            missingFields: missing,
          }));

          const { data, error } = await supabase.functions.invoke("food-batch-dietary", {
            body: { foods },
          });

          if (error || !data?.success) {
            console.error("Batch error at", start, error, data);
            toast.error(`Fehler bei Batch ${batchNum}`);
            continue;
          }

          // Apply results – only write back fields that were missing
          for (const r of Array.isArray(data.results) ? data.results : []) {
            const entry = batch[r.i];
            if (!entry) continue;

            const { food, missing } = entry;
            const missingSet = new Set(missing);
            let changed = false;

            // Dietary flags
            const dietaryKeys = ["vgn", "vgt", "lc", "hp", "ket", "gf", "lf", "zf"] as const;
            for (const k of dietaryKeys) {
              if (!missingSet.has(k)) continue;
              const parsedFlag = parseDietaryFlagValue((r as Record<string, unknown>)[k]);
              if (parsedFlag === undefined) continue;
              if (!food.dietary) food.dietary = {};
              (food.dietary as any)[k] = parsedFlag;
              changed = true;
            }

            // GI
            if (missingSet.has("gi") && (r as Record<string, unknown>).gi !== undefined) {
              const rawGi = (r as Record<string, unknown>).gi;
              const parsedGi = typeof rawGi === "number" ? rawGi : parseInt(String(rawGi), 10);
              if (!isNaN(parsedGi)) {
                food.gi = parsedGi;
                changed = true;
              }
            }

            // Category
            if (missingSet.has("category") && typeof r.category === "string" && r.category) {
              food.category = r.category as FoodCategory;
              changed = true;
            }

            // Notes
            if (missingSet.has("notes") && typeof r.notes === "string" && r.notes.trim()) {
              food.notes = r.notes.trim();
              changed = true;
            }

            // Vitamins
            const vitKeys = ["vitA", "vitB1", "vitB2", "vitB3", "vitB5", "vitB6", "vitB7", "vitB9", "vitB12", "vitC", "vitD", "vitE", "vitK"] as const;
            for (const k of vitKeys) {
              if (!missingSet.has(k)) continue;
              const rawVal = (r as Record<string, unknown>)[k];
              if (rawVal === undefined) continue;
              if (!food.vitamins) food.vitamins = {};
              const val = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));
              if (!isNaN(val)) {
                (food.vitamins as any)[k] = val;
                changed = true;
              }
            }

            // Minerals
            const minKeys = ["calcium", "chlorid", "eisen", "fluorid", "kalium", "kupfer", "magnesium", "mangan", "natrium", "phosphor", "schwefel", "zink"] as const;
            for (const k of minKeys) {
              if (!missingSet.has(k)) continue;
              const rawVal = (r as Record<string, unknown>)[k];
              if (rawVal === undefined) continue;
              if (!food.minerals) food.minerals = {};
              const val = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));
              if (!isNaN(val)) {
                (food.minerals as any)[k] = val;
                changed = true;
              }
            }

            if (changed) {
              changedFoods.add(food.name.toLowerCase());
            }
          }

          // Small delay to avoid rate limiting
          if (start + BATCH_SIZE < pending.length) {
            await new Promise((res) => setTimeout(res, 2000));
          }
        }

        pending = pending
          .map(({ food }) => ({ food, missing: getMissingFields(food) }))
          .filter(({ missing }) => missing.length > 0);

        if (pending.length > 0 && pass < MAX_PASSES) {
          setBatchProgress(`Durchlauf ${pass} abgeschlossen – ${pending.length} Lebensmittel werden erneut geprüft...`);
        }
      }

      saveFoodDatabase(foodDatabase);
      forceUpdate((n) => n + 1);

      const changedCount = changedFoods.size;
      if (pending.length > 0) {
        setBatchProgress(`Teilweise fertig: ${changedCount} Lebensmittel ergänzt, ${pending.length} haben noch Lücken.`);
        toast.success(`${changedCount} Lebensmittel ergänzt. ${pending.length} haben noch offene Felder.`);
      } else {
        setBatchProgress(`Fertig! ${changedCount} Lebensmittel ergänzt.`);
        toast.success(`${changedCount} Lebensmittel mit fehlenden Details ergänzt!`);
      }
    } catch (e) {
      console.error("Batch enrichment error:", e);
      toast.error("Fehler bei der Aktualisierung");
    } finally {
      setBatchEnriching(false);
    }
  };

  const handleAiLookup = async () => {
    const query = editFoodName.trim();
    if (!query) {
      toast.error("Bitte zuerst einen Lebensmittel-Namen eingeben.");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("food-lookup", {
        body: { foodName: query },
      });
      if (error) throw new Error(error.message);
      if (!data?.success || !data?.data) throw new Error(data?.error || "Keine Daten erhalten");
      const n = data.data;
      setEditFoodName(n.name || query);
      setEditFoodCal(String(n.calories ?? ""));
      setEditFoodPro(String(n.protein ?? ""));
      setEditFoodFat(String(n.fat ?? ""));
      setEditFoodKh(String(n.carbs ?? ""));
      setEditFoodFib(String(n.fiber ?? ""));
      setEditFoodGi(n.gi !== undefined && n.gi !== null ? String(n.gi) : "");
       setEditFoodLiquid(n.liquidMl && n.liquidMl > 0 ? String(n.liquidMl) : "");
       setEditFoodNotes(n.notes || "");
       const validCategory = (FOOD_CATEGORIES as readonly string[]).includes(n.category) ? n.category as FoodCategory : "Eigene";
      setEditFoodCategory(validCategory);
      if (!editFoodDefault) setEditFoodDefault(n.defaultAmount ? String(n.defaultAmount) : "");
      if (n.vitamins) setEditVitamins(n.vitamins);
      if (n.minerals) setEditMinerals(n.minerals);
      if (n.dietary) setEditDietary(n.dietary);
      toast.success("KI-Werte übernommen – bitte prüfen & speichern!");
    } catch (err: any) {
      console.error("AI lookup error:", err);
      toast.error(err?.message || "KI-Abfrage fehlgeschlagen");
    } finally {
      setAiLoading(false);
    }
  };

  const resetProfileForm = () => {
    setName("");
    setBirthYear("");
    setHeightCm("");
    setWeightKg("");
    setGender("male");
    setGoalFluidMl("");
    setGoalDeficit("");
    setGoalActivityBonus("");
    setGoalWeightKg("");
    setGoalProteinG("");
    setGoalFatG("");
    setGoalCarbsG("");
    setGoalFiberG("");
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChangeProp?.(isOpen);
    if (isOpen) {
      if (profile) {
        setName(profile.name);
        setBirthYear(String(profile.birthYear));
        setHeightCm(String(profile.heightCm));
        setWeightKg(String(profile.weightKg));
        setGender(profile.gender);
        setGoalFluidMl(profile.goalFluidMl ? String(profile.goalFluidMl) : "");
        setGoalDeficit(profile.goalDeficit ? String(profile.goalDeficit) : "");
        setGoalActivityBonus(profile.goalActivityBonus ? String(profile.goalActivityBonus) : "");
        setGoalWeightKg(profile.goalWeightKg ? String(profile.goalWeightKg) : "");
        setGoalProteinG(profile.goalProteinG ? String(profile.goalProteinG) : "");
        setGoalFatG(profile.goalFatG ? String(profile.goalFatG) : "");
        setGoalCarbsG(profile.goalCarbsG ? String(profile.goalCarbsG) : "");
        setGoalFiberG(profile.goalFiberG ? String(profile.goalFiberG) : "");
      } else {
        resetProfileForm();
      }
    }
    if (!isOpen) {
      setEditingFood(null);
      
      setShowCategoryDropdown(false);
      setImportType(null);
      setRawText("");
      setPreview(null);
      setFoodPreview(null);
      setActivityPreview(null);
      setBalanceHint(false);
      setSelectedRecipeFoods([]);
    }
  };

  // Handle tab changes and notify parent
  const handleTabChange = (newTab: SettingsTab) => {
    setTab(newTab);
    onTabChange?.(newTab);
    // Highlight the main section heading when switching to a tab
    if (newTab === "food") {
      setHighlightedSettingsSection("section-lebensmittelliste");
      setActiveSettingsSection("section-lebensmittelliste");
      if (highlightSettingsSectionTimerRef.current) clearTimeout(highlightSettingsSectionTimerRef.current);
      highlightSettingsSectionTimerRef.current = setTimeout(() => setHighlightedSettingsSection(null), 3000);
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
          goalWeightKg: goalWeightKg ? parseFloat(goalWeightKg) : undefined,
          goalProteinG: goalProteinG ? parseInt(goalProteinG) : undefined,
          goalFatG: goalFatG ? parseInt(goalFatG) : undefined,
          goalCarbsG: goalCarbsG ? parseInt(goalCarbsG) : undefined,
          goalFiberG: goalFiberG ? parseInt(goalFiberG) : undefined,
        }
      : null;

  const bmrPreview = currentProfile ? calculateBMR(currentProfile) : null;

  const profileFieldOrder = [
    "settings-name", "settings-birth", "settings-height", "settings-weight",
    "settings-goalweight", "settings-fluid", "settings-deficit", "settings-activity",
    "settings-goalpro", "settings-goalfat", "settings-goalkh", "settings-goalfib",
    "settings-save",
  ];

  const advanceProfileFocus = (currentId: string) => {
    const idx = profileFieldOrder.indexOf(currentId);
    if (idx < 0 || idx >= profileFieldOrder.length - 1) return;
    const next = document.getElementById(profileFieldOrder[idx + 1]);
    next?.focus();
  };

  const retreatProfileFocus = (currentId: string) => {
    const idx = profileFieldOrder.indexOf(currentId);
    if (idx <= 0) return;
    const prev = document.getElementById(profileFieldOrder[idx - 1]);
    prev?.focus();
  };

  const handleProfileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      advanceProfileFocus(id);
    }
  };

  // Voice input handler for profile fields
  const handleProfileVoiceInput = useCallback((transcript: string, isInterim: boolean) => {
    if (isInterim) return;
    const lower = transcript.toLowerCase().trim();

    // "OK" / "ja" / "okay" → save
    if (/^(ok|okay|ja|speichern|profil speichern)$/i.test(lower)) {
      const btn = document.getElementById("settings-save") as HTMLButtonElement;
      btn?.click();
      return;
    }

    // Determine which field is focused
    const active = document.activeElement as HTMLInputElement | null;
    if (!active) return;
    const fieldId = active.id;
    if (!profileFieldOrder.includes(fieldId)) return;

    // "Männlich" / "Weiblich" → gender toggle (works from any profile field)
    if (/\bmännlich\b|\bmaennlich\b|\bmale\b/i.test(lower)) { setGender("male"); return; }
    if (/\bweiblich\b|\bfemale\b/i.test(lower)) { setGender("female"); return; }

    if (fieldId === "settings-name") {
      // For name field: use the spoken text directly
      const cleaned = transcript.trim();
      if (cleaned) {
        // Capitalize first letter
        const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        setName(capitalized);
        setTimeout(() => advanceProfileFocus(fieldId), 300);
      }
      return;
    }

    // Numeric fields: parse spoken number
    const num = parseGermanSpokenNumber(lower);
    const directNum = parseFloat(transcript.replace(",", "."));
    const value = num ?? (isNaN(directNum) ? null : directNum);
    if (value === null) return;

    const setters: Record<string, (v: string) => void> = {
      "settings-birth": setBirthYear,
      "settings-height": setHeightCm,
      "settings-weight": setWeightKg,
      "settings-goalweight": setGoalWeightKg,
      "settings-fluid": setGoalFluidMl,
      "settings-deficit": setGoalDeficit,
      "settings-activity": setGoalActivityBonus,
      "settings-goalpro": setGoalProteinG,
      "settings-goalfat": setGoalFatG,
      "settings-goalkh": setGoalCarbsG,
      "settings-goalfib": setGoalFiberG,
    };

    const setter = setters[fieldId];
    if (setter) {
      // For decimal fields, preserve one decimal place
      const isDecimal = fieldId === "settings-weight" || fieldId === "settings-goalweight";
      setter(isDecimal ? String(value) : String(Math.round(value)));
      setTimeout(() => advanceProfileFocus(fieldId), 500);
    }
  }, []);

  // Register profile voice input handler
  useEffect(() => {
    if (!profileVoiceInputRef) return;
    profileVoiceInputRef.current = handleProfileVoiceInput;
    return () => {
      if (profileVoiceInputRef) profileVoiceInputRef.current = undefined;
    };
  }, [profileVoiceInputRef, handleProfileVoiceInput]);

  // Listen for field commands (weiter/zurück) when profile tab is active
  useEffect(() => {
    if (!open || tab !== "profile") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.scope !== "profile") return;
      const active = document.activeElement as HTMLElement | null;
      const fieldId = active?.id || "";
      if (detail.action === "field:next") advanceProfileFocus(fieldId);
      else if (detail.action === "field:prev") retreatProfileFocus(fieldId);
      else if (detail.action === "field:clear") {
        if (active && "value" in active) {
          const input = active as HTMLInputElement;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          nativeInputValueSetter?.call(input, "");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          // Also update React state
          const setters: Record<string, (v: string) => void> = {
            "settings-name": setName, "settings-birth": setBirthYear,
            "settings-height": setHeightCm, "settings-weight": setWeightKg,
            "settings-goalweight": setGoalWeightKg, "settings-fluid": setGoalFluidMl,
            "settings-deficit": setGoalDeficit, "settings-activity": setGoalActivityBonus,
            "settings-goalpro": setGoalProteinG, "settings-goalfat": setGoalFatG,
            "settings-goalkh": setGoalCarbsG, "settings-goalfib": setGoalFiberG,
          };
          setters[fieldId]?.("");
        }
      }
    };
    window.addEventListener("mampflogger:field-command", handler);
    return () => window.removeEventListener("mampflogger:field-command", handler);
  }, [open, tab]);

  const handleSaveProfile = () => {
    if (!currentProfile) return;
    onSaveProfile(currentProfile);
    toast.success("Profil gespeichert!");
  };

  const hasExistingTrackingData = entries.length > 0 || bookedActivities.length > 0;

  const applyTestData = () => {
    onApplyTestData(gender);
    setShowTestDataConfirm(false);
    handleOpen(false);
    onSetActiveTab("log");
    toast.success(`Testdaten für ${gender === "male" ? "männlich" : "weiblich"} eingespielt!`);
  };

  const clearTestData = () => {
    onDeleteTestData();
    resetProfileForm();
    setShowDeleteTestDataConfirm(false);
    handleTabChange("profile");
    setTimeout(() => nameInputRef.current?.focus(), 0);
    toast.success("Testdaten gelöscht – du kannst jetzt dein eigenes Profil anlegen.");
  };

  const handleTestDataClick = () => {
    if (hasExistingTrackingData) {
      setShowTestDataConfirm(true);
      return;
    }

    applyTestData();
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
    setEditFoodGi(food.gi !== undefined ? String(food.gi) : "");
    setEditFoodDefault(food.defaultAmount ? String(food.defaultAmount) : "");
     setEditFoodLiquid(food.liquidMl ? String(food.liquidMl) : "");
     setEditFoodCategory(food.category || "");
     setEditFoodNotes(food.notes || "");
    setEditVitamins(food.vitamins || {});
    setEditMinerals(food.minerals || {});
    setEditDietary(food.dietary || {});
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
    const hasLiquid = editFoodLiquid && parseFloat(editFoodLiquid) > 0;
    // Only include vitamins/minerals if they have at least one non-zero value
    const hasVitamins = Object.values(editVitamins).some(v => v !== undefined && v > 0);
    const hasMinerals = Object.values(editMinerals).some(v => v !== undefined && v > 0);
    const hasDietary = Object.values(editDietary).some(v => v !== undefined);
    const hasGi = editFoodGi && parseFloat(editFoodGi) >= 0;
    const updated: FoodItem = {
      name: editFoodName.trim(),
      baseUnit: hasLiquid ? "100ml" : "100g",
      baseAmount: 100,
      calories: parseFloat(editFoodCal) || 0,
      protein: parseFloat(editFoodPro) || 0,
      fat: parseFloat(editFoodFat) || 0,
      carbs: parseFloat(editFoodKh) || 0,
      fiber: parseFloat(editFoodFib) || 0,
      gi: hasGi ? parseFloat(editFoodGi) : undefined,
      defaultAmount: editFoodDefault ? parseFloat(editFoodDefault) || undefined : undefined,
       liquidMl: hasLiquid ? parseFloat(editFoodLiquid) || undefined : undefined,
       category: editFoodCategory || "Eigene",
       notes: editFoodNotes.trim() || undefined,
      vitamins: hasVitamins ? editVitamins : undefined,
      minerals: hasMinerals ? editMinerals : undefined,
      dietary: hasDietary ? editDietary : undefined,
    };
    updateFoodItem(editingFood.name, updated);
    const isNew = !editingFood.name;
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

  const handleDeleteAllFood = async () => {
    const count = clearFoodDatabase();
    // Sync-Cache löschen
    localStorage.removeItem("mampflogger-remote-sync");
    setShowDeleteFoodConfirm(false);
    forceUpdate((n) => n + 1);

    // Sofort neu syncen falls Remote-URL gesetzt
    const url = loadRemoteUrl();
    if (url) {
      toast.info("Lebensmittel gelöscht – Remote-Sync läuft...");
      const result = await syncRemoteFoodDatabase(url, true);
      reloadFoodDatabase();
      forceUpdate((n) => n + 1);
      if (result.error) {
        toast.error(`Sync fehlgeschlagen: ${result.error}`);
      } else {
        toast.success(`${count} Einträge gelöscht. ${result.added} Artikel aus Remote neu geladen.`);
      }
    } else {
      toast.success(`${count} Lebensmittel gelöscht.`);
    }
  };

  const handleRemoveFood = (foodName: string) => {
    removeFoodItem(foodName);
    forceUpdate((n) => n + 1);
  };

  const toggleRecipeFood = (food: FoodItem) => {
    setSelectedRecipeFoods((prev) => {
      const exists = prev.some((f) => f.name === food.name);
      if (exists) return prev.filter((f) => f.name !== food.name);
      if (prev.length >= 5) return prev;
      return [...prev, food];
    });
  };

  const isRecipeSelected = (name: string) => selectedRecipeFoods.some((f) => f.name === name);

  const filteredFoods = (() => {
    let list = foodSearch
      ? foodDatabase.filter((f) => f.name.toLowerCase().includes(foodSearch.toLowerCase()))
      : [...foodDatabase].sort((a, b) => a.name.localeCompare(b.name));
    if (selectedCategories.size > 0) {
      list = list.filter((f) => f.category && selectedCategories.has(f.category));
    }
    // Animal sub-filter for Fleisch&Wurst
    if (selectedAnimal && selectedCategories.has("Fleisch&Wurst")) {
      const animalKeywords: Record<string, string[]> = {
        "Rind": ["rind", "roastbeef", "sauerbraten"],
        "Schwein": ["schwein", "kasseler"],
        "Lamm": ["lamm"],
        "Kalb": ["kalb"],
        "Geflügel": ["hähn", "huhn", "pute", "ente", "gans", "suppenhuhn", "brathähnchen", "geflügel"],
        "Wild": ["reh", "hirsch", "wildschwein", "kaninchen"],
        "Wurst": ["wurst", "würst", "salami", "schinken", "speck", "lyoner", "mortadella", "landjäger", "cabanossi", "chorizo", "sucuk", "bierschinken", "fleischwurst", "jagdwurst", "mettwurst", "teewurst", "cervelat", "wiener", "weißwurst", "leberwurst", "blutwurst", "gelbwurst", "krakauer", "presssack", "paprikalyoner", "frühstücksfleisch", "frankfurter", "leberkäse", "bockwurst"],
      };
      const keywords = animalKeywords[selectedAnimal];
      if (keywords) {
        list = list.filter((f) => {
          const lower = f.name.toLowerCase();
          const matches = keywords.some(k => lower.includes(k));
          if (selectedAnimal === "Schwein" && lower.includes("wildschwein")) return false;
          return matches;
        });
      }
    }
    // Dietary filters
    if (selectedDietaryFilters.size > 0) {
      list = list.filter((f) => {
        if (!f.dietary) return false;
        for (const key of selectedDietaryFilters) {
          if (!f.dietary[key]) return false;
        }
        return true;
      });
    }
    return list;
  })();

  // Voice-triggered settings open
  useEffect(() => {
    if (voiceOpenTab) {
      setOpen(true);
      onOpenChangeProp?.(true);
      const newTab = voiceOpenTab as SettingsTab;
      setTab(newTab);
      onTabChange?.(newTab);
      onVoiceOpenTabHandled?.();
    }
  }, [voiceOpenTab]);

  // Voice-triggered settings close
  useEffect(() => {
    if (voiceCloseRequest && open) {
      handleOpen(false);
      onVoiceCloseHandled?.();
    } else if (voiceCloseRequest) {
      onVoiceCloseHandled?.();
    }
  }, [voiceCloseRequest]);

  const hasImportResults = (preview && preview.length > 0) || (foodPreview && foodPreview.length > 0) || (activityPreview && activityPreview.length > 0);
  const importResultCount = preview?.length || foodPreview?.length || activityPreview?.length || 0;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profil", icon: <UserCircle className="w-4 h-4" /> },
    { id: "design", label: "Design", icon: <Palette className="w-4 h-4" /> },
    { id: "food", label: "Lebensmittel", icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: "recipes", label: "Rezepte", icon: <BookOpen className="w-4 h-4" /> },
    { id: "data", label: "Daten", icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={`h-8 w-8 ${open ? "ring-2 ring-primary bg-muted" : ""} ${highlightedTab ? "section-card-highlight rounded-lg" : ""}`} title="Einstellungen">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        hideClose
        className="w-screen h-[100dvh] max-w-none max-h-[100dvh] rounded-none border-0 flex flex-col p-0 gap-0 data-[state=open]:animate-none data-[state=closed]:animate-none md:left-0 md:top-0 md:w-screen md:translate-x-0 md:translate-y-0 md:h-[100dvh] md:max-h-[100dvh] md:max-w-none md:p-0 md:rounded-none md:border-0"
        style={{
          '--tw-enter-scale': '1',
          '--tw-exit-scale': '1',
          '--tw-enter-translate-x': '0',
          '--tw-enter-translate-y': '0',
          '--tw-exit-translate-x': '0',
          '--tw-exit-translate-y': '0',
        } as React.CSSProperties}
      >
        {/* Identical header as main app */}
        <header className="shrink-0 sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-2 no-underline text-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="10" width="3" height="7" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                    <rect x="5" y="6" width="3" height="11" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                    <rect x="9" y="8" width="3" height="9" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                    <rect x="13" y="3" width="3" height="14" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold tracking-tight">MampfLogger</h1>
              </a>
              <div className="flex items-center gap-1">
                
                {isMicSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMicToggle}
                    className={`h-8 w-8 ${isMicListening ? "ring-2 ring-primary animate-pulse" : ""}`}
                    title={isMicListening ? "Mikrofon aus" : "Sprachsteuerung"}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${isAudioGuideSpeaking ? "ring-2 ring-primary animate-pulse" : ""}`}
                  onClick={() => {
                    if (isAudioGuideSpeaking) {
                      onAudioGuideStop?.();
                    } else {
                      // Find active settings section and play its help
                      if (activeSettingsSection) {
                        onPlaySettingsHelp?.(activeSettingsSection);
                      }
                    }
                  }}
                  title={isAudioGuideSpeaking ? "Audio-Hilfe stoppen" : "Audio-Hilfe abspielen"}
                >
                  <Ear className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Eingabe" onClick={() => { handleOpen(false); onSetActiveTab("log"); }}>
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Statistik" onClick={() => { handleOpen(false); onSetActiveTab("weekly"); }}>
                  <BarChart3 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className={`h-8 w-8 ring-2 ring-primary bg-muted ${highlightedTab ? "section-card-highlight rounded-lg" : ""}`} title="Einstellungen" onClick={() => handleOpen(false)}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Hilfe" onClick={() => handleOpen(false)}>
                  <span className="text-base font-bold">?</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Einstellungen</DialogTitle>
            <DialogDescription>Einstellungsmenü von MampfLogger</DialogDescription>
          </DialogHeader>
          <div className="max-w-lg mx-auto px-4 w-full pb-8">
            {/* Tab bar – sticky below header */}
            <div className="sticky top-0 z-[9] -mx-4 px-4 pt-3 pb-0 bg-background">
              <div className="glass-card rounded-xl p-3 mb-3">
                <div className="grid grid-cols-5 gap-1 h-10">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleTabChange(t.id)}
                      className={`h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] leading-none font-semibold transition-colors ${
                        tab === t.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      } ${highlightedSettingsTab === t.id ? "section-card-highlight" : ""}`}
                    >
                      {t.icon}
                      <span className="w-full truncate text-center">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div className="space-y-3" data-voice-scope="profile">
            {/* Profile Card */}
            <div id="section-persoenliche-daten" className={`glass-card rounded-xl p-3 space-y-2 ${highlightedSettingsSection === "section-persoenliche-daten" ? "section-card-highlight" : ""}`}>
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Persönliche Daten</h2>
              <div>
                <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Name</Label>
                <Input ref={nameInputRef} id="settings-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-name")} placeholder="Dein Name" className="h-8 text-sm" autoCorrect="off" spellCheck={false} autoFocus={initialOpen} />
              </div>
              <div>
                <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Geschlecht</Label>
                <div className="flex gap-2">
                  {(["male", "female"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`flex-1 py-1 rounded-full border text-xs font-semibold transition-colors ${
                        gender === g ? "bg-primary text-primary-foreground border-primary" : "bg-accent text-muted-foreground border-border hover:text-foreground"
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
                  <Input id="settings-birth" type="number" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-birth")} placeholder="1990" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Größe (cm)</Label>
                  <Input id="settings-height" type="number" inputMode="numeric" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-height")} placeholder="180" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Gewicht (kg)</Label>
                  <Input id="settings-weight" type="number" inputMode="decimal" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-weight")} placeholder="80.0" className="h-8 text-sm" />
                </div>
              </div>
              {currentProfile && bmrPreview && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-full border border-border bg-accent px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-medium">BMI</span>
                    <span className="text-base font-bold text-foreground">{(currentProfile.weightKg / ((currentProfile.heightCm / 100) ** 2)).toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">kg/m²</span></span>
                  </div>
                  <div className="col-span-2 rounded-full border border-border bg-accent px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-medium">Grundumsatz (BMR)</span>
                    <span className="text-base font-bold text-foreground">{bmrPreview} <span className="text-[10px] font-normal text-muted-foreground">kcal/Tag</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Goals Card */}
            <div id="section-ziele" className={`glass-card rounded-xl p-3 space-y-2 ${highlightedSettingsSection === "section-ziele" ? "section-card-highlight" : ""}`}>
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ziele</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Zielgewicht (kg)</Label>
                  <Input id="settings-goalweight" type="number" inputMode="decimal" step="0.1" value={goalWeightKg} onChange={(e) => setGoalWeightKg(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-goalweight")} placeholder="75.0" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Flüssigkeit pro Tag (ml)</Label>
                  <Input id="settings-fluid" type="number" inputMode="numeric" value={goalFluidMl} onChange={(e) => setGoalFluidMl(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-fluid")} placeholder="2500" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Defizit pro Tag (kcal)</Label>
                  <Input id="settings-deficit" type="number" inputMode="numeric" value={goalDeficit} onChange={(e) => setGoalDeficit(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-deficit")} placeholder="500" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Activity Bonus pro Tag (kcal)</Label>
                  <Input id="settings-activity" type="number" inputMode="numeric" value={goalActivityBonus} onChange={(e) => setGoalActivityBonus(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-activity")} placeholder="300" className="h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">PRO (g)</Label>
                  <Input id="settings-goalpro" type="number" inputMode="numeric" value={goalProteinG} onChange={(e) => setGoalProteinG(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-goalpro")} placeholder="120" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">FAT (g)</Label>
                  <Input id="settings-goalfat" type="number" inputMode="numeric" value={goalFatG} onChange={(e) => setGoalFatG(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-goalfat")} placeholder="70" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">KH (g)</Label>
                  <Input id="settings-goalkh" type="number" inputMode="numeric" value={goalCarbsG} onChange={(e) => setGoalCarbsG(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-goalkh")} placeholder="200" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">FIB (g)</Label>
                  <Input id="settings-goalfib" type="number" inputMode="numeric" value={goalFiberG} onChange={(e) => setGoalFiberG(e.target.value)} onKeyDown={(e) => handleProfileKeyDown(e, "settings-goalfib")} placeholder="30" className="h-8 text-sm" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button id="settings-save" onClick={handleSaveProfile} disabled={!currentProfile} className="w-full h-8 text-xs gap-2">
                <Save className="w-4 h-4" />
                Profil speichern
              </Button>
              <Button type="button" variant="outline" onClick={handleTestDataClick} className="w-full h-8 text-xs">
                Testdaten einspielen
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowDeleteTestDataConfirm(true)} className="w-full h-8 text-xs">
                Alle Daten löschen
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Nutzt das gewählte Geschlecht und spielt 14 Tage Demodaten ein.
              </p>
            </div>

            <AlertDialog open={showTestDataConfirm} onOpenChange={setShowTestDataConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eigene Daten überschreiben?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Durch das Einspielen der Testdaten werden dein Profil, Tagesprotokoll und Aktivitäten ersetzt. Dieser Schritt kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={applyTestData}>Testdaten einspielen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteTestDataConfirm} onOpenChange={setShowDeleteTestDataConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Daten löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dadurch werden Profil, Tagesprotokoll, Aktivitäten und Rezepte entfernt und die App zurück auf den Startzustand gesetzt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={clearTestData}>Alle Daten löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Design Tab */}
        {tab === "design" && (
          <div className="space-y-3">
            {/* Appearance Card */}
            <div className="glass-card rounded-xl p-3 space-y-3">
              <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Design</h2>
              <div>
                <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">Modus</Label>
                <button
                  onClick={onToggleDarkMode}
                  className="flex items-center gap-3 w-full p-2.5 rounded-full bg-accent hover:bg-muted transition-colors border border-border"
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
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-colors ${
                        colorTheme === key ? "border-primary bg-accent/40" : "border-border bg-accent hover:bg-muted"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: THEME_COLORS[key].swatch }} />
                      <span className="text-xs font-medium">{THEME_COLORS[key].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}


        {/* Food List Tab */}
        {tab === "food" && (
          <div className="space-y-3">
            <div className="glass-card rounded-xl p-3">
            {editingFood ? (
              <div className="space-y-2.5">
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
                        className="h-6 w-6 flex items-center justify-center rounded-full border border-border bg-accent hover:bg-muted disabled:opacity-30 transition-colors"
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
                        className="h-6 w-6 flex items-center justify-center rounded-full border border-border bg-accent hover:bg-muted disabled:opacity-30 transition-colors"
                        title="Nächstes Lebensmittel"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {/* === BLOCK 1: Basis (Name, g/ml, Kategorie, Standardwert, Flüssigkeit) === */}
                <div className="space-y-0.5 rounded-lg border border-border p-1.5 pt-1 bg-card">
                  <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Basis</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    <div className="col-span-4">
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">Lebensmittel</Label>
                      <Input ref={foodNameInputRef} value={editFoodName} onChange={(e) => setEditFoodName(e.target.value)} className="h-6 !text-[10px] px-1 text-left" autoCorrect="off" spellCheck={false} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">g/ml</Label>
                      <div className="h-6 flex items-center justify-center text-[8px] text-muted-foreground rounded-full border border-border bg-accent">
                        100
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="relative">
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">Kategorie</Label>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between h-6 px-1.5 text-[8px] rounded-full border border-border bg-accent hover:bg-muted/60 transition-colors"
                        onClick={() => setShowCategoryDropdown(v => !v)}
                      >
                        <span className="truncate">{editFoodCategory || "–"}</span>
                        <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform shrink-0 ml-1 ${showCategoryDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showCategoryDropdown && (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-[210] bg-transparent"
                            aria-label="Kategorieauswahl schließen"
                            onClick={() => setShowCategoryDropdown(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-0.5 z-[220] overflow-y-auto rounded-md border border-border bg-popover shadow-lg max-h-[55vh]">
                            <div
                              className={`px-3 py-0.5 text-[8px] leading-4 cursor-pointer transition-colors ${!editFoodCategory ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60"}`}
                              onPointerDown={(e) => { e.preventDefault(); setEditFoodCategory(""); setShowCategoryDropdown(false); }}
                            >–</div>
                            {FOOD_CATEGORIES.map(cat => (
                              <div
                                key={cat}
                                className={`px-3 py-0.5 text-[8px] leading-4 cursor-pointer transition-colors ${editFoodCategory === cat ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60"}`}
                                onPointerDown={(e) => { e.preventDefault(); setEditFoodCategory(cat); setShowCategoryDropdown(false); }}
                              >{cat}</div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">Standardwert</Label>
                      <Input type="number" inputMode="decimal" value={editFoodDefault} onChange={(e) => setEditFoodDefault(e.target.value)} placeholder="z.B. 125" className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">Flüssigkeit (ml)</Label>
                      <Input type="number" inputMode="decimal" value={editFoodLiquid} onChange={(e) => setEditFoodLiquid(e.target.value)} placeholder="z.B. 250" className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                  </div>
                </div>

                {/* KI-Suche Button */}
                <Button
                  variant="outline"
                  onClick={handleAiLookup}
                  disabled={aiLoading || !editFoodName.trim()}
                  className="w-full h-6 text-[8px] gap-2"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />}
                  {aiLoading ? "KI sucht Nährwerte..." : <><Search className="w-3 h-3 text-muted-foreground" /> KI-Nährwerte suchen</>}
                </Button>

                {/* Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  <Button variant="outline" onClick={() => { handleSaveFood(); handleNewFood(); }} className="h-6 text-[8px]">
                    → Next
                  </Button>
                  <Button onClick={handleSaveFood} className="h-6 text-[8px] gap-1">
                    <Save className="w-3 h-3" /> Speichern
                  </Button>
                  <Button variant="outline" onClick={() => { setEditingFood(null); setFoodNavIndex(null); }} className="h-6 text-[8px]">
                    ← Zurück
                  </Button>
                </div>

                {/* === BLOCK 2: Nährstoffe (Makros + Vitamine + Spurenelemente) === */}
                <div className="rounded-lg border border-border p-1.5 pt-1 bg-card">
                  {/* Makronährstoffe */}
                  <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Makronährstoffe</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">kcal</Label>
                      <Input type="number" inputMode="decimal" value={editFoodCal} onChange={(e) => setEditFoodCal(e.target.value)} className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">PRO</Label>
                      <Input type="number" inputMode="decimal" value={editFoodPro} onChange={(e) => setEditFoodPro(e.target.value)} className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">FAT</Label>
                      <Input type="number" inputMode="decimal" value={editFoodFat} onChange={(e) => setEditFoodFat(e.target.value)} className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">KH</Label>
                      <Input type="number" inputMode="decimal" value={editFoodKh} onChange={(e) => setEditFoodKh(e.target.value)} className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">FIB</Label>
                      <Input type="number" inputMode="decimal" value={editFoodFib} onChange={(e) => setEditFoodFib(e.target.value)} className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                    <div>
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">GI</Label>
                      <Input type="number" inputMode="decimal" value={editFoodGi} onChange={(e) => setEditFoodGi(e.target.value)} placeholder="0-100" className="h-6 !text-[10px] px-1 text-center" />
                    </div>
                  </div>

                  {/* Vitamine */}
                  <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-0.5">Vitamine</p>
                  <div className="grid grid-cols-6 gap-x-1 gap-y-0">
                    {([
                      ["vitA", "A (µg)"],
                      ["vitB1", "B1 (mg)"],
                      ["vitB2", "B2 (mg)"],
                      ["vitB3", "B3 (mg)"],
                      ["vitB5", "B5 (mg)"],
                      ["vitB6", "B6 (mg)"],
                      ["vitB7", "B7 (µg)"],
                      ["vitB9", "B9 (µg)"],
                      ["vitB12", "B12 (µg)"],
                      ["vitC", "C (mg)"],
                      ["vitD", "D (µg)"],
                      ["vitE", "E (mg)"],
                      ["vitK", "K (µg)"],
                    ] as [keyof FoodVitamins, string][]).map(([key, label]) => (
                      <div key={key} className="mb-0">
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">{label}</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={editVitamins[key] !== undefined ? String(editVitamins[key]) : ""}
                          onChange={(e) => setEditVitamins(prev => ({ ...prev, [key]: e.target.value ? parseFloat(e.target.value) : undefined }))}
                          className="h-6 !text-[10px] px-1 text-center"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Spurenelemente */}
                  <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-0.5">Spurenelemente</p>
                  <div className="grid grid-cols-6 gap-x-1 gap-y-0">
                    {([
                      ["calcium", "Ca (mg)"],
                      ["chlorid", "Cl (mg)"],
                      ["eisen", "Fe (mg)"],
                      ["fluorid", "F (mg)"],
                      ["kalium", "K (mg)"],
                      ["kupfer", "Cu (mg)"],
                      ["magnesium", "Mg (mg)"],
                      ["mangan", "Mn (mg)"],
                      ["natrium", "Na (mg)"],
                      ["phosphor", "P (mg)"],
                      ["schwefel", "S (mg)"],
                      ["zink", "Zn (mg)"],
                    ] as [keyof FoodMinerals, string][]).map(([key, label]) => (
                      <div key={key} className="mb-0">
                      <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">{label}</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={editMinerals[key] !== undefined ? String(editMinerals[key]) : ""}
                          onChange={(e) => setEditMinerals(prev => ({ ...prev, [key]: e.target.value ? parseFloat(e.target.value) : undefined }))}
                          className="h-6 !text-[10px] px-1 text-center"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Eigenschaften (Dietary Flags) */}
                  <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-0.5">Eigenschaften</p>
                  <div className="grid grid-cols-8 gap-x-1 gap-y-0">
                    {DIETARY_FLAG_KEYS.map(key => (
                      <div key={key} className="mb-0">
                        <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">{key.toUpperCase()}</Label>
                        <button
                          type="button"
                          onClick={() => setEditDietary(prev => {
                            const cur = prev[key];
                            if (cur === undefined) return { ...prev, [key]: true };
                            if (cur === true) return { ...prev, [key]: false };
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          })}
                          className={`h-6 w-full rounded-full text-[10px] font-medium text-center border transition-colors ${
                            editDietary[key] === true
                              ? "bg-accent/80 text-foreground border-border"
                              : editDietary[key] === false
                                ? "bg-accent text-muted-foreground border-border"
                                : "bg-accent text-muted-foreground/40 border-border"
                          }`}
                        >
                          {editDietary[key] === true ? "J" : editDietary[key] === false ? "N" : "–"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Zusatzinfo - ganz unten */}
                <div>
                  <Label className="text-[8px] text-muted-foreground leading-none block mb-0.5">Zusatzinfo</Label>
                  <Textarea value={editFoodNotes} onChange={(e) => { setEditFoodNotes(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} onFocus={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} placeholder="z.B. vegan, Nutri Score, Haltungsform, Bio usw." className="min-h-[40px] !text-[10px] px-1 py-1 leading-tight resize-none overflow-hidden" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-0 flex-1">
                {/* Fixed controls area */}
                <div id="section-lebensmittelliste" className={`shrink-0 space-y-1.5 ${highlightedSettingsSection === "section-lebensmittelliste" ? "section-card-highlight" : ""}`} data-section-active={activeSettingsSection === "section-lebensmittelliste" ? "true" : undefined}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${highlightedSettingsSection === "section-lebensmittelliste" || activeSettingsSection === "section-lebensmittelliste" ? "text-primary section-heading-highlight" : "text-muted-foreground"}`}>Lebensmittelliste</h2>
                    <button
                      onClick={handleNewFood}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      + New Food
                    </button>
                  </div>
                  {/* Category filter buttons */}
                  <div className="flex flex-wrap gap-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => { setSelectedCategories(new Set()); setSelectedAnimal(null); }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                        selectedCategories.size === 0
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-accent text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      Alle
                    </button>
                    {FOOD_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategories(prev => {
                            const next = new Set(prev);
                            if (next.has(cat)) {
                              next.delete(cat);
                              if (cat === "Fleisch&Wurst") setSelectedAnimal(null);
                            } else {
                              next.add(cat);
                            }
                            return next;
                          });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                          selectedCategories.has(cat)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-accent text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  {/* Dietary filter buttons – always visible */}
                  <div className="pb-1">
                    <div className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider mb-1 ml-0.5">Filter</div>
                    <div className="flex flex-wrap gap-1">
                      {DIETARY_FLAG_KEYS.map(key => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDietaryFilters(prev => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key); else next.add(key);
                            return next;
                          })}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors border ${
                            selectedDietaryFilters.has(key)
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-accent/50 text-muted-foreground border-border/60 hover:bg-muted/60"
                          }`}
                        >
                          {DIETARY_FLAG_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Animal sub-filter when Fleisch&Wurst is selected */}
                  {selectedCategories.has("Fleisch&Wurst") && (
                    <div className="pb-1.5">
                      <div className="flex flex-wrap gap-1">
                        {["Rind", "Schwein", "Lamm", "Kalb", "Geflügel", "Wild", "Wurst"].map(animal => (
                          <button
                            key={animal}
                            type="button"
                            onClick={() => setSelectedAnimal(prev => prev === animal ? null : animal)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors border ${
                              selectedAnimal === animal
                                ? "bg-accent text-accent-foreground border-accent"
                                : "bg-accent/50 text-muted-foreground border-border/60 hover:bg-muted/60"
                            }`}
                          >
                            {animal}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="relative z-20 mb-10 flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={foodSearchRef}
                        placeholder="Lebensmittel suchen..."
                        value={foodSearch}
                        onChange={(e) => setFoodSearch(e.target.value)}
                        className="h-9 text-xs pl-8 pr-7"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {foodSearch && (
                        <button
                          type="button"
                          onClick={() => setFoodSearch("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          tabIndex={-1}
                          title="Suche leeren"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Scrollable table with sticky header */}
                <div className="mt-2 max-h-[30vh] overflow-y-auto overflow-x-auto -mx-1 px-1">
                  <table className="w-full text-[10px]">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-1 pr-1 font-semibold text-muted-foreground">Lebensmittel</th>
                        <th className="text-right py-1 px-0.5 font-semibold text-muted-foreground">Einh.</th>
                        <th className="text-right py-1 px-0.5 font-semibold text-muted-foreground">kcal</th>
                        <th className="text-right py-1 px-0.5 font-semibold" style={{ color: "hsl(var(--macro-pro))" }}>PRO</th>
                        <th className="text-right py-1 px-0.5 font-semibold" style={{ color: "hsl(var(--macro-fat))" }}>FAT</th>
                        <th className="text-right py-1 px-0.5 font-semibold" style={{ color: "hsl(var(--macro-kh))" }}>KH</th>
                        <th className="text-right py-1 px-0.5 font-semibold" style={{ color: "hsl(var(--macro-fib))" }}>FIB</th>
                        <th className="text-right py-1 px-0.5 font-semibold text-foreground">GI</th>
                        <th className="w-5 pl-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFoods.map((f, idx) => (
                        <React.Fragment key={f.name}>
                          {/* Mobile: row 1 = name spanning all columns */}
                          <tr
                            className="border-0 md:hidden hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => handleEditFood(f, idx)}
                          >
                            <td colSpan={8} className="pt-1.5 pb-0 pr-1 font-medium text-[11px]">{f.name}</td>
                            <td className="pt-1.5 pb-0 pl-3 pr-0 whitespace-nowrap">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleRecipeFood(f); }}
                                className={`p-0.5 rounded transition-colors ${isRecipeSelected(f.name) ? "text-primary" : "text-muted-foreground/70 hover:text-primary/80"}`}
                                title="Für Rezept auswählen"
                              >
                                <CookIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setFoodToDelete(f.name); }}
                                className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          {/* Mobile: row 2 = macros */}
                          <tr
                            className="border-b border-border/50 md:hidden hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => handleEditFood(f, idx)}
                          >
                            <td className="pb-1.5 pt-0 pr-1 text-muted-foreground whitespace-nowrap"></td>
                            <td className="pb-1.5 pt-0 px-0.5 text-right text-muted-foreground whitespace-nowrap">{f.baseUnit}</td>
                            <td className="pb-1.5 pt-0 px-0.5 text-right font-semibold">{f.calories}</td>
                            <td className="pb-1.5 pt-0 px-0.5 text-right">{f.protein}</td>
                            <td className="pb-1.5 pt-0 px-0.5 text-right">{f.fat}</td>
                            <td className="pb-1.5 pt-0 px-0.5 text-right">{f.carbs}</td>
                            <td className="pb-1.5 pt-0 px-0.5 text-right">{f.fiber}</td>
                            <td className="pb-1.5 pt-0 px-0.5 text-right text-foreground">{f.gi ?? "–"}</td>
                            <td className="pb-1.5 pt-0"></td>
                          </tr>
                          {/* Desktop: single row as before */}
                          <tr
                            className="border-b border-border/50 hidden md:table-row hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => handleEditFood(f, idx)}
                          >
                            <td className="py-1 pr-1 font-medium max-w-[90px] truncate">{f.name}</td>
                            <td className="py-1 px-0.5 text-right text-muted-foreground whitespace-nowrap">{f.baseUnit}</td>
                            <td className="py-1 px-0.5 text-right font-semibold">{f.calories}</td>
                            <td className="py-1 px-0.5 text-right">{f.protein}</td>
                            <td className="py-1 px-0.5 text-right">{f.fat}</td>
                            <td className="py-1 px-0.5 text-right">{f.carbs}</td>
                            <td className="py-1 px-0.5 text-right">{f.fiber}</td>
                            <td className="py-1 px-0.5 text-right text-foreground">{f.gi ?? "–"}</td>
                            <td className="py-1 pl-3 pr-0 whitespace-nowrap">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleRecipeFood(f); }}
                                className={`p-0.5 rounded transition-colors ${isRecipeSelected(f.name) ? "text-primary" : "text-muted-foreground/70 hover:text-primary/80"}`}
                                title="Für Rezept auswählen"
                              >
                                <CookIcon className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setFoodToDelete(f.name); }}
                                className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="shrink-0 text-[10px] text-muted-foreground mt-1">{foodDatabase.length} Lebensmittel in der Datenbank</p>
              </div>
            )}
            </div>
            {!editingFood && (
              <RecipeGenerator
                selectedFoods={selectedRecipeFoods}
                onRemoveFood={(name) => setSelectedRecipeFoods((prev) => prev.filter((f) => f.name !== name))}
                onClearAll={() => setSelectedRecipeFoods([])}
                entries={entries}
                selectedDate={selectedDate}
                onAddEntry={onAddEntry}
              />
            )}

            {/* Food delete confirmation */}
            <AlertDialog open={!!foodToDelete} onOpenChange={(v) => { if (!v) setFoodToDelete(null); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Wirklich löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    „{foodToDelete}" wird unwiderruflich aus der Lebensmittelliste entfernt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbruch</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { if (foodToDelete) { handleRemoveFood(foodToDelete); setFoodToDelete(null); } }}>
                    Ja
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Recipes Tab */}
        {tab === "recipes" && (
          <div id="section-gespeicherte-rezepte" className={`space-y-3 ${highlightedSettingsSection === "section-gespeicherte-rezepte" ? "section-card-highlight" : ""}`} data-section-active={activeSettingsSection === "section-gespeicherte-rezepte" || tab === "recipes" ? "true" : undefined}>
            <h2 className={`text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300 ${highlightedSettingsSection === "section-gespeicherte-rezepte" || activeSettingsSection === "section-gespeicherte-rezepte" || tab === "recipes" ? "text-primary section-heading-highlight" : "text-muted-foreground"}`}>Rezepte</h2>
            <RecipesTab entries={entries} selectedDate={selectedDate} onAddEntry={onAddEntry} voiceExpandIndex={recipeVoiceIndex} onVoiceExpandHandled={() => setRecipeVoiceIndex(null)} voiceInputRef={recipeVoiceInputRef} />
          </div>
        )}

        {/* Data Tab */}
        {tab === "data" && (
          <div className="space-y-3">

            {/* IMPORT Section */}
            <div id="section-import" className={`glass-card rounded-xl p-3 space-y-1.5 ${highlightedSettingsSection === "section-import" ? "section-card-highlight" : ""}`}>
              <div className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Import</h2>
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
                <div className="space-y-1.5">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-7 text-[11px] gap-1.5"
                  >
                    <FileUp className="w-3 h-3" />
                    Datei auswählen (.csv, .tsv, .txt)
                  </Button>
                  {!showResetFoodConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetFoodConfirm(true)}
                      className="w-full h-7 text-[11px] gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset Lebensmittelliste
                    </Button>
                  ) : (
                    <div className="rounded-lg border-2 border-destructive p-2.5 space-y-2">
                      <p className="text-xs font-semibold text-destructive">
                        Liste zurücksetzen? Eigene Artikel gehen verloren.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          resetFoodDatabase();
                          reloadFoodDatabase();
                          forceUpdate((n) => n + 1);
                          setShowResetFoodConfirm(false);
                          toast.success("Lebensmittelliste auf Werkseinstellung zurückgesetzt!");
                        }} className="flex-1 h-8 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive">
                          Reset
                        </Button>
                        <Button variant="secondary" size="sm" autoFocus onClick={() => setShowResetFoodConfirm(false)} className="flex-1 h-8 text-xs ring-2 ring-primary">
                          Abbruch
                        </Button>
                      </div>
                    </div>
                  )}
                  {!showResetMicroConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetMicroConfirm(true)}
                      className="w-full h-7 text-[11px] gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reset Mikronährstoffe
                    </Button>
                  ) : (
                    <div className="rounded-lg border-2 border-destructive p-2.5 space-y-2">
                      <p className="text-xs font-semibold text-destructive">
                        Alle Sollwerte auf DGE-Standard zurücksetzen?
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          localStorage.removeItem("mampflogger-custom-targets");
                          window.dispatchEvent(new Event("mampflogger-custom-targets-reset"));
                          setShowResetMicroConfirm(false);
                          toast.success("Mikronährstoff-Sollwerte auf DGE-Standard zurückgesetzt!");
                          toast.success("Mikronährstoff-Sollwerte auf DGE-Standard zurückgesetzt!");
                        }} className="flex-1 h-8 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive">
                          Reset
                        </Button>
                        <Button variant="secondary" size="sm" autoFocus onClick={() => setShowResetMicroConfirm(false)} className="flex-1 h-8 text-xs ring-2 ring-primary">
                          Abbruch
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchDietary}
                    disabled={batchEnriching}
                    className="w-full h-7 text-[11px] gap-1.5"
                  >
                    {batchEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {batchEnriching ? batchProgress : "Lebensmitteldetails aktualisieren"}
                  </Button>
                </div>
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
            <div id="section-export" className={`glass-card rounded-xl p-3 space-y-1.5 ${highlightedSettingsSection === "section-export" ? "section-card-highlight" : ""}`}>
              <div className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Export</h2>
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


            {/* BACKUP Section */}
            <div id="section-backup" className={`glass-card rounded-xl p-3 space-y-1.5 ${highlightedSettingsSection === "section-backup" ? "section-card-highlight" : ""}`}>
              <div className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Backup</h2>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  id="backup-create-btn"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={() => {
                    const backup = collectManualBackupSnapshot();
                    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `mampflogger-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Backup erstellt und heruntergeladen!");
                  }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Speichern
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={() => backupInputRef.current?.click()}
                >
                  <Download className="w-3.5 h-3.5" />
                  Laden
                </Button>
              </div>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target?.result as string);
                      if (typeof data !== "object" || data === null) throw new Error("Ungültig");
                      const count = restoreManualBackupSnapshot(data as Record<string, unknown>);
                      if (count === 0) throw new Error("Leer");
                      toast.success(`Backup wiederhergestellt (${count} Schlüssel). App wird neu geladen…`);
                      setTimeout(() => window.location.reload(), 1200);
                    } catch {
                      toast.error("Ungültige Backup-Datei.");
                    }
                  };
                  reader.readAsText(file);
                  if (backupInputRef.current) backupInputRef.current.value = "";
                }}
              />
              <p className="text-[9px] text-muted-foreground">Speichert Profil, Protokoll, Aktivitäten, Lebensmittel & Einstellungen.</p>
            </div>

            {/* CLOUD BACKUP Section */}
            <div id="section-cloud-backup" className={`glass-card rounded-xl p-3 space-y-2 ${highlightedSettingsSection === "section-cloud-backup" ? "section-card-highlight" : ""}`}>
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cloud-Backup</h2>
              </div>
              <CloudBackupSettings />
            </div>

            {/* DELETE Section */}
            <div id="section-loeschen" className={`glass-card rounded-xl p-3 space-y-1.5 ${highlightedSettingsSection === "section-loeschen" ? "section-card-highlight" : ""}`}>
              <div className="flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-primary" />
                <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cancel</h2>
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
                  <p className="text-xs text-destructive font-medium">{deletePreview} Protokoll-Einträge werden gelöscht.</p>
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
                      {deletePreview} Protokoll-Einträge löschen
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
                      <span className="text-[9px] font-semibold text-destructive">Protokoll</span>
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
                      Wirklich alle {entries.length} Protokoll-Einträge löschen?
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
          </div>
        </main>
      {voiceControlVisible && window.innerWidth >= 1024 && (
        <VoiceControlOverlay activeSection={activeSettingsSection} />
      )}
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
