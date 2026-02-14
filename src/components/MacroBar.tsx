import { DailySummary } from "@/types/nutrition";

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro))",
  fat: "hsl(var(--macro-fat))",
  kh: "hsl(var(--macro-kh))",
  fib: "hsl(var(--macro-fib))",
};

interface MacroBarProps {
  summary: DailySummary;
}

const MacroBar = ({ summary }: MacroBarProps) => {
  const hasData = summary.proteinPercent > 0 || summary.fatPercent > 0 || summary.carbsPercent > 0 || summary.fiberPercent > 0;
  if (!hasData) return null;

  return (
    <div>
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-muted">
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
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.pro }} />
          PRO {summary.proteinPercent}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fat }} />
          FAT {summary.fatPercent}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.kh }} />
          KH {summary.carbsPercent}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MACRO_COLORS.fib }} />
          FIB {summary.fiberPercent}%
        </span>
      </div>
    </div>
  );
};

export default MacroBar;
