import { DailySummary } from "@/types/nutrition";

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro) / 0.8)",
  fat: "hsl(var(--macro-fat) / 0.8)",
  kh: "hsl(var(--macro-kh) / 0.8)",
  fib: "hsl(var(--macro-fib) / 0.8)",
};

interface MacroBarProps {
  summary: DailySummary;
}

const MacroBar = ({ summary }: MacroBarProps) => {
  const hasData = summary.proteinPercent > 0 || summary.fatPercent > 0 || summary.carbsPercent > 0 || summary.fiberPercent > 0;
  if (!hasData) return null;

  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">Anteil Makros in %</p>
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-muted">
        {summary.proteinPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.proteinPercent}%`, backgroundColor: MACRO_COLORS.pro }}
          />
        )}
        {summary.fatPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.fatPercent}%`, backgroundColor: MACRO_COLORS.fat }}
          />
        )}
        {summary.carbsPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.carbsPercent}%`, backgroundColor: MACRO_COLORS.kh }}
          />
        )}
        {summary.fiberPercent > 0 && (
          <div
            className="rounded-full transition-all duration-500"
            style={{ width: `${summary.fiberPercent}%`, backgroundColor: MACRO_COLORS.fib }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px]">
        <span className="flex items-center gap-1 font-bold">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.pro }} />
          PRO {summary.proteinPercent}%
        </span>
        <span className="flex items-center gap-1 font-bold">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fat }} />
          FAT {summary.fatPercent}%
        </span>
        <span className="flex items-center gap-1 font-bold">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.kh }} />
          KH {summary.carbsPercent}%
        </span>
        <span className="flex items-center gap-1 font-bold">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fib }} />
          FIB {summary.fiberPercent}%
        </span>
      </div>
    </div>
  );
};

export default MacroBar;
