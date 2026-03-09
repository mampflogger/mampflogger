import { DailySummary } from "@/types/nutrition";

interface MacroBarProps {
  summary: DailySummary;
}

const MACROS = [
  { key: "proteinPercent", label: "PRO" },
  { key: "fatPercent", label: "FAT" },
  { key: "carbsPercent", label: "KH" },
  { key: "fiberPercent", label: "FIB" },
] as const;

const MacroBar = ({ summary }: MacroBarProps) => {
  const hasData = summary.proteinPercent > 0 || summary.fatPercent > 0 || summary.carbsPercent > 0 || summary.fiberPercent > 0;
  if (!hasData) return null;

  return (
    <div className="space-y-1.5">
      {MACROS.map(({ key, label }) => {
        const value = summary[key];
        return (
          <div key={key} className="flex items-center gap-2 text-[11px]">
            <span className="w-7 font-semibold text-muted-foreground shrink-0">{label}</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${value}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.35))",
                }}
              />
            </div>
            <span className="w-8 text-right font-semibold tabular-nums text-foreground shrink-0">{value}%</span>
          </div>
        );
      })}
    </div>
  );
};

export default MacroBar;
