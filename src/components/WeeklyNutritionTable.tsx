import { useState, useEffect, useCallback, useMemo } from "react";
import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import { ArrowUp, ArrowDown } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

export type WeeklyTableViewMode = "detail" | "summen";

interface WeeklyNutritionTableProps {
  entries: NutritionEntry[];
  selectedDate: string;
  highlighted?: boolean;
}

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro))",
  fat: "hsl(var(--macro-fat))",
  kh: "hsl(var(--macro-kh))",
  fib: "hsl(var(--macro-fib))",
};

type SortKey = "date" | "food" | "count" | "amount" | "calories" | "protein" | "fat" | "carbs" | "fiber";
type DetailSortKey = Exclude<SortKey, "count">;
type SummarySortKey = Exclude<SortKey, "date">;
type SortDir = "asc" | "desc";

const DETAIL_SORT_FIELDS: { key: DetailSortKey; label: string; color?: string }[] = [
  { key: "date", label: "Datum" },
  { key: "food", label: "Lebensmittel" },
  { key: "amount", label: "g/ml" },
  { key: "calories", label: "kcal" },
  { key: "protein", label: "PRO", color: MACRO_COLORS.pro },
  { key: "fat", label: "FAT", color: MACRO_COLORS.fat },
  { key: "carbs", label: "KH", color: MACRO_COLORS.kh },
  { key: "fiber", label: "FIB", color: MACRO_COLORS.fib },
];

const SUMMARY_SORT_FIELDS: { key: SummarySortKey; label: string; color?: string }[] = [
  { key: "food", label: "Lebensmittel" },
  { key: "count", label: "Anz." },
  { key: "amount", label: "g/ml" },
  { key: "calories", label: "kcal" },
  { key: "protein", label: "PRO", color: MACRO_COLORS.pro },
  { key: "fat", label: "FAT", color: MACRO_COLORS.fat },
  { key: "carbs", label: "KH", color: MACRO_COLORS.kh },
  { key: "fiber", label: "FIB", color: MACRO_COLORS.fib },
];

interface WeeklyDetailRow {
  id: string;
  date: string;
  dateLabel: string;
  food: string;
  amount: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

interface WeeklySummenRow {
  food: string;
  amount: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  count: number;
}

function compareDetailRows(a: WeeklyDetailRow, b: WeeklyDetailRow, key: DetailSortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "date":
      cmp = a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
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

function compareSummenRows(a: WeeklySummenRow, b: WeeklySummenRow, key: SummarySortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "food":
      cmp = a.food.localeCompare(b.food, "de");
      break;
    case "count":
      cmp = a.count - b.count;
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

function groupEntries(rows: WeeklyDetailRow[]): WeeklySummenRow[] {
  const map = new Map<string, WeeklySummenRow>();
  for (const row of rows) {
    const existing = map.get(row.food);
    if (existing) {
      existing.amount += row.amount;
      existing.calories += row.calories;
      existing.protein += row.protein;
      existing.fat += row.fat;
      existing.carbs += row.carbs;
      existing.fiber += row.fiber;
      existing.count += 1;
    } else {
      map.set(row.food, {
        food: row.food,
        amount: row.amount,
        calories: row.calories,
        protein: row.protein,
        fat: row.fat,
        carbs: row.carbs,
        fiber: row.fiber,
        count: 1,
      });
    }
  }
  return Array.from(map.values());
}

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const WeeklyNutritionTable = ({ entries, selectedDate, highlighted = false }: WeeklyNutritionTableProps) => {
  const [viewMode, setViewMode] = useState<WeeklyTableViewMode>("summen");
  const [sortKey, setSortKey] = useState<SortKey>("calories");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  // Listen for voice sort/view commands scoped to this section
  useEffect(() => {
    const sortHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { key?: SortKey };
      if (detail?.key) toggleSort(detail.key);
    };
    const viewHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { mode?: WeeklyTableViewMode };
      if (detail?.mode) setViewMode(detail.mode);
    };
    window.addEventListener("mampflogger:weekly-table-sort", sortHandler);
    window.addEventListener("mampflogger:weekly-table-view", viewHandler);
    return () => {
      window.removeEventListener("mampflogger:weekly-table-sort", sortHandler);
      window.removeEventListener("mampflogger:weekly-table-view", viewHandler);
    };
  }, [toggleSort]);

  // Build detail rows from last 7 completed days
  const detailRows = useMemo(() => {
    const today = formatDate(new Date());
    const refDate = new Date(selectedDate + "T00:00:00");
    const rows: WeeklyDetailRow[] = [];

    for (let i = 1; i <= 7; i++) {
      const d = new Date(refDate);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      // Skip the current live day
      if (dateStr >= today) continue;
      const dayLabel = `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
      const dayEntries = entries.filter((e) => e.date === dateStr);
      for (const e of dayEntries) {
        rows.push({
          id: e.id,
          date: dateStr,
          dateLabel: dayLabel,
          food: e.food,
          amount: e.amount,
          calories: e.calories,
          protein: e.protein,
          fat: e.fat,
          carbs: e.carbs,
          fiber: e.fiber,
        });
      }
    }
    return rows;
  }, [entries, selectedDate]);

  const detailSortKey: DetailSortKey = sortKey === "count" ? "date" : (sortKey as DetailSortKey);
  const detailSortDir: SortDir = sortKey === "count" ? "desc" : sortDir;
  const summarySortKey: SummarySortKey = sortKey === "date" ? "calories" : (sortKey as SummarySortKey);
  const summarySortDir: SortDir = sortKey === "date" ? "desc" : sortDir;

  const summary = useMemo(() => {
    const totalCalories = detailRows.reduce((s, r) => s + Math.round(r.calories), 0);
    const totalProtein = detailRows.reduce((s, r) => s + r.protein, 0);
    const totalCarbs = detailRows.reduce((s, r) => s + r.carbs, 0);
    const totalFat = detailRows.reduce((s, r) => s + r.fat, 0);
    const totalFiber = detailRows.reduce((s, r) => s + r.fiber, 0);
    return {
      totalCalories,
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      totalFiber: Math.round(totalFiber),
    };
  }, [detailRows]);

  const sortedDetail = useMemo(
    () => [...detailRows].sort((a, b) => compareDetailRows(a, b, detailSortKey, detailSortDir)),
    [detailRows, detailSortKey, detailSortDir],
  );

  const sortedSummen = useMemo(
    () => [...groupEntries(detailRows)].sort((a, b) => compareSummenRows(a, b, summarySortKey, summarySortDir)),
    [detailRows, summarySortKey, summarySortDir],
  );

  if (detailRows.length === 0) {
    return (
      <div id="section-wochenansicht" data-section className={`glass-card rounded-xl p-3 ${highlighted ? "section-card-highlight" : ""}`}>
        <SectionHeading highlighted={highlighted} className="mb-2">Wochenansicht</SectionHeading>
        <p className="text-center text-muted-foreground text-sm py-4">Keine Daten für die letzten 7 Tage.</p>
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

  return (
    <div id="section-wochenansicht" data-section className={`glass-card rounded-xl p-3 ${highlighted ? "section-card-highlight" : ""}`}>
      <SectionHeading highlighted={highlighted} className="mb-2">Wochenansicht</SectionHeading>

      {/* View toggle */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setViewMode("detail")}
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
          onClick={() => setViewMode("summen")}
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

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[10px] sm:text-[11px]">
          <thead>
            <tr className="border-b border-border">
              {viewMode === "detail" ? (
                <>
                  {DETAIL_SORT_FIELDS.map((field) => {
                    const isRight = field.key !== "date" && field.key !== "food";
                    return (
                      <th
                        key={field.key}
                        className={`py-1 px-0.5 font-semibold ${isRight ? "text-right" : "text-left"} ${field.key === "date" ? "pr-1" : ""} ${field.key === "food" ? "pr-1" : ""}`}
                      >
                        {renderSortButton(field, detailSortKey === field.key)}
                      </th>
                    );
                  })}
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
              sortedDetail.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-1 pr-1 text-muted-foreground whitespace-nowrap">{row.dateLabel}</td>
                  <td className="py-1 pr-1 font-medium max-w-[80px] truncate">{row.food}</td>
                  <td className="py-1 px-0.5 text-right text-muted-foreground tabular-nums">{row.amount}</td>
                  <td className="py-1 px-0.5 text-right font-semibold">{Math.round(row.calories)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.protein)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.fat)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.carbs)}</td>
                  <td className="py-1 px-0.5 text-right">{Math.round(row.fiber)}</td>
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
              <td className="py-1 px-0.5 font-bold" colSpan={3}>Summe (7 Tage)</td>
              <td className="py-1 px-0.5 text-right font-bold">{summary.totalCalories}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.pro }}>{summary.totalProtein}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.fat }}>{summary.totalFat}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.kh }}>{summary.totalCarbs}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.fib }}>{summary.totalFiber}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default WeeklyNutritionTable;
