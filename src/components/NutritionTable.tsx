import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

const DETAIL_SORT_FIELDS: { key: SortKey; label: string; color?: string }[] = [
  { key: "time", label: "Zeit" },
  { key: "food", label: "LM" },
  { key: "amount", label: "g" },
  { key: "calories", label: "kcal" },
  { key: "protein", label: "P", color: MACRO_COLORS.pro },
  { key: "fat", label: "F", color: MACRO_COLORS.fat },
  { key: "carbs", label: "K", color: MACRO_COLORS.kh },
  { key: "fiber", label: "B", color: MACRO_COLORS.fib },
];

const SUMMARY_SORT_FIELDS: { key: SortKey; label: string; color?: string }[] = [
  { key: "food", label: "LM" },
  { key: "amount", label: "g" },
  { key: "calories", label: "kcal" },
  { key: "protein", label: "P", color: MACRO_COLORS.pro },
  { key: "fat", label: "F", color: MACRO_COLORS.fat },
  { key: "carbs", label: "K", color: MACRO_COLORS.kh },
  { key: "fiber", label: "B", color: MACRO_COLORS.fib },
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
}

function compareSummenRows(a: SummenRow, b: SummenRow, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
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

  if (cmp === 0 && key !== "food") {
    cmp = a.food.localeCompare(b.food, "de");
  }

  return dir === "asc" ? cmp : -cmp;
}

function groupEntries(entries: NutritionEntry[]): SummenRow[] {
  const map = new Map<string, SummenRow>();

  for (const entry of entries) {
    const existing = map.get(entry.food);

    if (existing) {
      existing.amount += entry.amount;
      existing.calories += entry.calories;
      existing.protein += entry.protein;
      existing.fat += entry.fat;
      existing.carbs += entry.carbs;
      existing.fiber += entry.fiber;
      
    } else {
      map.set(entry.food, {
        food: entry.food,
        amount: entry.amount,
        calories: entry.calories,
        protein: entry.protein,
        fat: entry.fat,
        carbs: entry.carbs,
        fiber: entry.fiber,
        count: 1,
      });
    }
  }

  return Array.from(map.values());
}

const NutritionTable = ({ entries, onDelete, onEntryClick, viewMode, onViewModeChange }: NutritionTableProps) => {
  const [deleteEntry, setDeleteEntry] = useState<NutritionEntry | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const previousEntryCountRef = useRef(entries.length);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((currentDir) => (currentDir === "desc" ? "asc" : "desc"));
        return key;
      }

      setSortDir(key === "food" ? "asc" : "desc");
      return key;
    });
  }, []);

  useEffect(() => {
    const sortHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { key?: SortKey };
      if (detail?.key) {
        toggleSort(detail.key);
      }
    };

    const viewHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { mode?: TableViewMode };
      if (detail?.mode) {
        onViewModeChange(detail.mode);
      }
    };

    window.addEventListener("mampflogger:table-sort", sortHandler);
    window.addEventListener("mampflogger:table-view", viewHandler);

    return () => {
      window.removeEventListener("mampflogger:table-sort", sortHandler);
      window.removeEventListener("mampflogger:table-view", viewHandler);
    };
  }, [onViewModeChange, toggleSort]);

  useEffect(() => {
    if (entries.length > previousEntryCountRef.current) {
      setSortKey("time");
      setSortDir("desc");
      onViewModeChange("detail");
    }

    previousEntryCountRef.current = entries.length;
  }, [entries.length, onViewModeChange]);

  const detailSortKey: DetailSortKey = sortKey === "count" ? "time" : sortKey;
  const detailSortDir: SortDir = sortKey === "count" ? "desc" : sortDir;
  const summarySortKey: SummarySortKey = sortKey === "time" ? "calories" : sortKey;
  const summarySortDir: SortDir = sortKey === "time" ? "desc" : sortDir;

  const summary = useMemo(() => calculateDailySummary(entries), [entries]);
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => compareEntries(a, b, detailSortKey, detailSortDir)),
    [detailSortDir, detailSortKey, entries],
  );
  const sortedSummen = useMemo(
    () => [...groupEntries(entries)].sort((a, b) => compareSummenRows(a, b, summarySortKey, summarySortDir)),
    [entries, summarySortDir, summarySortKey],
  );

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <p className="text-muted-foreground text-sm">Noch keine Einträge für heute.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Füge dein erstes Lebensmittel hinzu!</p>
      </div>
    );
  }

  const renderSortButton = (field: { key: SortKey; label: string; color?: string }, isActive: boolean) => (
    <button
      onClick={() => toggleSort(field.key)}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border transition-colors text-[10px] sm:text-[11px] font-semibold leading-tight whitespace-nowrap ${
        isActive
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-transparent hover:border-primary/30 hover:bg-muted/40"
      }`}
      style={field.color && !isActive ? { color: field.color } : undefined}
      type="button"
    >
      {field.label}
      {isActive && (sortDir === "asc" ? <ArrowUp className="w-2.5 h-2.5 shrink-0" /> : <ArrowDown className="w-2.5 h-2.5 shrink-0" />)}
    </button>
  );

  const viewToggle = (
    <div className="flex gap-1 mb-2">
      <button
        onClick={() => onViewModeChange("detail")}
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
          viewMode === "detail"
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 bg-transparent hover:border-primary/30 hover:bg-muted/40 text-muted-foreground"
        }`}
        type="button"
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
        type="button"
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
                  {DETAIL_SORT_FIELDS.map((field) => {
                    const isRight = field.key !== "time" && field.key !== "food";
                    return (
                      <th
                        key={field.key}
                        className={`py-1 px-0.5 font-semibold ${isRight ? "text-right" : "text-left"} ${field.key === "time" ? "pr-1" : ""} ${field.key === "food" ? "pr-1" : ""}`}
                      >
                        {renderSortButton(field, detailSortKey === field.key)}
                      </th>
                    );
                  })}
                  <th className="w-5 pl-1.5"></th>
                </>
              ) : (
                <>
                  {SUMMARY_SORT_FIELDS.map((field) => {
                    const isRight = field.key !== "food";
                    return (
                      <th
                        key={field.key}
                        className={`py-1 px-0.5 font-semibold ${isRight ? "text-right" : "text-left"} ${field.key === "food" ? "pr-1" : ""}`}
                      >
                        {renderSortButton(field, summarySortKey === field.key)}
                      </th>
                    );
                  })}
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
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteEntry(entry);
                      }}
                      className="p-0.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label="Eintrag löschen"
                      type="button"
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
              <td className="py-1 px-0.5 font-bold" colSpan={3}>Summe</td>
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

      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}>
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
