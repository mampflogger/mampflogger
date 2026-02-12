import { NutritionEntry, calculateDailySummary } from "@/types/nutrition";
import { Trash2 } from "lucide-react";

interface NutritionTableProps {
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
}

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro))",
  fat: "hsl(var(--macro-fat))",
  kh: "hsl(var(--macro-kh))",
  fib: "hsl(var(--macro-fib))",
};

const NutritionTable = ({ entries, onDelete }: NutritionTableProps) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-muted-foreground text-sm">Noch keine Einträge für heute.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Füge dein erstes Lebensmittel hinzu!</p>
      </div>
    );
  }

  const summary = calculateDailySummary(entries);
  const sortedEntries = [...entries].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="animate-slide-up">
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Zeit</th>
              <th className="text-left py-2 px-1 font-semibold text-muted-foreground">Lebensmittel</th>
              <th className="text-right py-2 px-1 font-semibold text-muted-foreground">g/ml</th>
              <th className="text-right py-2 px-1 font-semibold text-muted-foreground">kcal</th>
              <th className="text-right py-2 px-1 font-semibold" style={{ color: MACRO_COLORS.pro }}>PRO</th>
              <th className="text-right py-2 px-1 font-semibold" style={{ color: MACRO_COLORS.fat }}>FAT</th>
              <th className="text-right py-2 px-1 font-semibold" style={{ color: MACRO_COLORS.kh }}>KH</th>
              <th className="text-right py-2 px-1 font-semibold" style={{ color: MACRO_COLORS.fib }}>FIB</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="py-2 px-1 text-muted-foreground font-mono">{entry.time}</td>
                <td className="py-2 px-1 font-medium max-w-[120px] truncate">{entry.food}</td>
                <td className="py-2 px-1 text-right text-muted-foreground">{entry.amount}</td>
                <td className="py-2 px-1 text-right font-semibold">{Math.round(entry.calories)}</td>
                <td className="py-2 px-1 text-right">{Math.round(entry.protein)}</td>
                <td className="py-2 px-1 text-right">{Math.round(entry.fat)}</td>
                <td className="py-2 px-1 text-right">{Math.round(entry.carbs)}</td>
                <td className="py-2 px-1 text-right">{Math.round(entry.fiber)}</td>
                <td className="py-2 px-0.5">
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
              <td className="py-2 px-1 font-bold" colSpan={3}>
                Summe
              </td>
              <td className="py-2 px-1 text-right font-bold">{summary.totalCalories}</td>
              <td className="py-2 px-1 text-right font-bold">{summary.totalProtein}</td>
              <td className="py-2 px-1 text-right font-bold">{summary.totalFat}</td>
              <td className="py-2 px-1 text-right font-bold">{summary.totalCarbs}</td>
              <td className="py-2 px-1 text-right font-bold">{summary.totalFiber}</td>
              <td></td>
            </tr>
            <tr className="bg-accent/20">
              <td className="py-2 px-1 text-muted-foreground font-medium" colSpan={4}>
                Makro %
              </td>
              <td className="py-2 px-1 text-right font-semibold" style={{ color: MACRO_COLORS.pro }}>
                {summary.proteinPercent}%
              </td>
              <td className="py-2 px-1 text-right font-semibold" style={{ color: MACRO_COLORS.fat }}>
                {summary.fatPercent}%
              </td>
              <td className="py-2 px-1 text-right font-semibold" style={{ color: MACRO_COLORS.kh }}>
                {summary.carbsPercent}%
              </td>
              <td className="py-2 px-1 text-right font-semibold" style={{ color: MACRO_COLORS.fib }}>
                {summary.fiberPercent}%
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Visual macro bar */}
      <div className="mt-4 flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
        {summary.proteinPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.proteinPercent}%`, backgroundColor: MACRO_COLORS.pro }}
            title={`PRO: ${summary.proteinPercent}%`}
          />
        )}
        {summary.fatPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.fatPercent}%`, backgroundColor: MACRO_COLORS.fat }}
            title={`FAT: ${summary.fatPercent}%`}
          />
        )}
        {summary.carbsPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.carbsPercent}%`, backgroundColor: MACRO_COLORS.kh }}
            title={`KH: ${summary.carbsPercent}%`}
          />
        )}
        {summary.fiberPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.fiberPercent}%`, backgroundColor: MACRO_COLORS.fib }}
            title={`FIB: ${summary.fiberPercent}%`}
          />
        )}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.pro }} />
          PRO {summary.proteinPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fat }} />
          FAT {summary.fatPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.kh }} />
          KH {summary.carbsPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fib }} />
          FIB {summary.fiberPercent}%
        </span>
      </div>
    </div>
  );
};

export default NutritionTable;
