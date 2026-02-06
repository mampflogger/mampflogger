import { NutritionEntry, calculateDailySummary } from "@/types/nutrition";
import { Trash2 } from "lucide-react";

interface NutritionTableProps {
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
}

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
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-2 text-xs font-semibold text-muted-foreground">Zeit</th>
              <th className="text-left py-2.5 px-2 text-xs font-semibold text-muted-foreground">Lebensmittel</th>
              <th className="text-right py-2.5 px-2 text-xs font-semibold text-muted-foreground">Menge</th>
              <th className="text-right py-2.5 px-2 text-xs font-semibold text-muted-foreground">kcal</th>
              <th className="text-right py-2.5 px-2 text-xs font-semibold text-muted-foreground">Eiweiß</th>
              <th className="text-right py-2.5 px-2 text-xs font-semibold text-muted-foreground">KH</th>
              <th className="text-right py-2.5 px-2 text-xs font-semibold text-muted-foreground">Fett</th>
              <th className="text-right py-2.5 px-2 text-xs font-semibold text-muted-foreground">Ballast</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="py-2.5 px-2 text-muted-foreground font-mono text-xs">{entry.time}</td>
                <td className="py-2.5 px-2 font-medium max-w-[140px] truncate">{entry.food}</td>
                <td className="py-2.5 px-2 text-right text-muted-foreground">{entry.amount}</td>
                <td className="py-2.5 px-2 text-right font-semibold">{Math.round(entry.calories)}</td>
                <td className="py-2.5 px-2 text-right">{entry.protein.toFixed(1)}</td>
                <td className="py-2.5 px-2 text-right">{entry.carbs.toFixed(1)}</td>
                <td className="py-2.5 px-2 text-right">{entry.fat.toFixed(1)}</td>
                <td className="py-2.5 px-2 text-right">{entry.fiber.toFixed(1)}</td>
                <td className="py-2.5 px-1">
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Eintrag löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Summary row */}
            <tr className="border-t-2 border-primary/20 bg-accent/30">
              <td className="py-3 px-2 font-bold text-xs" colSpan={3}>
                Summe
              </td>
              <td className="py-3 px-2 text-right font-bold">{summary.totalCalories}</td>
              <td className="py-3 px-2 text-right font-bold">{summary.totalProtein}</td>
              <td className="py-3 px-2 text-right font-bold">{summary.totalCarbs}</td>
              <td className="py-3 px-2 text-right font-bold">{summary.totalFat}</td>
              <td className="py-3 px-2 text-right font-bold">{summary.totalFiber}</td>
              <td></td>
            </tr>
            {/* Percentage row */}
            <tr className="bg-accent/20">
              <td className="py-2.5 px-2 text-xs text-muted-foreground font-medium" colSpan={4}>
                Makro-Verteilung (Gewicht)
              </td>
              <td className="py-2.5 px-2 text-right text-xs font-semibold text-accent-foreground">
                {summary.proteinPercent}%
              </td>
              <td className="py-2.5 px-2 text-right text-xs font-semibold text-accent-foreground">
                {summary.carbsPercent}%
              </td>
              <td className="py-2.5 px-2 text-right text-xs font-semibold text-accent-foreground">
                {summary.fatPercent}%
              </td>
              <td className="py-2.5 px-2" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Visual macro bar */}
      <div className="mt-4 flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
        {summary.proteinPercent > 0 && (
          <div
            className="bg-primary rounded-full transition-all duration-500"
            style={{ width: `${summary.proteinPercent}%` }}
            title={`Eiweiß: ${summary.proteinPercent}%`}
          />
        )}
        {summary.carbsPercent > 0 && (
          <div
            className="bg-primary/60 rounded-full transition-all duration-500"
            style={{ width: `${summary.carbsPercent}%` }}
            title={`KH: ${summary.carbsPercent}%`}
          />
        )}
        {summary.fatPercent > 0 && (
          <div
            className="bg-primary/30 rounded-full transition-all duration-500"
            style={{ width: `${summary.fatPercent}%` }}
            title={`Fett: ${summary.fatPercent}%`}
          />
        )}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
          Eiweiß {summary.proteinPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary/60 inline-block" />
          KH {summary.carbsPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary/30 inline-block" />
          Fett {summary.fatPercent}%
        </span>
      </div>
    </div>
  );
};

export default NutritionTable;
