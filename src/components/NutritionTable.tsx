import { NutritionEntry, calculateDailySummary } from "@/types/nutrition";
import { Trash2 } from "lucide-react";

interface NutritionTableProps {
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
  onEntryClick?: (entry: NutritionEntry) => void;
}

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro))",
  fat: "hsl(var(--macro-fat))",
  kh: "hsl(var(--macro-kh))",
  fib: "hsl(var(--macro-fib))",
};

const NutritionTable = ({ entries, onDelete, onEntryClick }: NutritionTableProps) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <p className="text-muted-foreground text-sm">Noch keine Einträge für heute.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Füge dein erstes Lebensmittel hinzu!</p>
      </div>
    );
  }

  const summary = calculateDailySummary(entries);
  const sortedEntries = [...entries].sort((a, b) => b.time.localeCompare(a.time) || b.id.localeCompare(a.id));

  return (
    <div className="animate-slide-up">
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[10px] sm:text-[11px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1 pr-1 font-semibold text-muted-foreground">Zeit</th>
              <th className="text-left py-1 pr-1 font-semibold text-muted-foreground">Lebensmittel</th>
              <th className="text-right py-1 px-0.5 font-semibold text-muted-foreground">g/ml</th>
              <th className="text-right py-1 px-0.5 font-semibold text-muted-foreground">kcal</th>
              <th className="text-right py-1 px-0.5 font-semibold" style={{ color: MACRO_COLORS.pro }}>PRO</th>
              <th className="text-right py-1 px-0.5 font-semibold" style={{ color: MACRO_COLORS.fat }}>FAT</th>
              <th className="text-right py-1 px-0.5 font-semibold" style={{ color: MACRO_COLORS.kh }}>KH</th>
              <th className="text-right py-1 px-0.5 font-semibold" style={{ color: MACRO_COLORS.fib }}>FIB</th>
              <th className="w-5 pl-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => (
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
                      onDelete(entry.id);
                    }}
                    className="p-0.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Eintrag löschen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary/20 bg-accent/30">
              <td className="py-1 px-0.5 font-bold" colSpan={3}>Summe</td>
              <td className="py-1 px-0.5 text-right font-bold">{summary.totalCalories}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.pro }}>{summary.totalProtein}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.fat }}>{summary.totalFat}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.kh }}>{summary.totalCarbs}</td>
              <td className="py-1 px-0.5 text-right font-bold" style={{ color: MACRO_COLORS.fib }}>{summary.totalFiber}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default NutritionTable;
