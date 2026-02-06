import { useState, useEffect, useMemo } from "react";
import { NutritionEntry, formatDate } from "@/types/nutrition";
import { loadEntries, saveEntries } from "@/lib/storage";
import NutritionForm from "@/components/NutritionForm";
import NutritionTable from "@/components/NutritionTable";
import { ChevronLeft, ChevronRight, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const todayEntries = useMemo(
    () => entries.filter((e) => e.date === selectedDate),
    [entries, selectedDate]
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
            disabled={isToday}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Form Card */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Neuer Eintrag
          </h2>
          <NutritionForm onAdd={handleAdd} selectedDate={selectedDate} />
        </div>

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
      </main>
    </div>
  );
};

export default Index;
