import { useState, useEffect, useCallback } from "react";
import { NutritionEntry, calculateDailySummary } from "@/types/nutrition";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
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

export type TableViewMode = "detail" | "summen";

interface NutritionTableProps {
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
  onEntryClick?: (entry: NutritionEntry) => void;
  viewMode: TableViewMode;
  onViewModeChange: (mode: TableViewMode) => void;
}

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro))",
  fat: "hsl(var(--macro-fat))",
  kh: "hsl(var(--macro-kh))",
  fib: "hsl(var(--macro-fib))",
};

type SortKey = "time" | "food" | "amount" | "calories" | "protein" | "fat" | "carbs" | "fiber";
type SortDir = "asc" | "desc";

const SORT_FIELDS: { key: SortKey; label: string; color?: string }[] = [
  { key: "time", label: "Zeit" },
  { key: "food", label: "Lebensmittel" },
  { key: "amount", label: "g/ml" },
  { key: "calories", label: "kcal" },
  { key: "protein", label: "PRO", color: MACRO_COLORS.pro },
  { key: "fat", label: "FAT", color: MACRO_COLORS.fat },
  { key: "carbs", label: "KH", color: MACRO_COLORS.kh },
  { key: "fiber", label: "FIB", color: MACRO_COLORS.fib },
];

function compareEntries(a: NutritionEntry, b: NutritionEntry, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "time":
      cmp = a.time.localeCompare(b.time) || a.id.localeCompare(b.id);
      break;
    case "food":
      cmp = a.food.localeCompare(b.food, "de");
      break;
    case "amount":
      cmp = a.amount - b.amount;
      break;
    case "calories":
      cmp = a.calories - b.calories;
      break;
    case "protein":
      cmp = a.protein - b.protein;
      break;
    case "fat":
      cmp = a.fat - b.fat;
      break;
    case "carbs":
      cmp = a.carbs - b.carbs;
      break;
    case "fiber":
      cmp = a.fiber - b.fiber;
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

interface SummenRow {
  food: string;
  amount: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  count: number;
}

function groupEntries(entries: NutritionEntry[]): SummenRow[] {
  const map = new Map<string, SummenRow>();
  for (const e of entries) {
    const key = e.food;
    const existing = map.get(key);
    if (existing) {
      existing.amount += e.amount;
      existing.calories += e.calories;
      existing.protein += e.protein;
      existing.fat += e.fat;
      existing.carbs += e.carbs;
      existing.fiber += e.fiber;
      existing.count += 1;
    } else {
      map.set(key, { food: key, amount: e.amount, calories: e.calories, protein: e.protein, fat: e.fat, carbs: e.carbs, fiber: e.fiber, count: 1 });
    }
  }
  return Array.from(map.values());
}

const NutritionTable = ({ entries, onDelete, onEntryClick, viewMode, onViewModeChange }: NutritionTableProps) => {
  const [deleteEntry, setDeleteEntry] = useState<NutritionEntry | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return key;
      }
      setSortDir(key === "food" ? "asc" : "desc");
      return key;
    });
  }, []);

  // Listen for voice sort commands
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: SortKey };
      if (detail?.key) toggleSort(detail.key);
    };
    window.addEventListener("mampflogger:table-sort", handler);
    return () => window.removeEventListener("mampflogger:table-sort", handler);
  }, [toggleSort]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <p className="text-muted-foreground text-sm">Noch keine Einträge für heute.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Füge dein erstes Lebensmittel hinzu!</p>
      </div>
    );
  }

  const summary = calculateDailySummary(entries);
  const sortedEntries = [...entries].sort((a, b) => compareEntries(a, b, sortKey, sortDir));
  const summenRows = groupEntries(entries);

  // Sort summen rows by calories desc by default
  const sortedSummen = [...summenRows].sort((a, b) => b.calories - a.calories);

  const viewToggle = (
    <div className="flex gap-1 mb-2">
      <button
        onClick={() => onViewModeChange("detail")}
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
          viewMode === "detail"
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 bg-transparent hover:border-primary/30 hover:bg-muted/40 text-muted-foreground"
        }`}
      >
        Detail
      </button>
      <button
        onClick={() => onViewModeChange("summen")}
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
          viewMode === "summen"
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 bg-transparent hover:border-primary/30 hover:bg-muted/40 text-muted-foreground"
        }`}
      >
        Summen
      </button>
    </div>
  );

  return (
    <div className="animate-slide-up">
      {viewToggle}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[10px] sm:text-[11px]">
          <thead>
            <tr className="border-b border-border">
              {viewMode === "detail" ? (
                <>
                  {SORT_FIELDS.map((field) => {
                    const isActive = sortKey === field.key;
                    const isRight = field.key !== "time" && field.key !== "food";
                    return (
                      <th
                        key={field.key}
                        className={`py-1 px-0.5 font-semibold ${isRight ? "text-right" : "text-left"} ${field.key === "time" ? "pr-1" : ""} ${field.key === "food" ? "pr-1" : ""}`}
                      >
                        <button
                          onClick={() => toggleSort(field.key)}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border transition-colors text-[10px] sm:text-[11px] font-semibold leading-tight whitespace-nowrap ${
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/60 bg-transparent hover:border-primary/30 hover:bg-muted/40"
                          }`}
                          style={field.color && !isActive ? { color: field.color } : undefined}
                        >
                          {field.label}
                          {isActive && (
                            sortDir === "asc"
                              ? <ArrowUp className="w-2.5 h-2.5 shrink-0" />
                              : <ArrowDown className="w-2.5 h-2.5 shrink-0" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                  <th className="w-5 pl-1.5"></th>
                </>
              ) : (
                <>
                  <th className="py-1 px-0.5 text-left font-semibold">Lebensmittel</th>
                  <th className="py-1 px-0.5 text-right font-semibold text-muted-foreground">Anz.</th>
                  <th className="py-1 px-0.5 text-right font-semibold">g/ml</th>
                  <th className="py-1 px-0.5 text-right font-semibold">kcal</th>
                  <th className="py-1 px-0.5 text-right font-semibold" style={{ color: MACRO_COLORS.pro }}>PRO</th>
                  <th className="py-1 px-0.5 text-right font-semibold" style={{ color: MACRO_COLORS.fat }}>FAT</th>
                  <th className="py-1 px-0.5 text-right font-semibold" style={{ color: MACRO_COLORS.kh }}>KH</th>
                  <th className="py-1 px-0.5 text-right font-semibold" style={{ color: MACRO_COLORS.fib }}>FIB</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {viewMode === "detail" ? (
              sortedEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onEntryClick?.(entry)}
                >
                  <td className="py-1 pr-1 text-muted-foreground whitespace-nowrap">{entry.time}</td>
                  <td className="py-1 pr-1 font-medium max-w-[80px] truncate">{entry.food}</td>
                  <td className="py-1 px-0.5 text-right text-muted-foreground tabular-nums">{entry.amount}</td>
                  <td className="py-1 px-0.5 text-right font-semibold">{Math.round(entry.calories)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(entry.protein)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(entry.fat)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(entry.carbs)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(entry.fiber)}</td>
                  <td className="py-1 pl-1.5 pr-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteEntry(entry);
                      }}
                      className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Eintrag löschen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              sortedSummen.map((row) => (
                <tr key={row.food} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-1 pr-1 font-medium max-w-[100px] truncate">{row.food}</td>
                  <td className="py-1 px-0.5 text-right text-muted-foreground tabular-nums">{row.count}×</td>
                  <td className="py-1 px-0.5 text-right text-muted-foreground tabular-nums">{Math.round(row.amount)}</td>
                  <td className="py-1 px-0.5 text-right font-semibold">{Math.round(row.calories)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.protein)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.fat)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.carbs)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.fiber)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary/20 bg-background">
              <td className="py-1 px-0.5 font-bold" colSpan={viewMode === "detail" ? 3 : 3}>Summe</td>
              {viewMode === "summen" && <td></td>}
              <td className="py-1 px-0.5 text-right font-bold">{summary.totalCalories}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.pro }}>{summary.totalProtein}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.fat }}>{summary.totalFat}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.kh }}>{summary.totalCarbs}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.fib }}>{summary.totalFiber}</td>
              {viewMode === "detail" && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      <AlertDialog open={!!deleteEntry} onOpenChange={(v) => { if (!v) setDeleteEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteEntry?.food}" ({deleteEntry?.time}) wird aus dem Tagesprotokoll entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbruch</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteEntry) { onDelete(deleteEntry.id); setDeleteEntry(null); } }}>
              Ja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NutritionTable;
