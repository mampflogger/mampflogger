import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { NutritionEntry, formatDate, calculateDailySummary } from "@/types/nutrition";
import { syncRemoteFoodDatabase, loadRemoteUrl } from "@/lib/remoteFoodSync";
import {
  UserProfile,
  BookedActivity,
  loadProfile,
  saveProfile,
  loadBookedActivities,
  saveBookedActivities,
  calculateBookedActivityBonus,
} from "@/types/profile";
import { loadEntries, saveEntries } from "@/lib/storage";
import { reloadFoodDatabase } from "@/data/foodDatabase";
import NutritionForm from "@/components/NutritionForm";
import NutritionTable from "@/components/NutritionTable";
import MacroBar from "@/components/MacroBar";
import WeeklyOverview from "@/components/WeeklyOverview";
import ActivityInput from "@/components/ActivityInput";
import DeficitDisplay from "@/components/DeficitDisplay";
import FluidDisplay from "@/components/FluidDisplay";
import DailyCalorieChart from "@/components/DailyCalorieChart";
import PhotoToLog from "@/components/PhotoToLog";
import FastingAnalysis from "@/components/FastingAnalysis";
import SectionHeading from "@/components/SectionHeading";

import SettingsDialog, { ColorTheme } from "@/components/SettingsDialog";
import { ChevronLeft, ChevronRight, BarChart3, List, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceCommands, SECTION_PAGE_MAP, SECTION_SETTINGS_TAB } from "@/hooks/useVoiceCommands";
import { useSectionNavigation } from "@/hooks/useSectionNavigation";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const settingsParam = searchParams.get("settings");

  useEffect(() => {
    if (settingsParam) {
      setSearchParams({}, { replace: true });
    }
  }, []);
  
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [activeTab, setActiveTab] = useState<"log" | "weekly">("log");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookedActivities, setBookedActivities] = useState<BookedActivity[]>([]);
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
  const nutritionVoiceRef = useRef<((transcript: string, isInterim: boolean) => void) | undefined>();
  const foodInputRef = useRef<HTMLInputElement>(null);
  const sectionNav = useSectionNavigation();

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

  // Global voice command system
  const voiceCommands = useVoiceCommands({
    onCommand: useCallback((action: string) => {
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
            if (page !== activeTabRef.current) {
              setActiveTab(page);
              setTimeout(() => sectionNav.scrollToSection(sectionId), 200);
            } else {
              sectionNav.scrollToSection(sectionId);
            }
            if (sectionId === "section-neuer-eintrag") {
              setTimeout(() => foodInputRef.current?.focus(), 300);
            }
          });
        }
        return;
      }

      // Scroll commands
      if (action === "scroll:down") {
        sectionNav.scrollDirection("down");
        return;
      }
      if (action === "scroll:up") {
        sectionNav.scrollDirection("up");
        return;
      }

      // Navigation — close settings first
      if (action === "nav:log") closeSettingsAndDo(() => setActiveTab("log"));
      else if (action === "nav:weekly") closeSettingsAndDo(() => setActiveTab("weekly"));
      else if (action === "settings:open") setSettingsVoiceTab("profile");
      else if (action === "settings:profile") setSettingsVoiceTab("profile");
      else if (action === "settings:design") setSettingsVoiceTab("design");
      else if (action === "settings:food") setSettingsVoiceTab("food");
      else if (action === "settings:recipes") setSettingsVoiceTab("recipes");
      else if (action === "settings:data") setSettingsVoiceTab("data");
      // Theme commands — context-aware: if in design tab, always apply theme
      else if (action === "theme:dark") setDarkMode(true);
      else if (action === "theme:light") setDarkMode(false);
      else if (action === "theme:blue") setColorTheme("blue");
      else if (action === "theme:yellow") setColorTheme("yellow");
      else if (action === "theme:pink") setColorTheme("pink");
      else if (action === "theme:green") setColorTheme("green");
      else if (action === "action:camera") {
        closeSettingsAndDo(() => {
          setActiveTab("log");
        });
      }
      else if (action === "focus:food") {
        closeSettingsAndDo(() => {
          setActiveTab("log");
          setTimeout(() => foodInputRef.current?.focus(), 100);
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
      if (settingsOpenRef.current) {
        const currentTab = settingsTabRef.current;
        if (!isInterim) {
          const lower = transcript.toLowerCase();

          // Design tab: color keywords
          if (currentTab === "design") {
            if (/\bblau\b/.test(lower)) { setColorTheme("blue"); return; }
            if (/\bgelb\b/.test(lower)) { setColorTheme("yellow"); return; }
            if (/\bpink\b/.test(lower)) { setColorTheme("pink"); return; }
            if (/\bgrün\b/.test(lower)) { setColorTheme("green"); return; }
            if (/\bdark\b|\bdunkel/.test(lower)) { setDarkMode(true); return; }
            if (/\blight\b|\bhell/.test(lower)) { setDarkMode(false); return; }
          }

          // Food tab: categories, filters, "neu", "suchen"
          if (currentTab === "food") {
            if (/\bneu\b/i.test(lower)) { setSettingsVoiceAction("new-food"); return; }
            if (/\bsuchen\b/i.test(lower)) { setSettingsVoiceAction("food-search"); return; }
            if (/\balle\b/i.test(lower)) { setSettingsVoiceAction("category:alle"); return; }
            const catMap: [RegExp, string][] = [
              [/\bfleisch\b/i, "Fleisch&Wurst"], [/\bwurst\b/i, "Fleisch&Wurst"],
              [/\bfisch\b/i, "Fisch&Meeresfrüchte"], [/\bmeeresfrüchte\b/i, "Fisch&Meeresfrüchte"],
              [/\bkäse\b/i, "Käse"], [/\bnüsse\b/i, "Nüsse&Samen"], [/\bsamen\b/i, "Nüsse&Samen"],
              [/\bgemüse\b/i, "Gemüse"], [/\bbrot\b/i, "Brot"], [/\bteigwaren\b/i, "Teigwaren"],
              [/\böle\b/i, "Öle&Fette"], [/\bfette\b/i, "Öle&Fette"],
              [/\bgetränke\b/i, "Getränke"], [/\bobst\b/i, "Obst"],
              [/\bmilchprodukte\b/i, "Milchprodukte"], [/\bsüßwaren\b/i, "Süßwaren"],
              [/\bsonstiges\b/i, "Sonstiges"], [/\beigene\b/i, "Eigene"],
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
          }

          // Recipes tab: number selection
          if (currentTab === "recipes") {
            const numWords: Record<string, number> = {
              "eins": 1, "zwei": 2, "drei": 3, "vier": 4, "fünf": 5,
              "sechs": 6, "sieben": 7, "acht": 8, "neun": 9, "zehn": 10,
              "elf": 11, "zwölf": 12, "dreizehn": 13, "vierzehn": 14, "fünfzehn": 15,
              "sechzehn": 16, "siebzehn": 17, "achtzehn": 18, "neunzehn": 19, "zwanzig": 20,
              "einundzwanzig": 21, "zweiundzwanzig": 22, "dreiundzwanzig": 23,
              "vierundzwanzig": 24, "fünfundzwanzig": 25,
            };
            const numMatch = lower.match(/(?:rezept\s+)?(?:nummer\s+|nimm\s+|#)?(\d+)/);
            if (numMatch) {
              setSettingsVoiceAction(`recipe:${parseInt(numMatch[1], 10) - 1}`);
              return;
            }
            for (const [word, num] of Object.entries(numWords)) {
              if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
                setSettingsVoiceAction(`recipe:${num - 1}`);
                return;
              }
            }
          }
        }
        return; // Don't pass to food input when in settings
      }
      nutritionVoiceRef.current?.(transcript, isInterim);
    }, []),
  });

  // Keep a ref to activeTab for use in callbacks
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

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
    el.classList.remove("theme-yellow", "theme-blue", "theme-pink");
    if (colorTheme !== "green") {
      el.classList.add(`theme-${colorTheme}`);
    }
    localStorage.setItem("mampflogger-color-theme", colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    setEntries(loadEntries());
    setProfile(loadProfile());
    setBookedActivities(loadBookedActivities());

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
  }, []);

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
    saveProfile(p);
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
        <div className="max-w-lg mx-auto px-4 py-3">
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
              {voiceCommands.isSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={voiceCommands.toggle}
                  className={`h-8 w-8 ${voiceCommands.isListening ? "bg-destructive/15 text-destructive animate-pulse" : ""}`}
                  title={voiceCommands.isListening ? "Mikrofon aus" : "Sprachsteuerung"}
                >
                  {voiceCommands.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
              <SettingsDialog
                profile={profile}
                onSaveProfile={handleSaveProfile}
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
                activeTab={activeTab}
                onSetActiveTab={setActiveTab}
                initialOpen={settingsParam === "profile"}
                initialTab={settingsParam === "profile" ? "profile" : undefined}
                selectedDate={selectedDate}
                onAddEntry={handleAdd}
                voiceOpenTab={settingsVoiceTab}
                onVoiceOpenTabHandled={() => setSettingsVoiceTab(null)}
                voiceCloseRequest={settingsCloseRequest}
                onVoiceCloseHandled={() => setSettingsCloseRequest(false)}
                onOpenChange={setSettingsOpen}
                onTabChange={setSettingsCurrentTab}
                isMicSupported={voiceCommands.isSupported}
                isMicListening={voiceCommands.isListening}
                onMicToggle={voiceCommands.toggle}
                voiceAction={settingsVoiceAction}
                onVoiceActionHandled={() => setSettingsVoiceAction(null)}
              />
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${activeTab === "log" ? "bg-muted" : ""}`}
                onClick={() => setActiveTab("log")}
                title="Eingabe"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${activeTab === "weekly" ? "bg-muted" : ""}`}
                onClick={() => setActiveTab("weekly")}
                title="Statistik"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-8">
        {/* Date Navigation – sticky below header */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-[9] -mx-4 px-4 pt-3 pb-0 bg-background">
          <div className="glass-card rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
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
              <div className="text-center min-h-[2.5rem] flex flex-col justify-center">
                <p className="text-sm font-semibold">{isToday ? "Heute" : displayWeekday}</p>
                <p className="text-xs text-muted-foreground">{displayDateOnly}</p>
              </div>
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
        </div>

        {activeTab === "log" ? (
          <>
            <div id="section-neuer-eintrag" data-section className="glass-card rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <SectionHeading highlighted={hl === "section-neuer-eintrag"}>
                  {editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
                </SectionHeading>
                <div className="flex items-center gap-1">
                  <PhotoToLog selectedDate={selectedDate} onAddEntries={handleAddMultiple} />
                </div>
              </div>
              <NutritionForm
                onAdd={handleAdd}
                selectedDate={selectedDate}
                editingEntry={editingEntry}
                onCancelEdit={() => setEditingEntry(null)}
                onNewFood={() => setOpenNewFood(true)}
                voiceInputRef={nutritionVoiceRef}
                isVoiceActive={voiceCommands.isListening}
              />
            </div>

            {todayEntries.length > 0 && (
              <div id="section-makro-naehrstoffe" data-section className="glass-card rounded-xl p-3 mb-3">
                <SectionHeading highlighted={hl === "section-makro-naehrstoffe"} className="mb-2">
                  Makro Nährstoffverteilung
                </SectionHeading>
                <MacroBar summary={todaySummary} />
              </div>
            )}

            <div id="section-tagesuebersicht" data-section className="glass-card rounded-xl p-3 mb-3">
              <SectionHeading highlighted={hl === "section-tagesuebersicht"} className="mb-2">
                Tagesübersicht
                {todayEntries.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {todayEntries.length}
                  </span>
                )}
              </SectionHeading>
              <NutritionTable entries={todayEntries} onDelete={handleDelete} onEntryClick={handleEntryClick} />
            </div>

            <div id="section-kalorienaufnahme" data-section className="glass-card rounded-xl p-3 mb-3">
              <SectionHeading highlighted={hl === "section-kalorienaufnahme"} className="mb-2">
                Kalorienaufnahme 24 Stunden
              </SectionHeading>
              <DailyCalorieChart entries={todayEntries} />
            </div>

            <div id="section-fastenanalyse" data-section className="glass-card rounded-xl p-3 mb-3">
              <SectionHeading highlighted={hl === "section-fastenanalyse"} className="mb-2">
                Fastenanalyse
              </SectionHeading>
              <FastingAnalysis entries={todayEntries} allEntries={entries} selectedDate={selectedDate} />
            </div>

            {profile && (
              <div id="section-activity" data-section className="glass-card rounded-xl p-3 mb-3">
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
                />
              </div>
            )}

            {profile && (
              <div id="section-kalorienbilanz" data-section className="glass-card rounded-xl p-3 mb-3">
                <SectionHeading highlighted={hl === "section-kalorienbilanz"} className="mb-2">
                  Kalorienbilanz
                </SectionHeading>
                <DeficitDisplay profile={profile} activityBonus={activityBonus} consumedCalories={todaySummary.totalCalories} goalDeficit={profile.goalDeficit} />
              </div>
            )}

            {profile && (
              <div id="section-fluessigkeit" data-section className="glass-card rounded-xl p-3 mb-3">
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
              </div>
            )}

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
              highlightedSection={hl}
              analyzeCoachRequestId={weeklyCoachAnalyzeRequest}
            />
            {/* Spacer so last sections can scroll to top */}
            <div style={{ height: "calc(100vh - 14rem)" }} />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
