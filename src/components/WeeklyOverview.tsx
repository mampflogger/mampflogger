import { useMemo } from "react";
import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import {
  UserProfile,
  BookedActivity,
  calculateBMR,
  calculateBookedActivityBonus,
} from "@/types/profile";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

interface WeeklyOverviewProps {
  entries: NutritionEntry[];
  selectedDate: string;
  profile?: UserProfile | null;
  bookedActivities?: BookedActivity[];
}

interface DayData {
  label: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  isToday: boolean;
}

interface DeficitDayData {
  label: string;
  date: string;
  deficit: number;
  isToday: boolean;
}

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro) / 0.5)",
  fat: "hsl(var(--macro-fat) / 0.5)",
  kh: "hsl(var(--macro-kh) / 0.5)",
  fib: "hsl(var(--macro-fib) / 0.5)",
};

const COLORS = {
  calories: "hsl(var(--primary))",
  caloriesMuted: "hsl(var(--primary) / 0.5)",
};

const WeeklyOverview = ({ entries, selectedDate, profile, bookedActivities = [] }: WeeklyOverviewProps) => {
  const bmr = profile ? calculateBMR(profile) : null;

  const weekData = useMemo(() => {
    const today = new Date(selectedDate + "T00:00:00");
    const days: DayData[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayEntries = entries.filter((e) => e.date === dateStr);
      const summary = calculateDailySummary(dayEntries);
      days.push({
        label: WEEKDAY_SHORT[d.getDay()],
        date: dateStr,
        calories: summary.totalCalories,
        protein: summary.totalProtein,
        carbs: summary.totalCarbs,
        fat: summary.totalFat,
        fiber: summary.totalFiber,
        isToday: i === 0,
      });
    }
    return days;
  }, [entries, selectedDate]);

  const deficitData = useMemo(() => {
    if (!profile) return null;
    const today = new Date(selectedDate + "T00:00:00");
    const bmr = calculateBMR(profile);
    const days: DeficitDayData[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayEntries = entries.filter((e) => e.date === dateStr);
      // Only show deficit for days with entries
      if (dayEntries.length === 0) {
        days.push({
          label: WEEKDAY_SHORT[d.getDay()],
          date: dateStr,
          deficit: 0,
          isToday: i === 0,
        });
        continue;
      }
      const summary = calculateDailySummary(dayEntries);
      const bonus = calculateBookedActivityBonus(bookedActivities, dateStr);
      days.push({
        label: WEEKDAY_SHORT[d.getDay()],
        date: dateStr,
        deficit: (bmr + bonus) - summary.totalCalories,
        isToday: i === 0,
      });
    }
    return days;
  }, [profile, entries, bookedActivities, selectedDate]);

  const weekTotals = useMemo(() => {
    // Only count days with entries for average
    const daysWithData = weekData.filter((d) => d.calories > 0);
    const totals = weekData.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        protein: acc.protein + d.protein,
        carbs: acc.carbs + d.carbs,
        fat: acc.fat + d.fat,
        fiber: acc.fiber + d.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
    const avgCalories = daysWithData.length > 0 ? Math.round(totals.calories / daysWithData.length) : 0;
    const totalMacroWeight = totals.protein + totals.carbs + totals.fat + totals.fiber;
    return {
      avgCalories,
      totalCalories: totals.calories,
      proteinPercent: totalMacroWeight > 0 ? Math.round((totals.protein / totalMacroWeight) * 100) : 0,
      carbsPercent: totalMacroWeight > 0 ? Math.round((totals.carbs / totalMacroWeight) * 100) : 0,
      fatPercent: totalMacroWeight > 0 ? Math.round((totals.fat / totalMacroWeight) * 100) : 0,
      fiberPercent: totalMacroWeight > 0 ? Math.round((totals.fiber / totalMacroWeight) * 100) : 0,
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
      fiber: Math.round(totals.fiber),
    };
  }, [weekData]);

  // Avg deficit: exclude current day and days without entries, last 7 past days with entries
  const avgDeficit7 = useMemo(() => {
    if (!profile) return null;
    const bmr = calculateBMR(profile);
    const todayStr = formatDate(new Date());

    // Collect all past dates with entries (not today)
    const allDates = [...new Set(entries.map((e) => e.date))]
      .filter((d) => d < todayStr)
      .sort()
      .reverse()
      .slice(0, 7); // last 7 days with entries

    if (allDates.length === 0) return null;

    let totalDeficit = 0;
    for (const date of allDates) {
      const dayEntries = entries.filter((e) => e.date === date);
      const summary = calculateDailySummary(dayEntries);
      const bonus = calculateBookedActivityBonus(bookedActivities, date);
      totalDeficit += (bmr + bonus) - summary.totalCalories;
    }

    return Math.round(totalDeficit / allDates.length);
  }, [profile, entries, bookedActivities]);

  const maxCalories = useMemo(
    () => Math.max(...weekData.map((d) => d.calories), 100),
    [weekData]
  );

  const CaloriesTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as DayData;
    const d = new Date(data.date + "T00:00:00");
    const dateLabel = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs">
        <p className="font-semibold text-popover-foreground">{dateLabel}</p>
        <p className="text-muted-foreground mt-0.5">
          <span className="font-bold text-popover-foreground">{data.calories}</span> kcal
        </p>
        <p className="text-muted-foreground">
          PRO {data.protein}g · FAT {data.fat}g · KH {data.carbs}g · FIB {data.fiber}g
        </p>
      </div>
    );
  };

  const DeficitTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as DeficitDayData;
    const d = new Date(data.date + "T00:00:00");
    const dateLabel = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs">
        <p className="font-semibold text-popover-foreground">{dateLabel}</p>
        <p style={{ color: data.deficit >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
          <span className="font-bold">{data.deficit >= 0 ? `-${data.deficit}` : `+${Math.abs(data.deficit)}`}</span> kcal
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats Row */}
      <div className={`grid gap-3 ${avgDeficit7 !== null ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-xl bg-accent/40 p-3 text-center">
          <p className="text-xs text-muted-foreground font-medium">Woche</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{weekTotals.totalCalories.toLocaleString("de-DE")}</p>
          <p className="text-xs text-muted-foreground">kcal</p>
        </div>
        <div className="rounded-xl bg-accent/40 p-3 text-center">
          <p className="text-xs text-muted-foreground font-medium">Ø Tag</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{weekTotals.avgCalories}</p>
          <p className="text-xs text-muted-foreground">kcal</p>
        </div>
        {avgDeficit7 !== null && (
          <div className="rounded-xl bg-accent/40 p-3 text-center">
            <p className="text-xs text-muted-foreground font-medium">Ø Defizit</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {avgDeficit7 > 0 ? (
                <TrendingDown className="w-4 h-4" style={{ color: "hsl(var(--success))" }} />
              ) : (
                <TrendingUp className="w-4 h-4" style={{ color: "hsl(var(--destructive))" }} />
              )}
              <p className="text-2xl font-bold" style={{ color: avgDeficit7 > 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>
                {Math.abs(avgDeficit7)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
        )}
      </div>

      {/* Calories Bar Chart */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Kalorien pro Tag
        </h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const isBmrTick = bmr && Math.abs(payload.value - bmr) < 1;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fontSize={isBmrTick ? 10 : 10}
                      fontWeight={isBmrTick ? 600 : 400}
                      fill={isBmrTick ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                domain={[0, Math.ceil(maxCalories * 1.15)]}
                ticks={bmr ? [0, ...[Math.round(maxCalories * 0.5), Math.round(maxCalories)].filter(v => Math.abs(v - bmr) > maxCalories * 0.08), bmr].sort((a, b) => a - b) : undefined}
              />
              <Tooltip content={<CaloriesTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
              {bmr && (
                <ReferenceLine
                  y={bmr}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                />
              )}
              <Bar dataKey="calories" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {weekData.map((entry, index) => (
                  <Cell key={index} fill={entry.isToday ? COLORS.calories : COLORS.caloriesMuted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deficit Bar Chart */}
      {deficitData && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Defizit pro Tag
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deficitData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<DeficitTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar dataKey="deficit" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {deficitData.map((entry, index) => (
                    <Cell key={index} fill={entry.deficit >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Macro Distribution */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Makro-Verteilung (7 Tage)
        </h3>
        <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted">
          {weekTotals.proteinPercent > 0 && <div className="rounded-full transition-all duration-500" style={{ width: `${weekTotals.proteinPercent}%`, backgroundColor: MACRO_COLORS.pro }} />}
          {weekTotals.fatPercent > 0 && <div className="rounded-full transition-all duration-500" style={{ width: `${weekTotals.fatPercent}%`, backgroundColor: MACRO_COLORS.fat }} />}
          {weekTotals.carbsPercent > 0 && <div className="rounded-full transition-all duration-500" style={{ width: `${weekTotals.carbsPercent}%`, backgroundColor: MACRO_COLORS.kh }} />}
          {weekTotals.fiberPercent > 0 && <div className="rounded-full transition-all duration-500" style={{ width: `${weekTotals.fiberPercent}%`, backgroundColor: MACRO_COLORS.fib }} />}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { key: "pro", label: "PRO", percent: weekTotals.proteinPercent, grams: weekTotals.protein },
            { key: "fat", label: "FAT", percent: weekTotals.fatPercent, grams: weekTotals.fat },
            { key: "kh", label: "KH", percent: weekTotals.carbsPercent, grams: weekTotals.carbs },
            { key: "fib", label: "FIB", percent: weekTotals.fiberPercent, grams: weekTotals.fiber },
          ].map((m) => (
            <div key={m.key} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MACRO_COLORS[m.key as keyof typeof MACRO_COLORS] }} />
              <div>
                <span className="font-semibold">{m.percent}%</span>
                <span className="text-muted-foreground ml-1">{m.label}</span>
                <p className="text-muted-foreground">{m.grams}g</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily macro stacked bars */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Makros pro Tag (g)
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload as DayData;
                  const d = new Date(data.date + "T00:00:00");
                  const dateLabel = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs">
                      <p className="font-semibold text-popover-foreground mb-1">{dateLabel}</p>
                      <p><span style={{ color: MACRO_COLORS.pro }}>●</span> PRO: {data.protein}g</p>
                      <p><span style={{ color: MACRO_COLORS.fat }}>●</span> FAT: {data.fat}g</p>
                      <p><span style={{ color: MACRO_COLORS.kh }}>●</span> KH: {data.carbs}g</p>
                      <p><span style={{ color: MACRO_COLORS.fib }}>●</span> FIB: {data.fiber}g</p>
                    </div>
                  );
                }}
                cursor={{ fill: "hsl(var(--accent) / 0.4)" }}
              />
              <Bar dataKey="protein" stackId="macros" fill={MACRO_COLORS.pro} radius={[0, 0, 0, 0]} maxBarSize={36} name="PRO" />
              <Bar dataKey="fat" stackId="macros" fill={MACRO_COLORS.fat} radius={[0, 0, 0, 0]} maxBarSize={36} name="FAT" />
              <Bar dataKey="carbs" stackId="macros" fill={MACRO_COLORS.kh} radius={[0, 0, 0, 0]} maxBarSize={36} name="KH" />
              <Bar dataKey="fiber" stackId="macros" fill={MACRO_COLORS.fib} radius={[6, 6, 0, 0]} maxBarSize={36} name="FIB" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default WeeklyOverview;
