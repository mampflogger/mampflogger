import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { NutritionEntry, formatDate, calculateDailySummary } from "@/types/nutrition";
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
import NutritionForm from "@/components/NutritionForm";
import NutritionTable from "@/components/NutritionTable";
import MacroBar from "@/components/MacroBar";
import WeeklyOverview from "@/components/WeeklyOverview";
import ActivityInput from "@/components/ActivityInput";
import DeficitDisplay from "@/components/DeficitDisplay";
import FluidDisplay from "@/components/FluidDisplay";
import { foodDatabase } from "@/data/foodDatabase";
import SettingsDialog, { ColorTheme } from "@/components/SettingsDialog";
import { ChevronLeft, ChevronRight, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [activeTab, setActiveTab] = useState<"log" | "weekly">("log");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookedActivities, setBookedActivities] = useState<BookedActivity[]>([]);
  const [editingEntry, setEditingEntry] = useState<NutritionEntry | null>(null);
  const [editingActivity, setEditingActivity] = useState<BookedActivity | null>(null);
  const [openNewFood, setOpenNewFood] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("foodlog-dark-mode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    return (localStorage.getItem("foodlog-color-theme") as ColorTheme) || "green";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("foodlog-dark-mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove("theme-yellow", "theme-blue", "theme-pink");
    if (colorTheme !== "green") {
      el.classList.add(`theme-${colorTheme}`);
    }
    localStorage.setItem("foodlog-color-theme", colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    setEntries(loadEntries());
    setProfile(loadProfile());
    setBookedActivities(loadBookedActivities());
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
    // Deduplicate by composite key: date + time + food + amount
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

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1"  y="10" width="3" height="7" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                  <rect x="5"  y="6"  width="3" height="11" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                  <rect x="9"  y="8"  width="3" height="9"  rx="0.8" fill="currentColor" className="text-primary-foreground" />
                  <rect x="13" y="3"  width="3" height="14" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                </svg>
              </div>
              <h1 className="text-lg font-bold tracking-tight">MampfLogger</h1>
            </div>
            <div className="flex items-center gap-1">
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
              />
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab("log")}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeTab === "log"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Eingabe</span>
                </button>
                <button
                  onClick={() => setActiveTab("weekly")}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeTab === "weekly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Statistik</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-8">
        {/* Date Navigation */}
        <div className="glass-card rounded-xl p-3 my-3">
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
            <div className="text-center">
              <p className="text-sm font-semibold">{isToday ? "Heute" : displayDate}</p>
              {isToday && <p className="text-xs text-muted-foreground">{displayDate}</p>}
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

        {activeTab === "log" ? (
          <>
            <div className="glass-card rounded-xl p-3 mb-4">
              <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                {editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
              </h2>
              <NutritionForm
                onAdd={handleAdd}
                selectedDate={selectedDate}
                editingEntry={editingEntry}
                onCancelEdit={() => setEditingEntry(null)}
                onNewFood={() => setOpenNewFood(true)}
              />
            </div>

            {todayEntries.length > 0 && (
              <div className="glass-card rounded-xl p-3 mb-4">
                <MacroBar summary={todaySummary} />
              </div>
            )}

            <div className="glass-card rounded-xl p-3 mb-4">
              <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Tagesübersicht
                {todayEntries.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {todayEntries.length}
                  </span>
                )}
              </h2>
              <NutritionTable entries={todayEntries} onDelete={handleDelete} onEntryClick={handleEntryClick} />
            </div>

            {profile && (
              <div className="glass-card rounded-xl p-3 mb-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Activity
                </h2>
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
              <div className="glass-card rounded-xl p-3 mb-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Kalorienbilanz
                </h2>
                <DeficitDisplay profile={profile} activityBonus={activityBonus} consumedCalories={todaySummary.totalCalories} goalDeficit={profile.goalDeficit} />
              </div>
            )}

            {profile && (
              <div className="glass-card rounded-xl p-3">
                <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Flüssigkeit
                </h2>
                <FluidDisplay entries={todayEntries} foodDatabase={foodDatabase} goalMl={profile.goalFluidMl} />
              </div>
            )}
          </>
        ) : (
          <div className="glass-card rounded-xl p-4">
            <WeeklyOverview entries={entries} selectedDate={selectedDate} profile={profile} bookedActivities={bookedActivities} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
