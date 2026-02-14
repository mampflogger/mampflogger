import { useState, useEffect, useMemo } from "react";
import { NutritionEntry, formatDate, calculateDailySummary } from "@/types/nutrition";
import { exportEntriesToCsv, exportFoodDatabaseCsv, exportCalorieBalanceCsv } from "@/lib/csvExport";
import {
  UserProfile,
  DailyActivity,
  loadProfile,
  saveProfile,
  loadActivities,
  saveActivities,
  getActivityForDate,
  setActivityForDate,
  calculateActivityBonus,
  calculateTDEE,
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
import { ChevronLeft, ChevronRight, Apple, BarChart3, List, Download, ChevronDown } from "lucide-react";
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
  const [activities, setActivities] = useState<DailyActivity[]>([]);

  useEffect(() => {
    setEntries(loadEntries());
    setProfile(loadProfile());
    setActivities(loadActivities());
  }, []);

  const todayEntries = useMemo(
    () => entries.filter((e) => e.date === selectedDate),
    [entries, selectedDate]
  );

  const todaySummary = useMemo(
    () => calculateDailySummary(todayEntries),
    [todayEntries]
  );

  const currentActivity = useMemo(
    () => getActivityForDate(activities, selectedDate),
    [activities, selectedDate]
  );

  const handleAdd = (entry: NutritionEntry) => {
    const updated = [...entries, entry];
    setEntries(updated);
    saveEntries(updated);
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
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

  const handleActivityChange = (activity: DailyActivity) => {
    const updated = setActivityForDate(activities, activity);
    setActivities(updated);
    saveActivities(updated);
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
                  <DropdownMenuItem onClick={() => exportCalorieBalanceCsv(entries)}>
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
                Neuer Eintrag
              </h2>
              <NutritionForm onAdd={handleAdd} selectedDate={selectedDate} />
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
              <NutritionTable entries={todayEntries} onDelete={handleDelete} />
            </div>

            {/* Activity Input */}
            {profile && (
              <div className="glass-card rounded-xl p-3 mb-4">
                <h2 className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Bewegung
                </h2>
                <ActivityInput
                  activity={currentActivity}
                  onChange={handleActivityChange}
                  activityBonus={calculateActivityBonus(currentActivity)}
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
                  activity={currentActivity}
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
              activities={activities}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
