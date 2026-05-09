import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCloudBackup } from "@/hooks/useCloudBackup";
import { NutritionEntry, formatDate, calculateDailySummary } from "@/types/nutrition";
import { syncRemoteFoodDatabase, loadRemoteUrl } from "@/lib/remoteFoodSync";
import {
  UserProfile,
  BookedActivity,
  WeightEntry,
  clearProfile,
  loadProfile,
  saveProfile,
  loadBookedActivities,
  saveBookedActivities,
  loadWeightLog,
  saveWeightLog,
  setWeightForDate,
  calculateBookedActivityBonus,
} from "@/types/profile";
import { loadEntries, saveEntries } from "@/lib/storage";
import { applyEmbeddedTestDataset, hasConfiguredPersonalProfile, TestDataGender } from "@/lib/embeddedTestData";
import { reloadFoodDatabase } from "@/data/foodDatabase";
import NutritionForm from "@/components/NutritionForm";
import NutritionTable, { TableViewMode } from "@/components/NutritionTable";
import MacroBar from "@/components/MacroBar";
import WeeklyOverview from "@/components/WeeklyOverview";
import ActivityInput from "@/components/ActivityInput";
import DeficitDisplay from "@/components/DeficitDisplay";
import FluidDisplay from "@/components/FluidDisplay";
import WeightTracker from "@/components/WeightTracker";
import SupplementTracker from "@/components/SupplementTracker";
import { loadSupplements, saveSupplements, aggregateSupplementNutrients, type Supplement } from "@/types/supplements";
import DailyCalorieChart from "@/components/DailyCalorieChart";
import PhotoToLog from "@/components/PhotoToLog";
import FastingAnalysis from "@/components/FastingAnalysis";
import SectionHeading from "@/components/SectionHeading";
import HelpContent from "@/components/HelpContent";

import SettingsDialog, { ColorTheme } from "@/components/SettingsDialog";
import { ChevronLeft, ChevronRight, BarChart3, List, Mic, Ear, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceCommands, SECTION_PAGE_MAP, SECTION_SETTINGS_TAB } from "@/hooks/useVoiceCommands";
import { useSectionNavigation } from "@/hooks/useSectionNavigation";
import { useAudioGuide } from "@/hooks/useAudioGuide";
import AudioGuideEditor from "@/components/AudioGuideEditor";
import VoiceControlOverlay from "@/components/VoiceControlOverlay";
import { parseSpokenSelectionIndex } from "@/lib/voiceSelection";
import { parseGermanSpokenNumber } from "@/lib/spokenNumbers";

// Voice-to-nutrient matching for info panel toggle
const NUTRIENT_VOICE_MAP: [RegExp, string, "vitamins" | "minerals"][] = [
  [/\bvitamin\s*a\b/i, "vitA", "vitamins"],
  [/\bretinol\b/i, "vitA", "vitamins"],
  [/\bvitamin\s*b\s*1\b/i, "vitB1", "vitamins"],
  [/\bb\s*1\b/i, "vitB1", "vitamins"],
  [/\bthiamin\b/i, "vitB1", "vitamins"],
  [/\bvitamin\s*b\s*2\b/i, "vitB2", "vitamins"],
  [/\bb\s*2\b/i, "vitB2", "vitamins"],
  [/\briboflavin\b/i, "vitB2", "vitamins"],
  [/\bvitamin\s*b\s*3\b/i, "vitB3", "vitamins"],
  [/\bb\s*3\b/i, "vitB3", "vitamins"],
  [/\bniacin\b/i, "vitB3", "vitamins"],
  [/\bvitamin\s*b\s*5\b/i, "vitB5", "vitamins"],
  [/\bb\s*5\b/i, "vitB5", "vitamins"],
  [/\bpantothensäure\b/i, "vitB5", "vitamins"],
  [/\bvitamin\s*b\s*6\b/i, "vitB6", "vitamins"],
  [/\bb\s*6\b/i, "vitB6", "vitamins"],
  [/\bpyridoxin\b/i, "vitB6", "vitamins"],
  [/\bvitamin\s*b\s*7\b/i, "vitB7", "vitamins"],
  [/\bb\s*7\b/i, "vitB7", "vitamins"],
  [/\bbiotin\b/i, "vitB7", "vitamins"],
  [/\bvitamin\s*b\s*9\b/i, "vitB9", "vitamins"],
  [/\bb\s*9\b/i, "vitB9", "vitamins"],
  [/\bfolsäure\b/i, "vitB9", "vitamins"],
  [/\bvitamin\s*b\s*12\b/i, "vitB12", "vitamins"],
  [/\bb\s*12\b/i, "vitB12", "vitamins"],
  [/\bcobalamin\b/i, "vitB12", "vitamins"],
  [/\bvitamin\s*c\b/i, "vitC", "vitamins"],
  [/\bascorbinsäure\b/i, "vitC", "vitamins"],
  [/\bvitamin\s*d\b/i, "vitD", "vitamins"],
  [/\bcalciferol\b/i, "vitD", "vitamins"],
  [/\bvitamin\s*e\b/i, "vitE", "vitamins"],
  [/\btocopherol\b/i, "vitE", "vitamins"],
  [/\bvitamin\s*k\b/i, "vitK", "vitamins"],
  [/\bphyllochinon\b/i, "vitK", "vitamins"],
  [/\bcalcium\b/i, "calcium", "minerals"],
  [/\bkalzium\b/i, "calcium", "minerals"],
  [/\bchlor(?:id)?\b/i, "chlorid", "minerals"],
  [/\beisen\b/i, "eisen", "minerals"],
  [/\bfluorid\b/i, "fluorid", "minerals"],
  [/\bkalium\b/i, "kalium", "minerals"],
  [/\bkupfer\b/i, "kupfer", "minerals"],
  [/\bmagnesium\b/i, "magnesium", "minerals"],
  [/\bmangan\b/i, "mangan", "minerals"],
  [/\bnatrium\b/i, "natrium", "minerals"],
  [/\bphosphor\b/i, "phosphor", "minerals"],
  [/\bschwefel\b/i, "schwefel", "minerals"],
  [/\bzink\b/i, "zink", "minerals"],
];

function matchNutrientVoice(
  lower: string,
  kindFilter?: "vitamins" | "minerals",
): { key: string; kind: "vitamins" | "minerals" } | null {
  for (const [pattern, key, kind] of NUTRIENT_VOICE_MAP) {
    if (kindFilter && kind !== kindFilter) continue;
    if (pattern.test(lower)) return { key, kind };
  }
  return null;
}

const ACTIVE_VITAMIN_SHORTCUTS: [RegExp, string][] = [
  [/^\s*(?:vitamin\s*)?a(?:\s+bitte)?[.!?]?\s*$/i, "vitA"],
  [/^\s*(?:vitamin\s*)?b\s*1(?:\s+bitte)?[.!?]?\s*$/i, "vitB1"],
  [/^\s*(?:vitamin\s*)?b\s*2(?:\s+bitte)?[.!?]?\s*$/i, "vitB2"],
  [/^\s*(?:vitamin\s*)?b\s*3(?:\s+bitte)?[.!?]?\s*$/i, "vitB3"],
  [/^\s*(?:vitamin\s*)?b\s*5(?:\s+bitte)?[.!?]?\s*$/i, "vitB5"],
  [/^\s*(?:vitamin\s*)?b\s*6(?:\s+bitte)?[.!?]?\s*$/i, "vitB6"],
  [/^\s*(?:vitamin\s*)?b\s*7(?:\s+bitte)?[.!?]?\s*$/i, "vitB7"],
  [/^\s*(?:vitamin\s*)?b\s*9(?:\s+bitte)?[.!?]?\s*$/i, "vitB9"],
  [/^\s*(?:vitamin\s*)?b\s*12(?:\s+bitte)?[.!?]?\s*$/i, "vitB12"],
  [/^\s*(?:vitamin\s*)?c(?:\s+bitte)?[.!?]?\s*$/i, "vitC"],
  [/^\s*(?:vitamin\s*)?d(?:\s+bitte)?[.!?]?\s*$/i, "vitD"],
  [/^\s*(?:vitamin\s*)?e(?:\s+bitte)?[.!?]?\s*$/i, "vitE"],
  [/^\s*(?:vitamin\s*)?k(?:\s+bitte)?[.!?]?\s*$/i, "vitK"],
];

function matchActiveVitaminShortcut(lower: string): string | null {
  for (const [pattern, key] of ACTIVE_VITAMIN_SHORTCUTS) {
    if (pattern.test(lower)) return key;
  }
  return null;
}

function getNutrientKindForSection(sectionId: string | null): "vitamins" | "minerals" | null {
  if (sectionId === "section-vitamine-7-tage") return "vitamins";
  if (sectionId === "section-mineralstoffe-7-tage") return "minerals";
  return null;
}

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const cloudBackup = useCloudBackup(user?.id ?? null);
  const settingsParam = searchParams.get("settings");

  useEffect(() => {
    if (settingsParam) {
      setSearchParams({}, { replace: true });
    }
  }, []);
  
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [activeTab, setActiveTab] = useState<"log" | "weekly" | "help">("log");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookedActivities, setBookedActivities] = useState<BookedActivity[]>([]);
  const [weightLog, setWeightLog] = useState<WeightEntry[]>(() => loadWeightLog());
  const [editingEntry, setEditingEntry] = useState<NutritionEntry | null>(null);
  const [editingActivity, setEditingActivity] = useState<BookedActivity | null>(null);
  const [openNewFood, setOpenNewFood] = useState(false);
  const [openRecipes, setOpenRecipes] = useState(false);
  const [settingsVoiceTab, setSettingsVoiceTab] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCurrentTab, setSettingsCurrentTab] = useState<string>("profile");
  const [settingsCloseRequest, setSettingsCloseRequest] = useState(false);
  const [settingsVoiceAction, setSettingsVoiceAction] = useState<string | null>(null);
  const [weeklyCoachAnalyzeRequest, setWeeklyCoachAnalyzeRequest] = useState(0);
  const [startupProfilePrompt, setStartupProfilePrompt] = useState(false);
   const [activityFocusRequestId, setActivityFocusRequestId] = useState<number | undefined>(undefined);
  const [dateFocused, setDateFocused] = useState(false);
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>("detail");
  const [voiceControlVisible, setVoiceControlVisible] = useState(false);
  const [supplements, setSupplements] = useState<Supplement[]>(() => {
    // Seed custom nutrients if not present
    if (!localStorage.getItem("mampflogger-custom-nutrients")) {
      localStorage.setItem("mampflogger-custom-nutrients", JSON.stringify([
        { key: "custom_omega_3", label: "Omega-3", defaultUnit: "mg" },
        { key: "custom_kreatin", label: "Kreatin", defaultUnit: "mg" },
        { key: "custom_kollagen", label: "Kollagen", defaultUnit: "mg" },
      ]));
    }
    return loadSupplements();
  });
  const supplementVoiceRef = useRef<((transcript: string, isInterim: boolean) => void) | undefined>();
  
  const [highlightedTab, setHighlightedTab] = useState<string | null>(null);
  const highlightTabTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const flashTab = useCallback((tab: string) => {
    if (highlightTabTimerRef.current) clearTimeout(highlightTabTimerRef.current);
    setHighlightedTab(tab);
    highlightTabTimerRef.current = setTimeout(() => setHighlightedTab(null), 1500);
  }, []);
  const dateFocusedRef = useRef(false);
  const nutritionVoiceRef = useRef<((transcript: string, isInterim: boolean) => void) | undefined>();
  const recipeVoiceRef = useRef<((transcript: string, isInterim: boolean) => void) | undefined>();
  const activityVoiceRef = useRef<((transcript: string, isInterim: boolean) => void) | undefined>();
  const profileVoiceRef = useRef<((transcript: string, isInterim: boolean) => void) | undefined>();
  const activityVoiceCaptureUntilRef = useRef(0);
  const sectionNav = useSectionNavigation();
  const audioGuide = useAudioGuide(profile);
  const activeSectionRef = useRef<string | null>(null);
  activeSectionRef.current = sectionNav.activeSection;

  // Refs for use inside callbacks
  const settingsOpenRef = useRef(false);
  settingsOpenRef.current = settingsOpen;
  const settingsTabRef = useRef("profile");
  settingsTabRef.current = settingsCurrentTab;

  // Helper to close settings before navigating
  const closeSettingsAndDo = useCallback((fn: () => void) => {
    if (settingsOpenRef.current) {
      setSettingsCloseRequest(true);
      setTimeout(fn, 100);
    } else {
      fn();
    }
  }, []);

  const focusFoodField = useCallback((delay = 0) => {
    window.setTimeout(() => {
      setActiveTab("log");
      window.scrollTo({ top: 0, behavior: "auto" });
      const foodInput = document.getElementById("food") as HTMLInputElement | null;
      foodInput?.focus();
    }, delay);
  }, []);

  // Global voice command system
  const voiceCommands = useVoiceCommands({
    onCommand: useCallback((action: string) => {
      // Deactivate date focus when a non-date/non-navigation command is used
      if (action !== "action:date-focus" && action !== "action:date-today" && action !== "field:next" && action !== "field:prev") {
        if (dateFocusedRef.current) {
          setDateFocused(false);
          dateFocusedRef.current = false;
        }
      }

      // Section navigation
      if (action.startsWith("section:")) {
        const sectionId = action.replace("section:", "section-");
        
        // Check if it's a settings section
        const settingsTab = SECTION_SETTINGS_TAB[sectionId];
        if (settingsTab) {
          setSettingsVoiceTab(settingsTab);
          setTimeout(() => setSettingsVoiceAction(`scroll:${sectionId}`), 300);
          return;
        }

        // Check if it's a page section — close settings first
        const page = SECTION_PAGE_MAP[sectionId];
        if (page) {
          closeSettingsAndDo(() => {
            const needsTabSwitch = page !== activeTabRef.current;
            if (needsTabSwitch) {
              setActiveTab(page);
              setTimeout(() => sectionNav.scrollToSection(sectionId), 200);
            } else {
              sectionNav.scrollToSection(sectionId);
            }
            if (sectionId === "section-neuer-eintrag") {
              activityVoiceCaptureUntilRef.current = 0;
              focusFoodField(300);
            }
            if (sectionId === "section-tagesuebersicht") {
              setTimeout(() => {
                const sectionEl = document.getElementById("section-tagesuebersicht");
                if (sectionEl instanceof HTMLElement) {
                  sectionEl.focus({ preventScroll: true });
                }
              }, needsTabSwitch ? 420 : 160);
            }
            if (sectionId === "section-activity") {
              activityVoiceCaptureUntilRef.current = Date.now() + (needsTabSwitch ? 6000 : 4000);
              setTimeout(() => setActivityFocusRequestId((prev) => (prev ?? 0) + 1), needsTabSwitch ? 350 : 120);
            }
            if (sectionId === "section-gewicht") {
              setTimeout(
                () => window.dispatchEvent(new CustomEvent("mampflogger:focus-weight-input")),
                needsTabSwitch ? 420 : 160,
              );
            }
          });
        }
        return;
      }

      // Nutrient-specific voice commands: only allowed on weekly tab
      if (action.startsWith("nutrient:")) {
        if (activeTabRef.current !== "weekly") {
          return;
        }

        const parts = action.split(":");
        const nutrientKey = parts[1];
        const nutrientKind = parts[2] as "vitamins" | "minerals";
        const sectionId = nutrientKind === "vitamins" ? "section-vitamine-7-tage" : "section-mineralstoffe-7-tage";

        closeSettingsAndDo(() => {
          sectionNav.scrollToSection(sectionId);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("mampflogger:nutrient-info", { detail: { key: nutrientKey, kind: nutrientKind } }));
          }, 300);
        });
        return;
      }

      // Focus clear: deactivate current section without scrolling
      if (action === "focus:clear") {
        sectionNav.setActiveSection(null);
        (document.activeElement as HTMLElement)?.blur?.();
        return;
      }

      // Scroll commands
      if (action === "scroll:bottom") {
        // Scroll to the last section, not beyond the viewport
        const sections = document.querySelectorAll("[data-section]");
        if (sections.length > 0) {
          const lastSection = sections[sections.length - 1];
          const HEADER_OFFSET = 140;
          const targetTop = Math.max(0, (lastSection as HTMLElement).offsetTop - HEADER_OFFSET);
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
        return;
      }
      if (action === "scroll:top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (action === "scroll:down") {
        sectionNav.scrollDirection("down");
        return;
      }
      if (action === "scroll:up") {
        sectionNav.scrollDirection("up");
        return;
      }

      // Navigation — close settings first
      if (action === "nav:log") closeSettingsAndDo(() => { setActiveTab("log"); flashTab("log"); window.scrollTo({ top: 0, behavior: "smooth" }); });
      else if (action === "nav:weekly") closeSettingsAndDo(() => { setActiveTab("weekly"); flashTab("weekly"); window.scrollTo({ top: 0, behavior: "smooth" }); });
      else if (action === "settings:open") { setSettingsVoiceTab("profile"); flashTab("settings"); }
      else if (action === "settings:profile") {
        if (settingsOpenRef.current) { setSettingsVoiceAction("switch-tab:profile"); } else { setSettingsVoiceTab("profile"); }
        flashTab("settings");
      }
      else if (action === "settings:design") {
        if (settingsOpenRef.current) { setSettingsVoiceAction("switch-tab:design"); } else { setSettingsVoiceTab("design"); }
        flashTab("settings");
      }
      else if (action === "settings:food") {
        if (settingsOpenRef.current) { setSettingsVoiceAction("switch-tab:food"); } else { setSettingsVoiceTab("food"); }
        flashTab("settings");
      }
      else if (action === "settings:recipes") {
        if (settingsOpenRef.current) { setSettingsVoiceAction("switch-tab:recipes"); } else { setSettingsVoiceTab("recipes"); }
        flashTab("settings");
      }
      else if (action === "settings:recipes+new") {
        setSettingsVoiceTab("recipes");
        flashTab("settings");
        setTimeout(() => setSettingsVoiceAction("new-recipe"), 400);
      }
      else if (action === "settings:recipes+camera") {
        setSettingsVoiceTab("recipes");
        flashTab("settings");
        setTimeout(() => setSettingsVoiceAction("recipe-photo"), 400);
      }
      else if (action === "settings:data") {
        if (settingsOpenRef.current) { setSettingsVoiceAction("switch-tab:data"); } else { setSettingsVoiceTab("data"); }
        flashTab("settings");
      }
      else if (action.startsWith("recipe:")) {
        if (!settingsOpenRef.current || settingsTabRef.current !== "recipes") {
          setSettingsVoiceTab("recipes");
          setTimeout(() => setSettingsVoiceAction(action), 300);
        } else {
          setSettingsVoiceAction(action);
        }
      }
      // Theme commands — context-aware: if in design tab, always apply theme
      else if (action === "theme:dark") setDarkMode(true);
      else if (action === "theme:light") setDarkMode(false);
      else if (action === "theme:blue") setColorTheme("blue");
      else if (action === "theme:yellow") setColorTheme("yellow");
      else if (action === "theme:pink") setColorTheme("pink");
      else if (action === "theme:green") setColorTheme("green");
      else if (action === "theme:orange") setColorTheme("orange");
      else if (action === "theme:teal") setColorTheme("teal");
      else if (action === "theme:red") setColorTheme("red");
      else if (action === "theme:gray") setColorTheme("gray");
      // Context-sensitive bare color words — only on design tab
      else if (action.startsWith("ctx-color:")) {
        if (settingsOpenRef.current && settingsTabRef.current === "design") {
          const color = action.replace("ctx-color:", "") as ColorTheme;
          setColorTheme(color);
        }
        // Otherwise ignore — don't let it fall through to fuzzy matching
        return;
      }
      else if (action === "action:recipe-search") {
        if (!settingsOpenRef.current || settingsTabRef.current !== "recipes") {
          setSettingsVoiceTab("recipes");
          setTimeout(() => setSettingsVoiceAction("recipe-search"), 300);
        } else {
          setSettingsVoiceAction("recipe-search");
        }
      }
      else if (action === "action:home") {
        // Global escape: blur any focused input, close settings, go to log page top
        (document.activeElement as HTMLElement)?.blur?.();
        closeSettingsAndDo(() => {
          setActiveTab("log");
          window.scrollTo({ top: 0, behavior: "smooth" });
          focusFoodField(300);
        });
        return;
      }
      else if (action === "action:help-stop") {
        audioGuide.stop();
        return;
      }
      else if (action === "action:help") {
        // Play audio help for the currently active section
        let currentSection = activeSectionRef.current;
        
        // If settings is open, check for active settings section
        if (settingsOpenRef.current) {
          const activeSettingsEl = document.querySelector('[role="dialog"] [data-section-active="true"]');
          if (activeSettingsEl?.id) {
            currentSection = activeSettingsEl.id;
          }
        }
        
        if (!currentSection) {
          // Detect the section currently most visible at the header offset
          const HEADER_OFFSET = 140;
          const TOLERANCE = 80;
          const allSections = Array.from(document.querySelectorAll("[data-section]"));
          for (const el of allSections) {
            const top = el.getBoundingClientRect().top;
            if (top >= HEADER_OFFSET - TOLERANCE && top <= HEADER_OFFSET + 300) {
              currentSection = el.id;
              break;
            }
          }
        }
        if (currentSection) {
          audioGuide.speak(currentSection);
        }
        return;
      }
      else if (action === "action:editor-open") {
        const currentSection = activeSectionRef.current;
        if (currentSection) {
          audioGuide.openEditor(currentSection);
        }
        return;
      }
      else if (action === "action:editor-close") {
        audioGuide.closeEditor();
        return;
      }
      else if (action === "action:voice-control-toggle") {
        // Only on desktop (>= 1024px width)
        if (window.innerWidth >= 1024) {
          setVoiceControlVisible(prev => !prev);
        }
        return;
      }
      else if (action === "action:mic-off") {
        voiceCommands.disarm();
        return;
      }
      else if (action === "action:mic-on") {
        voiceCommands.wake();
        return;
      }
      else if (action === "action:camera" || action === "action:entry+camera") {
        if (settingsOpenRef.current && settingsTabRef.current === "recipes" && action === "action:camera") {
          window.dispatchEvent(new Event("mampflogger:open-recipe-photo"));
          return;
        }

        closeSettingsAndDo(() => {
          const needsTabSwitch = activeTabRef.current !== "log";
          if (needsTabSwitch) setActiveTab("log");
          setTimeout(() => {
            window.dispatchEvent(new Event("mampflogger:open-photo-log"));
          }, needsTabSwitch ? 250 : 50);
        });
      }
      else if (action === "action:date-focus") {
        closeSettingsAndDo(() => {
          setDateFocused(true);
          dateFocusedRef.current = true;
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      else if (action === "action:date-today") {
        closeSettingsAndDo(() => {
          setSelectedDate(formatDate(new Date()));
          setDateFocused(true);
          dateFocusedRef.current = true;
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
      else if (action === "focus:food") {
        closeSettingsAndDo(() => {
          focusFoodField(100);
        });
      }
      else if (action === "click:profil-speichern") {
        if (!settingsOpenRef.current) {
          setSettingsVoiceTab("profile");
          setTimeout(() => setSettingsVoiceAction("profil-speichern"), 300);
        } else {
          setSettingsVoiceAction("profil-speichern");
        }
      }
      else if (action === "click:rezept-speichern") {
        if (!settingsOpenRef.current) {
          setSettingsVoiceTab("recipes");
          setTimeout(() => setSettingsVoiceAction("rezept-speichern"), 300);
        } else {
          setSettingsVoiceAction("rezept-speichern");
        }
      }
      else if (action === "click:new-food") {
        if (!settingsOpenRef.current) {
          setSettingsVoiceTab("food");
          setTimeout(() => setSettingsVoiceAction("new-food"), 300);
        } else {
          setSettingsVoiceAction("new-food");
        }
      }
      else if (action === "click:food-search") {
        if (!settingsOpenRef.current) {
          setSettingsVoiceTab("food");
          setTimeout(() => setSettingsVoiceAction("food-search"), 300);
        } else {
          setSettingsVoiceAction("food-search");
        }
      }
      else if (action === "action:toggle-goal-date") {
        window.dispatchEvent(new Event("mampflogger:toggle-goal-date"));
      }
      else if (action === "backup-create") {
        if (!settingsOpenRef.current) {
          setSettingsVoiceTab("data");
          setTimeout(() => setSettingsVoiceAction("backup-create"), 300);
        } else {
          setSettingsVoiceAction("backup-create");
        }
      }
      else if (action === "backup-load") {
        if (!settingsOpenRef.current) {
          setSettingsVoiceTab("data");
          setTimeout(() => setSettingsVoiceAction("backup-load"), 300);
        } else {
          setSettingsVoiceAction("backup-load");
        }
      }
      else if (action === "field:next" || action === "field:prev" || action === "field:clear" || action === "field:open-dropdown" || action === "field:close-dropdown" || action === "field:storno") {
        // Weekly nutrient scopes: close currently active nutrient info panel
        if (!settingsOpenRef.current && action === "field:close-dropdown" && activeTabRef.current === "weekly") {
          const activeNutrientKind = getNutrientKindForSection(activeSectionRef.current);
          if (activeNutrientKind) {
            window.dispatchEvent(new CustomEvent("mampflogger:nutrient-info", { detail: { key: "__close__", kind: activeNutrientKind } }));
            return;
          }
        }

        // If settings is open on recipes tab, keep close actions local to the current recipe UI
        if (settingsOpenRef.current && settingsTabRef.current === "recipes") {
          const manualFormOpen = !!document.querySelector('[data-voice-scope="manual-recipe"]');

          // Keep field:next inside manual recipe form
          if (action === "field:next" && manualFormOpen) {
            window.dispatchEvent(new CustomEvent("mampflogger:field-command", { detail: { action, scope: "manual-recipe" } }));
            return;
          }

          if (action === "field:close-dropdown" && manualFormOpen) {
            window.dispatchEvent(new CustomEvent("mampflogger:field-command", { detail: { action, scope: "manual-recipe" } }));
            return;
          }

          if ((action === "field:close-dropdown" || action === "field:prev") && !manualFormOpen) {
            setSettingsVoiceAction("recipe:-1");
            return;
          }
        }

        // If settings is open, route dropdown commands to settings
        if (settingsOpenRef.current) {
          if (action === "field:open-dropdown") { setSettingsVoiceAction("open-dropdown"); return; }
          if (action === "field:close-dropdown") { setSettingsVoiceAction("close-dropdown"); return; }
        }

        // Determine scope: settings state takes priority over DOM ancestry
        const activeElement = document.activeElement as HTMLElement | null;
        const settingsScope = settingsOpenRef.current
          ? (settingsTabRef.current === "recipes" ? "manual-recipe"
            : settingsTabRef.current === "profile" ? "profile" : null)
          : null;
        // When the activity dropdown (Radix portal) is open, focus moves outside #section-activity.
        // Detect this via the data-dropdown-open attribute set by ActivityInput.
        const activityDropdownOpen = !!document.querySelector("#section-activity[data-dropdown-open]");
        const scope = settingsScope
          ?? (activeElement?.closest('[data-voice-scope="manual-recipe"]')
            ? "manual-recipe"
            : activeElement?.closest('[data-voice-scope="profile"]')
              ? "profile"
              : activeElement?.closest("#section-neuer-eintrag")
                ? "nutrition"
                : (activeElement?.closest("#section-activity") || activityDropdownOpen)
                  ? "activity"
                  : null);

        // Settings scopes take priority over date navigation
        if (scope && (scope === "profile" || scope === "manual-recipe")) {
          window.dispatchEvent(new CustomEvent("mampflogger:field-command", { detail: { action, scope } }));
          return;
        }

        // Date navigation mode: next/prev navigate days
        if (dateFocusedRef.current && (action === "field:next" || action === "field:prev")) {
          const offset = action === "field:next" ? 1 : -1;
          navigateDay(offset);
          return;
        }

        if (scope) {
          window.dispatchEvent(new CustomEvent("mampflogger:field-command", { detail: { action, scope } }));
        }
      }
      else if (action === "action:weekly-analysis") {
        closeSettingsAndDo(() => {
          const needsTabSwitch = activeTabRef.current !== "weekly";
          if (needsTabSwitch) setActiveTab("weekly");
          setWeeklyCoachAnalyzeRequest((prev) => prev + 1);
          setTimeout(() => sectionNav.scrollToSection("section-ki-coach"), needsTabSwitch ? 250 : 0);
        });
      }
    }, [closeSettingsAndDo]),
    onUnhandledSpeech: useCallback((transcript: string, isInterim: boolean) => {
      if (!isInterim && dateFocusedRef.current && /\b(okay|ok|fertig|beenden|schließen|schliessen)\b/i.test(transcript.toLowerCase())) {
        setDateFocused(false);
        dateFocusedRef.current = false;
        return;
      }

      // Weight section: route number / OK to WeightTracker
      if (!isInterim) {
        const ae = document.activeElement as HTMLElement | null;
        const inWeight = !!ae?.closest?.("#section-gewicht");
        if (inWeight) {
          const lower = transcript.toLowerCase().trim();
          if (/^(?:okay|ok|speichern|buchen|fertig|übernehmen|uebernehmen)\b/i.test(lower)) {
            window.dispatchEvent(new CustomEvent("mampflogger:weight-save"));
            return;
          }
          if (/^(?:löschen|loeschen|clear|leeren)\b/i.test(lower)) {
            window.dispatchEvent(new CustomEvent("mampflogger:weight-set", { detail: { value: "" } }));
            return;
          }
          const num = parseGermanSpokenNumber(lower);
          if (num !== null && num > 0 && num < 500) {
            window.dispatchEvent(new CustomEvent("mampflogger:weight-set", { detail: { value: num } }));
            return;
          }
        }
      }

      if (settingsOpenRef.current) {
        const currentTab = settingsTabRef.current;
        if (!isInterim) {
          const lower = transcript.toLowerCase();

          // Design tab: color keywords — catch broadly to prevent food-input leaks
          if (currentTab === "design") {
            const colorMatch =
              /\bblau\b/.test(lower) ? "blue" :
              /\bgelb\b/.test(lower) ? "yellow" :
              /\bpink\b/.test(lower) ? "pink" :
              /\bgr(?:ü|ue)n(?:e|en|em|es)?\b/.test(lower) ? "green" :
              /\borange(?:n|s)?\b/.test(lower) ? "orange" :
              /\bt(?:ü|ue)rkis(?:e|en|em|es)?\b/.test(lower) ? "teal" :
              /\brot(?:e|en|em|es)?\b/.test(lower) ? "red" :
              /\bgrau(?:e|en|em|es)?\b/.test(lower) ? "gray" : null;
            if (colorMatch) { setColorTheme(colorMatch as ColorTheme); return; }
            if (/\bdark\b|\bdunkel/.test(lower)) { setDarkMode(true); return; }
            if (/\blight\b|\bhell/.test(lower)) { setDarkMode(false); return; }
          }

          // Food tab: categories, filters, numbered selection, food editor commands
          if (currentTab === "food") {
            // X / clear search field
            if (/^\s*(?:x|iks|ix|ex)\s*$/i.test(lower) || /\b(?:kreuz|löschen)\b/i.test(lower)) { setSettingsVoiceAction("food-clear-search"); return; }
            if (/\bneu\b/i.test(lower) || /\bnew\s*food\b/i.test(lower) || /\bneue?s?\s+lebensmittel\b/i.test(lower)) { setSettingsVoiceAction("new-food"); return; }
            if (/\bsuchen\b/i.test(lower)) { setSettingsVoiceAction("food-search"); return; }
            if (/\balle\b/i.test(lower)) { setSettingsVoiceAction("category:alle"); return; }
            // Food editor voice commands
            if (/\bnährwerte?\b/i.test(lower)) { setSettingsVoiceAction("food-ai-lookup"); return; }
            if (/\b(speichern)\b/i.test(lower)) { setSettingsVoiceAction("food-save"); return; }
            if (/\b(okay|ok|ja)\b/i.test(lower)) { setSettingsVoiceAction("food-save"); return; }
            if (/\b(nächstes|next)\b/i.test(lower)) { setSettingsVoiceAction("food-next"); return; }
            if (/\b(zurück|back|tabelle)\b/i.test(lower)) { setSettingsVoiceAction("food-back"); return; }
            const catMap: [RegExp, string][] = [
              [/\bfleisch\b/i, "Fleisch&Wurst"], [/\bwurst\b/i, "Fleisch&Wurst"],
              [/\bfisch\b/i, "Fisch&Meeresfrüchte"], [/\bmeeresfrüchte\b/i, "Fisch&Meeresfrüchte"],
              [/\bkäse\b/i, "Käse"], [/\bnüsse\b/i, "Nüsse&Samen"], [/\bsamen\b/i, "Nüsse&Samen"],
              [/\bgemüse\b/i, "Gemüse"], [/\bgetreide\b/i, "Getreide und Teigwaren"], [/\bbrot\b/i, "Getreide und Teigwaren"], [/\bteigwaren\b/i, "Getreide und Teigwaren"],
              [/\böle\b/i, "Öle&Fette"], [/\bfette\b/i, "Öle&Fette"],
              [/\bgetränke\b/i, "Getränke"], [/\bobst\b/i, "Obst"],
              [/\bmilchprodukte\b/i, "Milchprodukte"], [/\bsüßwaren\b/i, "Süßwaren"],
              [/\bstreetfood\b/i, "Streetfood"], [/\bgewürze\b/i, "Gewürze"],
              [/\bsonstige(s)?\b/i, "Sonstiges"], [/\beigene\b/i, "Eigene"],
              [/\bfertiggerichte\b/i, "Fertiggerichte"],
            ];
            for (const [re, cat] of catMap) {
              if (re.test(lower)) { setSettingsVoiceAction(`category:${cat}`); return; }
            }
            const filterMap: [RegExp, string][] = [
              [/\bvegan\b/i, "vgn"], [/\bvegetarisch\b/i, "vgt"],
              [/\blow\s*carb\b/i, "lc"], [/\bhigh\s*protein\b/i, "hp"],
              [/\bketo\b/i, "ket"], [/\bglutenfrei\b/i, "gf"],
              [/\blaktosefrei\b/i, "lf"], [/\bzuckerfrei\b/i, "zf"],
            ];
            for (const [re, key] of filterMap) {
              if (re.test(lower)) { setSettingsVoiceAction(`filter:${key}`); return; }
            }

            const selectionIndex = parseSpokenSelectionIndex(lower, { allowBareNumber: true });
            if (selectionIndex !== null) {
              if (/\b(?:dropdown|kategorie)\b/i.test(lower)) {
                setSettingsVoiceAction(`food-category-option:${selectionIndex}`);
                return;
              }
              if (/\b(?:hilfsmittel|kochmütze|kochmuetze|zutat|zutaten|rezept)\b/i.test(lower)) {
                setSettingsVoiceAction(`recipe-food:${selectionIndex}`);
                return;
              }
              setSettingsVoiceAction(`food-item:${selectionIndex}`);
              return;
            }

            // Fallback: route unmatched speech to food search field
            setSettingsVoiceAction(`food-search-text:${transcript}`);
            return;
          }

          // Data tab: backup commands
          if (currentTab === "data") {
            if (/\bbackup\s*erstellen\b/i.test(lower) || /\bsicherung\s*erstellen\b/i.test(lower)) {
              setSettingsVoiceAction("backup-create"); return;
            }
            if (/\bbackup\s*laden\b/i.test(lower) || /\bsicherung\s*laden\b/i.test(lower) || /\bbackup\s*wiederherstellen\b/i.test(lower)) {
              setSettingsVoiceAction("backup-load"); return;
            }
          }

          // Recipes tab: show/close and number selection
          if (currentTab === "recipes") {
            // If manual recipe form is open, keep close commands inside the active recipe UI.
            const manualFormOpen = !!document.querySelector('[data-voice-scope="manual-recipe"]');

            if (!manualFormOpen && /\b(?:schließen|schliessen|zumachen|zuklappen|zurück|zurueck)\b/i.test(lower)) {
              setSettingsVoiceAction("recipe:-1");
              return;
            }
            if (!manualFormOpen && /\b(?:neues?\s+rezept|neu)\b/i.test(lower)) {
              setSettingsVoiceAction("new-recipe");
              return;
            }

            if (!manualFormOpen) {
              const recipeIndex = parseSpokenSelectionIndex(lower, {
                allowBareNumber: true,
                keywords: ["zeige", "rezept", "nimm", "nummer", "öffne", "oeffne"],
              });
              if (recipeIndex !== null) {
                setSettingsVoiceAction(`recipe:${recipeIndex}`);
                return;
              }
            }
          }
        }

        if (currentTab === "recipes") {
          recipeVoiceRef.current?.(transcript, isInterim);
        }
        if (currentTab === "profile") {
          profileVoiceRef.current?.(transcript, isInterim);
        }
        if (currentTab === "food" && isInterim) {
          setSettingsVoiceAction(`food-search-text:${transcript}`);
        }
        return; // Don't pass to food input when in settings
      }

      // Nutrient info voice commands (weekly tab only)
      if (activeTabRef.current === "weekly") {
        const lower = transcript.toLowerCase();
        const activeNutrientKind = getNutrientKindForSection(activeSectionRef.current);

        // Weekday selection for "Makros pro Tag" section
        if (!isInterim && activeSectionRef.current === "section-makros-pro-tag") {
          const weekdayMap: Record<string, string> = {
            montag: "Mo", dienstag: "Di", mittwoch: "Mi", donnerstag: "Do",
            freitag: "Fr", samstag: "Sa", sonnabend: "Sa", sonntag: "So",
          };
          for (const [spoken, short] of Object.entries(weekdayMap)) {
            if (lower.includes(spoken)) {
              // Find index in current weekData by matching label
              const badges = document.querySelectorAll("#section-makros-pro-tag button");
              for (let i = 0; i < badges.length; i++) {
                if (badges[i].textContent?.trim() === short) {
                  window.dispatchEvent(new CustomEvent("mampflogger:macro-day-select", { detail: { index: i } }));
                  break;
                }
              }
              return;
            }
          }
        }

        // While a nutrient section is active, keep routing stable and ignore interim spillover.
        if (activeNutrientKind && isInterim) return;

        if (!isInterim) {
          if (activeNutrientKind === "vitamins") {
            const shortcutKey = matchActiveVitaminShortcut(lower);
            if (shortcutKey) {
              window.dispatchEvent(new CustomEvent("mampflogger:nutrient-info", { detail: { key: shortcutKey, kind: "vitamins" } }));
              return;
            }
          }

          const nutrientMatch = matchNutrientVoice(lower, activeNutrientKind ?? undefined);
          if (nutrientMatch) {
            window.dispatchEvent(new CustomEvent("mampflogger:nutrient-info", { detail: nutrientMatch }));
            return;
          }

          // Close nutrient info (scope-aware when section is focused)
          if (/\b(schließen|schliessen|zumachen|zuklappen)\b/i.test(lower)) {
            if (activeNutrientKind) {
              window.dispatchEvent(new CustomEvent("mampflogger:nutrient-info", { detail: { key: "__close__", kind: activeNutrientKind } }));
            } else {
              window.dispatchEvent(new CustomEvent("mampflogger:nutrient-info", { detail: { key: "__close__", kind: "vitamins" } }));
              window.dispatchEvent(new CustomEvent("mampflogger:nutrient-info", { detail: { key: "__close__", kind: "minerals" } }));
            }
            return;
          }

          // In active nutrient scope, do not leak to neighbouring sections.
          if (activeNutrientKind) return;
        }
      }

      // Table voice commands when Tagesübersicht is active
      if (!isInterim) {
        const lower2 = transcript.toLowerCase();
        const normalizedTableTranscript = lower2
          .replace(/[.,;:!?]/g, " ")
          .replace(/\beiweiß\b/g, "eiweiss")
          .replace(/\beiweis\b/g, "eiweiss")
          .replace(/\bt[\s.-]*i[\s.-]*m[\s.-]*e\b/g, "time")
          .replace(/\bp[\s.-]*r[\s.-]*o\b/g, "pro")
          .replace(/\bf[\s.-]*a[\s.-]*t\b/g, "fat")
          .replace(/\bk[\s.-]*h\b/g, "kh")
          .replace(/\bf[\s.-]*i[\s.-]*b\b/g, "fib")
          .replace(/\bpfeffer\b/g, "fiber")
          .replace(/\s+/g, " ")
          .trim();
        const activeElement = document.activeElement as HTMLElement | null;
        const isTagesVoiceScopeActive =
          !!document.getElementById("section-tagesuebersicht") &&
          !!activeElement?.closest?.("#section-tagesuebersicht");

        if (isTagesVoiceScopeActive) {
          if (/\b(?:detail(?:ansicht)?|einzel(?:ansicht)?|liste)\b/i.test(normalizedTableTranscript)) {
            setTableViewMode("detail");
            return;
          }

          if (/\b(?:summen?(?:ansicht)?|kompakt|komprimiert)\b/i.test(normalizedTableTranscript)) {
            setTableViewMode("summen");
            return;
          }

          const sortMap: [RegExp, "time" | "food" | "count" | "amount" | "calories" | "protein" | "fat" | "carbs" | "fiber"][] = [
            [/\b(?:zeit|uhrzeit|time|tim|taim)\b/i, "time"],
            [/\b(?:lebensmittel|food|alphabetisch)\b/i, "food"],
            [/\b(?:anz(?:ahl)?|count|haeufigkeit|häufigkeit)\b/i, "count"],
            [/\b(?:gramm|milliliter|g(?:\s*\/\s*|\s+pro\s+)ml|menge)\b/i, "amount"],
            [/\b(?:kcal|kalorien|kilokalorien|calories)\b/i, "calories"],
            [/\b(?:pro|protein[ea]?|eiweiss)\b/i, "protein"],
            [/\b(?:fat|fett[ea]?)\b/i, "fat"],
            [/\b(?:kh|kohlenhydrat[ea]?|carbs?|carbohydrates?|zucker|sugar)\b/i, "carbs"],
            [/\b(?:fib|fiber|fibre|pfeffer|ballaststoff[ea]?|ballast)\b/i, "fiber"],
          ];
          for (const [re, key] of sortMap) {
            if (key === "time" && tableViewMode === "summen") continue;
            if (key === "count" && tableViewMode !== "summen") continue;
            if (re.test(normalizedTableTranscript)) {
              window.dispatchEvent(new CustomEvent("mampflogger:table-sort", { detail: { key } }));
              return;
            }
          }
        }

        // --- Wochenansicht voice scope ---
        const isWochenVoiceScopeActive =
          !!document.getElementById("section-wochenansicht") &&
          !!activeElement?.closest?.("#section-wochenansicht");

        if (isWochenVoiceScopeActive) {
          if (/\b(?:detail(?:ansicht)?|einzel(?:ansicht)?|liste)\b/i.test(normalizedTableTranscript)) {
            window.dispatchEvent(new CustomEvent("mampflogger:weekly-table-view", { detail: { mode: "detail" } }));
            return;
          }
          if (/\b(?:summen?(?:ansicht)?|kompakt|komprimiert)\b/i.test(normalizedTableTranscript)) {
            window.dispatchEvent(new CustomEvent("mampflogger:weekly-table-view", { detail: { mode: "summen" } }));
            return;
          }
          const weeklySortMap: [RegExp, string][] = [
            [/\b(?:datum|date)\b/i, "date"],
            [/\b(?:lebensmittel|food|alphabetisch)\b/i, "food"],
            [/\b(?:anz(?:ahl)?|count|haeufigkeit|häufigkeit)\b/i, "count"],
            [/\b(?:gramm|milliliter|g(?:\s*\/\s*|\s+pro\s+)ml|menge)\b/i, "amount"],
            [/\b(?:kcal|kalorien|kilokalorien|calories)\b/i, "calories"],
            [/\b(?:pro|protein[ea]?|eiweiss)\b/i, "protein"],
            [/\b(?:fat|fett[ea]?)\b/i, "fat"],
            [/\b(?:kh|kohlenhydrat[ea]?|carbs?|carbohydrates?|zucker|sugar)\b/i, "carbs"],
            [/\b(?:fib|fiber|fibre|pfeffer|ballaststoff[ea]?|ballast)\b/i, "fiber"],
          ];
          for (const [re, key] of weeklySortMap) {
            if (re.test(normalizedTableTranscript)) {
              window.dispatchEvent(new CustomEvent("mampflogger:weekly-table-sort", { detail: { key } }));
              return;
            }
          }
        }
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const isActivityFocused = !!activeElement?.closest("#section-activity");
      const activityDropdownOpen = !!document.querySelector("#section-activity[data-dropdown-open]");
      const isNutritionFocused = !!activeElement?.closest("#section-neuer-eintrag");
      const isSupplementFocused = !!activeElement?.closest("#section-supplements") || activeSectionRef.current === "section-supplements";
      const shouldRouteToActivity = isActivityFocused || activityDropdownOpen || (!isNutritionFocused && !isSupplementFocused && Date.now() < activityVoiceCaptureUntilRef.current);

      if (isSupplementFocused) {
        // Handle "neu" locally within supplement scope
        if (!isInterim) {
          const lower = transcript.toLowerCase().trim();
          if (/^\s*neu\s*$/i.test(lower) || /\bneue?s?\s+supplement\b/i.test(lower) || /\bsupplement\s+hinzufügen\b/i.test(lower)) {
            window.dispatchEvent(new Event("mampflogger:supplement-new"));
            return;
          }
          if (/\b(?:storno|abbrechen|cancel)\b/i.test(lower)) {
            window.dispatchEvent(new Event("mampflogger:supplement-cancel"));
            return;
          }
          if (/\b(?:okay|ok|speichern|save)\b/i.test(lower)) {
            window.dispatchEvent(new Event("mampflogger:supplement-save"));
            return;
          }
          if (/\b(?:löschen|loeschen|delete|entfernen)\b/i.test(lower)) {
            window.dispatchEvent(new Event("mampflogger:supplement-delete-last"));
            return;
          }
        }
        supplementVoiceRef.current?.(transcript, isInterim);
        return;
      }

      if (shouldRouteToActivity) {
        activityVoiceCaptureUntilRef.current = Date.now() + 4000;
        activityVoiceRef.current?.(transcript, isInterim);
        return;
      }

      nutritionVoiceRef.current?.(transcript, isInterim);
    }, [tableViewMode]),
  });

  // Keep a ref to activeTab for use in callbacks
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Mark active section from user interaction (click/tap/focus) for stable scoped voice control
  useEffect(() => {
    const markActiveFromTarget = (target: EventTarget | null) => {
      const el = (target as HTMLElement | null)?.closest?.("[data-section][id]") as HTMLElement | null;
      if (el?.id) {
        sectionNav.setActiveSection(el.id);
        // Clear date focus when user interacts with a content section
        if (dateFocusedRef.current) {
          setDateFocused(false);
          dateFocusedRef.current = false;
        }
      }
    };

    const onPointerDown = (event: PointerEvent) => markActiveFromTarget(event.target);
    const onFocusIn = (event: FocusEvent) => markActiveFromTarget(event.target);

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [sectionNav.setActiveSection]);

  // Keep active section heading visually marked while focused/active
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-section][id]");
    sections.forEach((section) => {
      if (section.id === sectionNav.activeSection) {
        section.setAttribute("data-section-active", "true");
      } else {
        section.removeAttribute("data-section-active");
      }
    });
    // Close any open dropdowns/popovers when leaving a section or switching tabs
    window.dispatchEvent(new CustomEvent("mampflogger:close-food-dropdown"));
    // Auto-focus food input when "Neuer Eintrag" section becomes active
    if (sectionNav.activeSection === "section-neuer-eintrag") {
      requestAnimationFrame(() => {
        const section = document.getElementById("section-neuer-eintrag");
        const input = section?.querySelector<HTMLInputElement>("input[placeholder*='Haferflocken']");
        if (input && document.activeElement !== input) {
          input.focus();
        }
      });
    }
  }, [sectionNav.activeSection, activeTab]);

  // Disarm mic while audio guide is speaking to prevent keyword pickup
  const wasArmedBeforeSpeechRef = useRef(false);
  const isArmedRef = useRef(voiceCommands.isArmed);
  isArmedRef.current = voiceCommands.isArmed;
  const armRef = useRef(voiceCommands.arm);
  armRef.current = voiceCommands.arm;
  const disarmRef = useRef(voiceCommands.disarm);
  disarmRef.current = voiceCommands.disarm;

  useEffect(() => {
    audioGuide.onSpeakingChange((speaking: boolean) => {
      if (speaking && isArmedRef.current) {
        wasArmedBeforeSpeechRef.current = true;
        disarmRef.current();
      } else if (!speaking && wasArmedBeforeSpeechRef.current) {
        wasArmedBeforeSpeechRef.current = false;
        armRef.current();
      }
    });
    return () => audioGuide.onSpeakingChange(null);
  }, [audioGuide.onSpeakingChange]);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("mampflogger-dark-mode");
    if (saved !== null) return saved === "true";
    return false;
  });
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    return (localStorage.getItem("mampflogger-color-theme") as ColorTheme) || "yellow";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("mampflogger-dark-mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove("theme-yellow", "theme-blue", "theme-pink", "theme-orange", "theme-teal", "theme-red", "theme-gray");
    if (colorTheme !== "green") {
      el.classList.add(`theme-${colorTheme}`);
    }
    localStorage.setItem("mampflogger-color-theme", colorTheme);
  }, [colorTheme]);

  // Auto-seed initial weight: if no weight has been booked yet but we have
  // protocol entries and a profile, anchor the start at the earliest entry
  // date with the profile weight, so the chart and target calculations have
  // a meaningful starting point.
  useEffect(() => {
    if (!profile) return;
    if (weightLog.length > 0) return;
    if (entries.length === 0) return;
    const earliest = entries.reduce(
      (min, e) => (e.date < min ? e.date : min),
      entries[0].date,
    );
    const seeded: WeightEntry[] = [{ date: earliest, kg: profile.weightKg }];
    setWeightLog(seeded);
    saveWeightLog(seeded);
  }, [profile, weightLog.length, entries.length]);

  useEffect(() => {
    const loadedEntries = loadEntries();
    const loadedProfile = loadProfile();
    const loadedActivities = loadBookedActivities();
    const loadedSupplements = loadSupplements();

    setEntries(loadedEntries);
    setProfile(loadedProfile);
    setBookedActivities(loadedActivities);
    setSupplements(loadedSupplements);
    setDarkMode(localStorage.getItem("mampflogger-dark-mode") === "true");
    setColorTheme((localStorage.getItem("mampflogger-color-theme") as ColorTheme) || "yellow");

    const hasProfile = hasConfiguredPersonalProfile(loadedProfile);
    setStartupProfilePrompt(!hasProfile);

    if (hasProfile) {
      focusFoodField(350);
      // Activate "Neuer Eintrag" section on startup so audio guide can trigger
      setTimeout(() => sectionNav.setActiveSection("section-neuer-eintrag"), 400);
    }

    const remoteUrl = loadRemoteUrl();
    if (remoteUrl) {
      syncRemoteFoodDatabase(remoteUrl).then(({ added, error }) => {
        if (error) {
          console.warn(`[App] Remote-Sync Fehler: ${error}`);
        } else if (added > 0) {
          console.info(`[App] ${added} neue Lebensmittel aus Remote-DB geladen`);
          reloadFoodDatabase();
        }
      });
    }
  }, [focusFoodField, cloudBackup.restoreRevision]);

   // Voice auto-start handled in useVoiceCommands hook (standby mode)

  const todayEntries = useMemo(
    () => entries.filter((e) => e.date === selectedDate),
    [entries, selectedDate]
  );

  const todaySummary = useMemo(
    () => calculateDailySummary(todayEntries),
    [todayEntries]
  );

  const activityBonus = useMemo(
    () => calculateBookedActivityBonus(bookedActivities, selectedDate),
    [bookedActivities, selectedDate]
  );

  const supplementNutrients = useMemo(
    () => {
      const result = aggregateSupplementNutrients(supplements);
      return {
        vitamins: result.vitamins as unknown as Record<string, number>,
        minerals: result.minerals as unknown as Record<string, number>,
      };
    },
    [supplements]
  );

  const handleAdd = (entry: NutritionEntry) => {
    if (editingEntry) {
      const updated = entries.map((e) => (e.id === editingEntry.id ? entry : e));
      setEntries(updated);
      saveEntries(updated);
      setEditingEntry(null);
    } else {
    const updated = [...entries, entry];
      setEntries(updated);
      saveEntries(updated);
      // Reset table to detail view sorted by time descending
      setTableViewMode("detail");
    }
  };

  const handleAddMultiple = (newEntries: NutritionEntry[]) => {
    const updated = [...entries, ...newEntries];
    setEntries(updated);
    saveEntries(updated);
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  };

  const handleEntryClick = (entry: NutritionEntry) => {
    setEditingEntry(entry);
    setSelectedDate(entry.date);
  };

  const handleImport = (newEntries: NutritionEntry[]) => {
    const existingKeys = new Set(
      entries.map((e) => `${e.date}|${e.time}|${e.food}|${e.amount}`)
    );
    const unique = newEntries.filter(
      (e) => !existingKeys.has(`${e.date}|${e.time}|${e.food}|${e.amount}`)
    );
    if (unique.length === 0) {
      return;
    }
    const updated = [...entries, ...unique];
    setEntries(updated);
    saveEntries(updated);
  };

  const handleSaveProfile = (p: UserProfile) => {
    setProfile(p);
    setStartupProfilePrompt(false);
    saveProfile(p);
  };

  const handleApplyTestData = (gender: TestDataGender) => {
    const dataset = applyEmbeddedTestDataset(gender);
    setProfile(dataset.profile);
    setEntries(dataset.entries);
    setBookedActivities(dataset.bookedActivities);
    setEditingEntry(null);
    setEditingActivity(null);
    setSelectedDate(formatDate(new Date()));
    setColorTheme(gender === "female" ? "pink" : "yellow");
    setActiveTab("log");
    setStartupProfilePrompt(false);
  };

  const handleDeleteTestData = () => {
    clearProfile();
    saveEntries([]);
    saveBookedActivities([]);
    localStorage.removeItem("mampflogger-saved-recipes");
    setProfile(null);
    setEntries([]);
    setBookedActivities([]);
    setEditingEntry(null);
    setEditingActivity(null);
    setSelectedDate(formatDate(new Date()));
    setColorTheme("yellow");
    setActiveTab("log");
    setStartupProfilePrompt(true);
    setSettingsCurrentTab("profile");
  };

  const handleAddBookedActivity = (activity: BookedActivity) => {
    const updated = [...bookedActivities, activity];
    setBookedActivities(updated);
    saveBookedActivities(updated);
  };

  const handleImportActivities = (newActivities: BookedActivity[]) => {
    const updated = [...bookedActivities, ...newActivities];
    setBookedActivities(updated);
    saveBookedActivities(updated);
  };

  const handleDeleteBookedActivity = (id: string) => {
    const updated = bookedActivities.filter((a) => a.id !== id);
    setBookedActivities(updated);
    saveBookedActivities(updated);
  };

  const handleEditBookedActivity = (activity: BookedActivity) => {
    const updated = bookedActivities.map((a) => (a.id === activity.id ? activity : a));
    setBookedActivities(updated);
    saveBookedActivities(updated);
    setEditingActivity(null);
  };

  const handleActivityClick = (activity: BookedActivity) => {
    setEditingActivity(activity);
  };

  const countEntriesInRange = (from: string, to: string): number => {
    return entries.filter((e) => e.date >= from && e.date <= to).length;
  };

  const deleteEntriesInRange = (from: string, to: string): number => {
    const toDelete = entries.filter((e) => e.date >= from && e.date <= to);
    const updated = entries.filter((e) => e.date < from || e.date > to);
    setEntries(updated);
    saveEntries(updated);
    return toDelete.length;
  };

  const deleteAllEntries = (): number => {
    const count = entries.length;
    setEntries([]);
    saveEntries([]);
    return count;
  };

  const deleteAllActivities = (): number => {
    const count = bookedActivities.length;
    setBookedActivities([]);
    saveBookedActivities([]);
    return count;
  };

  // Day navigation with future block
  const navigateDay = useCallback((offset: number) => {
    setSelectedDate((prev) => {
      const current = new Date(prev + "T00:00:00");
      current.setDate(current.getDate() + offset);
      const next = formatDate(current);
      const today = formatDate(new Date());
      if (offset > 0 && next > today) return prev;
      return next;
    });
  }, []);

  // Long-press acceleration
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef(0);

  const startNavigate = useCallback((offset: number) => {
    navigateDay(offset);
    countRef.current = 0;

    const tick = () => {
      navigateDay(offset);
      countRef.current++;
      let delay = 300;
      if (countRef.current > 15) delay = 30;
      else if (countRef.current > 8) delay = 80;
      else if (countRef.current > 3) delay = 150;
      intervalRef.current = setTimeout(tick, delay);
    };

    intervalRef.current = setTimeout(tick, 400);
  }, [navigateDay]);

  const stopNavigate = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    countRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, []);

  const isToday = selectedDate === formatDate(new Date());

  const dateObj = new Date(selectedDate + "T00:00:00");
  const displayWeekday = dateObj.toLocaleDateString("de-DE", { weekday: "long" });
  const displayDateOnly = dateObj.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hl = sectionNav.highlightedSection;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-full max-w-none lg:max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 no-underline text-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1"  y="10" width="3" height="7" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                  <rect x="5"  y="6"  width="3" height="11" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                  <rect x="9"  y="8"  width="3" height="9"  rx="0.8" fill="currentColor" className="text-primary-foreground" />
                  <rect x="13" y="3"  width="3" height="14" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                </svg>
              </div>
              <h1 className="text-lg font-bold tracking-tight">MampfLogger</h1>
            </a>
            <div className="flex items-center gap-1">
              
              <Button
                  variant="ghost"
                  size="icon"
                  onPointerDown={(e) => {
                    // Remember the previously focused element before the button steals focus
                    const prev = document.activeElement as HTMLElement | null;
                    if (prev && prev !== e.currentTarget) {
                      (e.currentTarget as HTMLElement).dataset.restoreFocus = prev.id || "";
                    }
                  }}
                  onClick={(e) => {
                    voiceCommands.toggle();
                    // Restore focus to the previously focused input
                    const restoreId = (e.currentTarget as HTMLElement).dataset.restoreFocus;
                    if (restoreId) {
                      setTimeout(() => document.getElementById(restoreId)?.focus(), 50);
                      delete (e.currentTarget as HTMLElement).dataset.restoreFocus;
                    }
                  }}
                  className={`h-8 w-8 ${voiceCommands.isArmed ? "ring-2 ring-primary animate-pulse" : ""}`}
                  title={voiceCommands.isArmed ? "Mikrofon aus (Standby)" : "Sprachsteuerung aktivieren"}
                >
                  <Mic className="w-4 h-4" />
                </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${audioGuide.isSpeaking ? "ring-2 ring-primary animate-pulse" : ""}`}
                onClick={() => {
                  if (audioGuide.isSpeaking) {
                    audioGuide.stop();
                  } else {
                    let currentSection = activeSectionRef.current;
                    if (!currentSection) {
                      const HEADER_OFFSET = 140;
                      const TOLERANCE = 80;
                      const allSections = Array.from(document.querySelectorAll("[data-section]"));
                      for (const el of allSections) {
                        const top = el.getBoundingClientRect().top;
                        if (top >= HEADER_OFFSET - TOLERANCE && top <= HEADER_OFFSET + 300) {
                          currentSection = el.id;
                          break;
                        }
                      }
                    }
                    if (currentSection) audioGuide.speak(currentSection);
                  }
                }}
                title={audioGuide.isSpeaking ? "Audio-Hilfe stoppen" : "Audio-Hilfe abspielen"}
              >
                <Ear className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${activeTab === "log" && !settingsOpen ? "ring-2 ring-primary bg-muted" : ""} ${highlightedTab === "log" ? "section-card-highlight rounded-lg" : ""}`}
                onClick={() => { setActiveTab("log"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                title="Eingabe"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${activeTab === "weekly" && !settingsOpen ? "ring-2 ring-primary bg-muted" : ""} ${highlightedTab === "weekly" ? "section-card-highlight rounded-lg" : ""}`}
                onClick={() => { setActiveTab("weekly"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                title="Statistik"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <SettingsDialog
                profile={profile}
                onSaveProfile={handleSaveProfile}
                onApplyTestData={handleApplyTestData}
                onDeleteTestData={handleDeleteTestData}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                colorTheme={colorTheme}
                onChangeTheme={setColorTheme}
                entries={entries}
                bookedActivities={bookedActivities}
                onImport={handleImport}
                onImportActivities={handleImportActivities}
                onCount={countEntriesInRange}
                onDelete={deleteEntriesInRange}
                onDeleteAll={deleteAllEntries}
                onDeleteAllActivities={deleteAllActivities}
                openToNewFood={openNewFood}
                onOpenToNewFoodHandled={() => setOpenNewFood(false)}
                openToRecipes={openRecipes}
                onOpenToRecipesHandled={() => setOpenRecipes(false)}
                activeTab={activeTab === "help" ? "log" : activeTab}
                onSetActiveTab={setActiveTab as (tab: "log" | "weekly") => void}
                initialOpen={settingsParam === "profile" || startupProfilePrompt}
                initialTab={settingsParam === "profile" || startupProfilePrompt ? "profile" : undefined}
                selectedDate={selectedDate}
                onAddEntry={handleAdd}
                recipeVoiceInputRef={recipeVoiceRef}
                profileVoiceInputRef={profileVoiceRef}
                voiceOpenTab={settingsVoiceTab}
                onVoiceOpenTabHandled={() => setSettingsVoiceTab(null)}
                voiceCloseRequest={settingsCloseRequest}
                onVoiceCloseHandled={() => setSettingsCloseRequest(false)}
                onOpenChange={setSettingsOpen}
                onTabChange={setSettingsCurrentTab}
                isMicSupported={voiceCommands.isSupported}
                isMicListening={voiceCommands.isArmed}
                onMicToggle={voiceCommands.toggle}
                isAudioGuideEnabled={audioGuide.enabled}
                onAudioGuideToggle={audioGuide.toggle}
                onAudioGuideStop={audioGuide.stop}
                isAudioGuideSpeaking={audioGuide.isSpeaking}
                onPlaySettingsHelp={(sectionId: string) => audioGuide.speak(sectionId)}
                voiceAction={settingsVoiceAction}
                onVoiceActionHandled={() => setSettingsVoiceAction(null)}
                highlightedTab={highlightedTab === "settings"}
                voiceControlVisible={voiceControlVisible}
              />
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${activeTab === "help" && !settingsOpen ? "ring-2 ring-primary bg-muted" : ""}`}
                onClick={() => { const next = activeTab === "help" ? "log" : "help"; setActiveTab(next); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                title="Hilfe"
              >
                <span className="text-base font-bold">?</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={async () => { await signOut(); navigate("/"); }}
                title="Ausloggen"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-none lg:max-w-lg mx-auto px-4 pb-8">
        {/* Top sticky card – Date nav or Help title */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-[9] -mx-4 px-4 pt-3 pb-0 bg-background">
          <div className={`glass-card rounded-xl p-3 mb-3 min-h-[4.5rem] transition-all duration-500 ${activeTab !== "help" && dateFocused ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""}`}>
            {activeTab === "help" ? (
              <div className="flex flex-col justify-center min-h-[2.5rem]">
                <p className="text-sm font-semibold">Hilfeseiten</p>
                <p className="text-xs text-muted-foreground">Klicke den Themenbereich an, zu dem du nähere Informationen benötigst.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onMouseDown={() => startNavigate(-1)}
                    onMouseUp={stopNavigate}
                    onMouseLeave={stopNavigate}
                    onTouchStart={(e) => { e.preventDefault(); startNavigate(-1); }}
                    onTouchEnd={stopNavigate}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  {dateFocused && <span className="text-xs text-primary font-medium animate-in fade-in duration-300">Zurück</span>}
                </div>
                <div className="text-center min-h-[2.5rem] flex flex-col justify-center cursor-pointer" onClick={() => { setDateFocused(f => !f); dateFocusedRef.current = !dateFocusedRef.current; }}>
                  <p className={`text-sm font-semibold transition-colors duration-500 ${dateFocused ? "text-primary" : ""}`}>{isToday ? "Heute" : displayWeekday}</p>
                  <p className={`text-xs transition-colors duration-500 ${dateFocused ? "text-primary/70" : "text-muted-foreground"}`}>{displayDateOnly}</p>
                </div>
                <div className="flex items-center gap-1">
                  {dateFocused && <span className={`text-xs text-primary font-medium animate-in fade-in duration-300 ${isToday ? "invisible" : ""}`}>Weiter</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    onMouseDown={() => !isToday && startNavigate(1)}
                    onMouseUp={stopNavigate}
                    onMouseLeave={stopNavigate}
                    onTouchStart={(e) => { e.preventDefault(); !isToday && startNavigate(1); }}
                    onTouchEnd={stopNavigate}
                    disabled={isToday}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {activeTab === "help" ? (
          <HelpContent />
        ) : activeTab === "log" ? (
          <>
            <div id="section-neuer-eintrag" data-section className={`glass-card rounded-xl p-3 mb-3 relative ${hl === "section-neuer-eintrag" ? "section-card-highlight" : ""}`}>
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                <PhotoToLog selectedDate={selectedDate} onAddEntries={handleAddMultiple} />
              </div>
              <SectionHeading highlighted={hl === "section-neuer-eintrag"} className="mb-4">
                {editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
              </SectionHeading>
              <NutritionForm
                onAdd={handleAdd}
                selectedDate={selectedDate}
                editingEntry={editingEntry}
                onCancelEdit={() => setEditingEntry(null)}
                onNewFood={() => setOpenNewFood(true)}
                voiceInputRef={nutritionVoiceRef}
                isVoiceActive={voiceCommands.isListening}
               />
              <p className="text-muted-foreground/60 text-xs text-center mt-2">Gib ein neues Lebensmittel mit Name und Menge ein</p>
              {audioGuide.isEditorOpenFor("section-neuer-eintrag") && <AudioGuideEditor sectionId="section-neuer-eintrag" value={audioGuide.getHelpText("section-neuer-eintrag")} onChange={audioGuide.updateHelpText} />}
            </div>

            <div id="section-tagesuebersicht" data-section tabIndex={-1} data-voice-active-section={sectionNav.activeSection === "section-tagesuebersicht" ? "true" : undefined} className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-tagesuebersicht" ? "section-card-highlight" : ""}`}>
              <SectionHeading highlighted={hl === "section-tagesuebersicht"} className="mb-2">
                Tagesprotokoll
                {todayEntries.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {todayEntries.length}
                  </span>
                )}
              </SectionHeading>
              <NutritionTable entries={todayEntries} onDelete={handleDelete} onEntryClick={handleEntryClick} viewMode={tableViewMode} onViewModeChange={setTableViewMode} />
              {audioGuide.isEditorOpenFor("section-tagesuebersicht") && <AudioGuideEditor sectionId="section-tagesuebersicht" value={audioGuide.getHelpText("section-tagesuebersicht")} onChange={audioGuide.updateHelpText} />}
            </div>

            <div id="section-kalorienaufnahme" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-kalorienaufnahme" ? "section-card-highlight" : ""}`}>
              <SectionHeading highlighted={hl === "section-kalorienaufnahme"} className="mb-2">
                Kalorienaufnahme 24 Stunden
              </SectionHeading>
              <DailyCalorieChart entries={todayEntries} />
              {audioGuide.isEditorOpenFor("section-kalorienaufnahme") && <AudioGuideEditor sectionId="section-kalorienaufnahme" value={audioGuide.getHelpText("section-kalorienaufnahme")} onChange={audioGuide.updateHelpText} />}
            </div>

            <div id="section-fastenanalyse" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-fastenanalyse" ? "section-card-highlight" : ""}`}>
              <SectionHeading highlighted={hl === "section-fastenanalyse"} className="mb-2">
                Fastenanalyse
              </SectionHeading>
              <FastingAnalysis entries={todayEntries} allEntries={entries} selectedDate={selectedDate} />
              {audioGuide.isEditorOpenFor("section-fastenanalyse") && <AudioGuideEditor sectionId="section-fastenanalyse" value={audioGuide.getHelpText("section-fastenanalyse")} onChange={audioGuide.updateHelpText} />}
            </div>

            {profile && (
              <div id="section-activity" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-activity" ? "section-card-highlight" : ""}`}>
                <SectionHeading highlighted={hl === "section-activity"} className="mb-2">
                  Activity
                </SectionHeading>
                <ActivityInput
                  bookedActivities={bookedActivities}
                  selectedDate={selectedDate}
                  onAddActivity={handleAddBookedActivity}
                  onDeleteActivity={handleDeleteBookedActivity}
                  onEditActivity={handleEditBookedActivity}
                  editingActivity={editingActivity}
                  onCancelEdit={() => setEditingActivity(null)}
                  activityBonus={activityBonus}
                  goalActivityBonus={profile.goalActivityBonus}
                  voiceInputRef={activityVoiceRef}
                  isVoiceActive={voiceCommands.isListening}
                  focusRequestId={activityFocusRequestId}
                 />
                {audioGuide.isEditorOpenFor("section-activity") && <AudioGuideEditor sectionId="section-activity" value={audioGuide.getHelpText("section-activity")} onChange={audioGuide.updateHelpText} />}
              </div>
            )}

            {profile && (
              <div id="section-kalorienbilanz" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-kalorienbilanz" ? "section-card-highlight" : ""}`}>
                <SectionHeading highlighted={hl === "section-kalorienbilanz"} className="mb-2">
                  Kalorienbilanz
                </SectionHeading>
                <DeficitDisplay profile={profile} activityBonus={activityBonus} consumedCalories={todaySummary.totalCalories} goalDeficit={profile.goalDeficit} />
                {audioGuide.isEditorOpenFor("section-kalorienbilanz") && <AudioGuideEditor sectionId="section-kalorienbilanz" value={audioGuide.getHelpText("section-kalorienbilanz")} onChange={audioGuide.updateHelpText} />}
              </div>
            )}

            {todayEntries.length > 0 && (
              <div id="section-makro-naehrstoffe" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-makro-naehrstoffe" ? "section-card-highlight" : ""}`}>
                <SectionHeading highlighted={hl === "section-makro-naehrstoffe"} className="mb-2">
                  Makro Nährstoffverteilung
                </SectionHeading>
                <MacroBar summary={todaySummary} />
                {audioGuide.isEditorOpenFor("section-makro-naehrstoffe") && <AudioGuideEditor sectionId="section-makro-naehrstoffe" value={audioGuide.getHelpText("section-makro-naehrstoffe")} onChange={audioGuide.updateHelpText} />}
              </div>
            )}

            {profile && (
              <div id="section-fluessigkeit" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-fluessigkeit" ? "section-card-highlight" : ""}`}>
                <SectionHeading highlighted={hl === "section-fluessigkeit"} className="mb-2">
                  Flüssigkeit
                </SectionHeading>
                <FluidDisplay
                  entries={todayEntries}
                  goalMl={profile.goalFluidMl}
                  onRecalculate={() => {
                    const refreshed = loadEntries();
                    setEntries(refreshed);
                  }}
                />
                {audioGuide.isEditorOpenFor("section-fluessigkeit") && <AudioGuideEditor sectionId="section-fluessigkeit" value={audioGuide.getHelpText("section-fluessigkeit")} onChange={audioGuide.updateHelpText} />}
              </div>
            )}

            {profile && (
              <div id="section-gewicht" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-gewicht" ? "section-card-highlight" : ""}`}>
                <SectionHeading highlighted={hl === "section-gewicht"} className="mb-2">
                  Gewicht
                </SectionHeading>
                <WeightTracker
                  profile={profile}
                  entries={entries}
                  bookedActivities={bookedActivities}
                  weightLog={weightLog}
                  selectedDate={selectedDate}
                  onSaveWeight={(date, kg) => {
                    const updated = setWeightForDate(weightLog, date, kg);
                    setWeightLog(updated);
                    saveWeightLog(updated);
                  }}
                />
                {audioGuide.isEditorOpenFor("section-gewicht") && <AudioGuideEditor sectionId="section-gewicht" value={audioGuide.getHelpText("section-gewicht")} onChange={audioGuide.updateHelpText} />}
              </div>
            )}

            {profile && (() => {
              const heightM = profile.heightCm / 100;
              if (!heightM || heightM <= 0) return null;
              const startBmi = profile.weightKg / (heightM * heightM);
              const goalBmi = profile.goalWeightKg ? profile.goalWeightKg / (heightM * heightM) : null;
              const effectiveWeight = (() => {
                const sorted = [...weightLog]
                  .filter((w) => w.date <= selectedDate)
                  .sort((a, b) => b.date.localeCompare(a.date));
                return sorted[0]?.kg ?? profile.weightKg;
              })();
              const currentBmi = effectiveWeight / (heightM * heightM);
              const fmt = (n: number) => n.toFixed(1).replace(".", ",");
              const bmiCategory = (b: number) =>
                b < 18.5 ? "Untergewicht"
                : b < 25 ? "Normalgewicht"
                : b < 30 ? "Übergewicht"
                : b < 35 ? "Adipositas I"
                : b < 40 ? "Adipositas II"
                : "Adipositas III";
              let progress: number | null = null;
              if (goalBmi !== null && Math.abs(startBmi - goalBmi) > 0.01) {
                const totalDelta = startBmi - goalBmi;
                const currentDelta = startBmi - currentBmi;
                progress = Math.max(0, Math.min(100, Math.round((currentDelta / totalDelta) * 100)));
              }
              return (
                <div id="section-bmi" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-bmi" ? "section-card-highlight" : ""}`}>
                  <SectionHeading highlighted={hl === "section-bmi"} className="mb-2">
                    BMI
                  </SectionHeading>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5 text-xs">
                      <span className="text-muted-foreground font-medium">Aktueller BMI</span>
                      <span className="font-bold text-foreground">{fmt(currentBmi)} <span className="text-muted-foreground font-normal">({bmiCategory(currentBmi)})</span></span>
                    </div>
                    {goalBmi !== null && progress !== null && (
                      <>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: progress >= 100 ? "hsl(var(--success))" : "hsl(var(--primary))",
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Start BMI {fmt(startBmi)} → Ziel BMI {fmt(goalBmi)}</span>
                          <span className="font-bold text-foreground">{progress}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {progress >= 100
                            ? <span>Du hast dein BMI-Ziel erreicht!</span>
                            : <span>Du hast schon <span className="font-bold">{progress} %</span> deines BMI-Ziels erreicht.</span>
                          }
                        </div>
                      </>
                    )}
                  </div>
                  {audioGuide.isEditorOpenFor("section-bmi") && <AudioGuideEditor sectionId="section-bmi" value={audioGuide.getHelpText("section-bmi")} onChange={audioGuide.updateHelpText} />}
                </div>
              );
            })()}

            <div id="section-supplements" data-section className={`glass-card rounded-xl p-3 mb-3 ${hl === "section-supplements" ? "section-card-highlight" : ""}`}>
              <SectionHeading highlighted={hl === "section-supplements"} className="mb-2">
                Supplements
              </SectionHeading>
              <SupplementTracker
                supplements={supplements}
                onSupplementsChange={(updated) => {
                  setSupplements(updated);
                  saveSupplements(updated);
                }}
                voiceInputRef={supplementVoiceRef}
                isVoiceActive={voiceCommands.isListening}
              />
              {audioGuide.isEditorOpenFor("section-supplements") && <AudioGuideEditor sectionId="section-supplements" value={audioGuide.getHelpText("section-supplements")} onChange={audioGuide.updateHelpText} />}
            </div>

            {/* Spacer so last sections can scroll to top */}
            <div style={{ height: "calc(100vh - 14rem)" }} />
          </>
        ) : (
          <>
            <WeeklyOverview
              entries={entries}
              selectedDate={selectedDate}
              profile={profile}
              bookedActivities={bookedActivities}
              weightLog={weightLog}
              highlightedSection={hl}
              analyzeCoachRequestId={weeklyCoachAnalyzeRequest}
              editorOpenSection={audioGuide.editorOpenSection}
              getHelpText={audioGuide.getHelpText}
              updateHelpText={audioGuide.updateHelpText}
              supplementVitamins={supplementNutrients.vitamins}
              supplementMinerals={supplementNutrients.minerals}
            />
            {/* Spacer so last sections can scroll to top */}
            <div style={{ height: "calc(100vh - 14rem)" }} />
          </>
        )}
      </main>
      
      {voiceControlVisible && window.innerWidth >= 1024 && (
        <VoiceControlOverlay activeSection={sectionNav.activeSection} />
      )}
    </div>
  );
};

export default Index;
