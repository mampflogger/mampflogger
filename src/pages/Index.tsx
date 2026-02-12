import { useState, useEffect, useMemo } from "react";
import { NutritionEntry, formatDate, calculateDailySummary } from "@/types/nutrition";
import { exportEntriesToCsv } from "@/lib/csvExport";
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
import WeeklyOverview from "@/components/WeeklyOverview";
import ImportDialog from "@/components/ImportDialog";
import DeleteRangeDialog from "@/components/DeleteRangeDialog";
import ProfileDialog from "@/components/ProfileDialog";
import ActivityInput from "@/components/ActivityInput";
import DeficitDisplay from "@/components/DeficitDisplay";
import { ChevronLeft, ChevronRight, Apple, BarChart3, List, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // 14-day average deficit
  const avgDeficit14 = useMemo(() => {
    if (!profile) return null;
    const today = new Date(selectedDate + "T00:00:00");
    let totalDeficit = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayEntries = entries.filter((e) => e.date === dateStr);
      const daySummary = calculateDailySummary(dayEntries);
      const dayActivity = getActivityForDate(activities, dateStr);
      const tdee = calculateTDEE(profile, dayActivity);
      totalDeficit += tdee - daySummary.totalCalories;
    }
    return Math.round(totalDeficit / 14);
  }, [profile, entries, activities, selectedDate]);

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
              <h1 className="text-lg font-bold tracking-tight">NährLog</h1>
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => exportEntriesToCsv(entries)}
                title="CSV Export"
                disabled={entries.length === 0}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-8">
        {/* Date Navigation */}
        <div className="flex items-center justify-between py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDay(-1)}
            className="h-9 w-9"
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
            className="h-9 w-9"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {activeTab === "log" ? (
          <>
            {/* Activity Input */}
            {profile && (
              <div className="glass-card rounded-xl p-4 mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Bewegung
                </h2>
                <ActivityInput
                  activity={currentActivity}
                  onChange={handleActivityChange}
                  activityBonus={calculateActivityBonus(currentActivity)}
                />
              </div>
            )}

            {/* Form Card */}
            <div className="glass-card rounded-xl p-4 mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Neuer Eintrag
              </h2>
              <NutritionForm onAdd={handleAdd} selectedDate={selectedDate} />
            </div>

            {/* Deficit Display */}
            {profile && (
              <div className="glass-card rounded-xl p-4 mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Kaloriendefizit
                </h2>
                <DeficitDisplay
                  profile={profile}
                  activity={currentActivity}
                  consumedCalories={todaySummary.totalCalories}
                />
              </div>
            )}

            {/* Table Card */}
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Tagesübersicht
                {todayEntries.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {todayEntries.length}
                  </span>
                )}
              </h2>
              <NutritionTable entries={todayEntries} onDelete={handleDelete} />
            </div>
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
