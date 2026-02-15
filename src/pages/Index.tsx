import { useState, useEffect, useMemo } from "react";
import { NutritionEntry, formatDate, calculateDailySummary } from "@/types/nutrition";
import { exportEntriesToCsv, exportFoodDatabaseCsv, exportCalorieBalanceCsv } from "@/lib/csvExport";
import {
  UserProfile,
  BookedActivity,
  loadProfile,
  saveProfile,
  loadBookedActivities,
  saveBookedActivities,
  calculateBookedActivityBonus,
  calculateBMR,
} from "@/types/profile";
import { loadEntries, saveEntries } from "@/lib/storage";
import NutritionForm from "@/components/NutritionForm";
import NutritionTable from "@/components/NutritionTable";
import MacroBar from "@/components/MacroBar";
import WeeklyOverview from "@/components/WeeklyOverview";
import ImportDialog from "@/components/ImportDialog";
import DeleteRangeDialog from "@/components/DeleteRangeDialog";
import ProfileDialog from "@/components/ProfileDialog";
import ActivityInput from "@/components/ActivityInput";
import DeficitDisplay from "@/components/DeficitDisplay";
import { ChevronLeft, ChevronRight, Apple, BarChart3, List, Download, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Index = () => {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [activeTab, setActiveTab] = useState<"log" | "weekly">("log");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookedActivities, setBookedActivities] = useState<BookedActivity[]>([]);
  const [editingEntry, setEditingEntry] = useState<NutritionEntry | null>(null);
  const [editingActivity, setEditingActivity] = useState<BookedActivity | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("foodlog-dark-mode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("foodlog-dark-mode", String(darkMode));
  }, [darkMode]);

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
    // Check if editing existing entry
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
    // Navigate to the entry's date
    setSelectedDate(entry.date);
  };

  const handleImport = (newEntries: NutritionEntry[]) => {
    const updated = [...entries, ...newEntries];
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

  const navigateDay = (offset: number) => {
    const current = new Date(selectedDate + "T00:00:00");
    current.setDate(current.getDate() + offset);
    setSelectedDate(formatDate(current));
  };

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
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Apple className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">FoodLog</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab("log")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeTab === "log"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  Protokoll
                </button>
                <button
                  onClick={() => setActiveTab("weekly")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeTab === "weekly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Woche
                </button>
              </div>
              <ProfileDialog profile={profile} onSave={handleSaveProfile} />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? "Light Mode" : "Dark Mode"}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <DeleteRangeDialog onCount={countEntriesInRange} onDelete={deleteEntriesInRange} />
              <ImportDialog onImport={handleImport} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Export"
                    disabled={entries.length === 0}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportEntriesToCsv(entries)}>
                    Ernährungsprotokoll
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportCalorieBalanceCsv(entries, bookedActivities)}>
                    Kalorienbilanz
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportFoodDatabaseCsv()}>
                    Lebensmittelliste
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-8">
        {/* Date Navigation */}
        <div className="flex items-center justify-between py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDay(-1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {isToday ? "Heute" : displayDate}
            </p>
            {isToday && (
              <p className="text-xs text-muted-foreground">{displayDate}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDay(1)}
            className="h-8 w-8"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {activeTab === "log" ? (
          <>
            {/* Form Card */}
            <div className="glass-card rounded-xl p-3 mb-4">
              <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                {editingEntry ? "Eintrag bearbeiten" : "Neuer Eintrag"}
              </h2>
              <NutritionForm
                onAdd={handleAdd}
                selectedDate={selectedDate}
                editingEntry={editingEntry}
                onCancelEdit={() => setEditingEntry(null)}
              />
            </div>

            {/* Macro Bar */}
            {todayEntries.length > 0 && (
              <div className="glass-card rounded-xl p-3 mb-4">
                <MacroBar summary={todaySummary} />
              </div>
            )}

            {/* Table Card */}
            <div className="glass-card rounded-xl p-3 mb-4">
              <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Tagesübersicht
                {todayEntries.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {todayEntries.length}
                  </span>
                )}
              </h2>
              <NutritionTable
                entries={todayEntries}
                onDelete={handleDelete}
                onEntryClick={handleEntryClick}
              />
            </div>

            {/* Activity Input */}
            {profile && (
              <div className="glass-card rounded-xl p-3 mb-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Bewegung
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
                />
              </div>
            )}

            {/* Calorie Balance */}
            {profile && (
              <div className="glass-card rounded-xl p-3">
                <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Kalorienbilanz
                </h2>
                <DeficitDisplay
                  profile={profile}
                  activityBonus={activityBonus}
                  consumedCalories={todaySummary.totalCalories}
                />
              </div>
            )}
          </>
        ) : (
          <div className="glass-card rounded-xl p-4">
            <WeeklyOverview
              entries={entries}
              selectedDate={selectedDate}
              profile={profile}
              bookedActivities={bookedActivities}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
