import { useEffect, useMemo, useState } from "react";
import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import SectionHeading from "@/components/SectionHeading";
import AudioGuideEditor from "@/components/AudioGuideEditor";
import {
  UserProfile,
  BookedActivity,
  WeightEntry,
  calculateBMR,
  calculateBookedActivityBonus,
  getEffectiveWeightKg,
} from "@/types/profile";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Target, RefreshCw } from "lucide-react";
import NutritionCoach from "./NutritionCoach";
import MicronutrientCoverageCard from "./MicronutrientCoverageCard";
import WeeklyNutritionTable from "./WeeklyNutritionTable";

interface WeeklyOverviewProps {
  entries: NutritionEntry[];
  selectedDate: string;
  profile?: UserProfile | null;
  bookedActivities?: BookedActivity[];
  weightLog?: WeightEntry[];
  highlightedSection?: string | null;
  analyzeCoachRequestId?: number;
  editorOpenSection?: string | null;
  getHelpText?: (sectionId: string) => string;
  updateHelpText?: (sectionId: string, text: string) => void;
  supplementVitamins?: Record<string, number>;
  supplementMinerals?: Record<string, number>;
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

interface WeightLossDayData {
  label: string;
  date: string;
  grams: number;
  deficit: number;
  isToday: boolean;
}

// kcal per gram of body fat (~7700 kcal/kg)
const KCAL_PER_GRAM = 7.7;
const KCAL_PER_KG_FOR_HISTORY = 7700;

const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const MACRO_COLORS = {
  pro: "hsl(var(--macro-pro) / 0.8)",
  fat: "hsl(var(--macro-fat) / 0.8)",
  kh: "hsl(var(--macro-kh) / 0.8)",
  fib: "hsl(var(--macro-fib) / 0.8)",
};

const COLORS = {
  calories: "hsl(var(--primary))",
  caloriesMuted: "hsl(var(--primary) / 0.85)",
};

const DailyMacroCard = ({ weekData, highlighted, profile }: { weekData: DayData[]; highlighted: boolean; profile?: UserProfile | null }) => {
  const [selectedIdx, setSelectedIdx] = useState(6);

  // Listen for voice-driven day selection
  useEffect(() => {
    const handler = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index;
      if (typeof idx === "number" && idx >= 0 && idx < weekData.length) {
        setSelectedIdx(idx);
      }
    };
    window.addEventListener("mampflogger:macro-day-select", handler);
    return () => window.removeEventListener("mampflogger:macro-day-select", handler);
  }, [weekData.length]);
  const day = weekData[selectedIdx];
  const totalG = day.protein + day.fat + day.carbs + day.fiber;

  const macros = [
    { label: "PRO", value: day.protein, goal: profile?.goalProteinG },
    { label: "FAT", value: day.fat, goal: profile?.goalFatG },
    { label: "KH", value: day.carbs, goal: profile?.goalCarbsG },
    { label: "FIB", value: day.fiber, goal: profile?.goalFiberG },
  ];

  return (
    <div id="section-makros-pro-tag" data-section className={`glass-card rounded-xl p-3 ${highlighted ? "section-card-highlight" : ""}`}>
      <SectionHeading highlighted={highlighted} className="mb-2">
        Makros pro Tag (g)
      </SectionHeading>

      {/* Horizontal macro bars for selected day */}
      <div className="space-y-1.5 mb-3">
        {macros.map((m) => {
          const pct = totalG > 0 ? Math.round((m.value / totalG) * 100) : 0;
          // Goal marker: position as percentage of the bar based on grams
          // The bar width = pct% of the track. The goal position relative to totalG:
          const goalPct = m.goal && totalG > 0 ? Math.round((m.goal / totalG) * 100) : null;
          return (
            <div key={m.label} className="flex items-center gap-2 text-[11px]">
              <span className="w-7 font-semibold text-muted-foreground shrink-0">{m.label}</span>
              <div className="relative flex-1 h-3 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.35))",
                  }}
                />
                {goalPct !== null && goalPct > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-[2px]"
                    style={{
                      left: `${Math.min(goalPct, 100)}%`,
                      backgroundColor: "hsl(var(--destructive))",
                    }}
                  />
                )}
              </div>
              <span className="w-10 text-right font-semibold tabular-nums text-foreground shrink-0">{m.value}g</span>
              <span className="w-8 text-right tabular-nums text-muted-foreground shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Weekday badges */}
      <div className="flex justify-center gap-2">
        {weekData.map((d, i) => (
          <button
            key={d.date}
            onClick={() => setSelectedIdx(i)}
            className={`w-8 h-8 rounded-full text-[11px] font-semibold transition-all duration-200 ${
              i === selectedIdx
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const WeeklyOverview = ({ entries, selectedDate, profile, bookedActivities = [], weightLog = [], highlightedSection, analyzeCoachRequestId, editorOpenSection, getHelpText, updateHelpText, supplementVitamins, supplementMinerals }: WeeklyOverviewProps) => {
  const effectiveWeight = profile ? getEffectiveWeightKg(profile, weightLog, selectedDate) : null;
  const bmr = profile ? calculateBMR(profile, effectiveWeight ?? undefined) : null;
  const [showGoalDate, setShowGoalDate] = useState(false);

  useEffect(() => {
    const handler = () => setShowGoalDate(prev => !prev);
    window.addEventListener("mampflogger:toggle-goal-date", handler);
    return () => window.removeEventListener("mampflogger:toggle-goal-date", handler);
  }, []);
  const renderEditor = (sectionId: string) =>
    editorOpenSection === sectionId && getHelpText && updateHelpText ? (
      <AudioGuideEditor sectionId={sectionId} value={getHelpText(sectionId)} onChange={updateHelpText} />
    ) : null;

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
    const bmr = calculateBMR(profile, getEffectiveWeightKg(profile, weightLog, selectedDate));
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
  }, [profile, entries, bookedActivities, selectedDate, weightLog]);

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
    const dCount = daysWithData.length || 1;
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
      avgProtein: Math.round(totals.protein / dCount),
      avgCarbs: Math.round(totals.carbs / dCount),
      avgFat: Math.round(totals.fat / dCount),
      avgFiber: Math.round(totals.fiber / dCount),
    };
  }, [weekData]);

  // Avg deficit: exclude current day and days without entries, last 7 past days with entries
  const avgDeficit7 = useMemo(() => {
    if (!profile) return null;
    const bmr = calculateBMR(profile, getEffectiveWeightKg(profile, weightLog, selectedDate));
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
  }, [profile, entries, bookedActivities, weightLog, selectedDate]);

  // Monthly stats (30 days)
  const monthlyStats = useMemo(() => {
    const today = new Date(selectedDate + "T00:00:00");
    let totalCalories = 0;
    let totalDeficit = 0;
    let daysWithData = 0;
    const bmrVal = profile ? calculateBMR(profile, getEffectiveWeightKg(profile, weightLog, selectedDate)) : 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayEntries = entries.filter((e) => e.date === dateStr);
      if (dayEntries.length === 0) continue;
      daysWithData++;
      const summary = calculateDailySummary(dayEntries);
      totalCalories += summary.totalCalories;
      if (profile) {
        const bonus = calculateBookedActivityBonus(bookedActivities, dateStr);
        totalDeficit += (bmrVal + bonus) - summary.totalCalories;
      }
    }

    return {
      totalCalories,
      avgDeficit: daysWithData > 0 ? Math.round(totalDeficit / daysWithData) : null,
      daysWithData,
    };
  }, [entries, selectedDate, profile, bookedActivities, weightLog]);

  const daysToGoal = useMemo(() => {
    if (!profile || !profile.goalWeightKg) return null;
    // Prefer 30-day avg deficit when a full month of data exists; otherwise fall back to 7-day avg.
    const useMonthly = monthlyStats.daysWithData >= 30 && monthlyStats.avgDeficit !== null;
    const avgDeficit = useMonthly ? monthlyStats.avgDeficit! : avgDeficit7;
    if (avgDeficit === null) return null;
    const refWeight = effectiveWeight ?? profile.weightKg;
    const kgDiff = refWeight - profile.goalWeightKg; // positive = lose, negative = gain
    if (Math.abs(kgDiff) < 0.01) return 0; // goal reached
    // Losing weight: need positive deficit (caloric deficit)
    // Gaining weight: need negative deficit (caloric surplus)
    if (kgDiff > 0 && avgDeficit <= 0) return null; // wants to lose but is in surplus
    if (kgDiff < 0 && avgDeficit >= 0) return null; // wants to gain but is in deficit
    const totalKcalNeeded = Math.abs(kgDiff) * 7000;
    return Math.round(totalKcalNeeded / Math.abs(avgDeficit));
  }, [profile, avgDeficit7, monthlyStats, effectiveWeight]);

  const maxCalories = useMemo(
    () => Math.max(...weekData.map((d) => d.calories), 100),
    [weekData]
  );

  const calorieTicks = useMemo(() => {
    const top = Math.ceil(Math.max(maxCalories, bmr ?? 0, 2000) / 500) * 500;
    const steps: number[] = [];
    for (let v = 0; v <= top; v += 500) steps.push(v);
    if (bmr) {
      const filtered = steps.filter((v) => Math.abs(v - bmr) >= 100);
      return [...filtered, bmr].sort((a, b) => a - b);
    }
    return steps;
  }, [maxCalories, bmr]);

  const macroTicks = useMemo(() => {
    const maxTotal = Math.max(
      ...weekData.map((d) => d.protein + d.fat + d.carbs + d.fiber),
      100
    );
    const top = Math.ceil(maxTotal / 100) * 100;
    const steps: number[] = [];
    for (let v = 100; v <= top; v += 100) steps.push(v);
    return steps;
  }, [weekData]);

  const deficitTicks = useMemo(() => {
    if (!deficitData) return [];
    const allVals = deficitData.map((d) => d.deficit);
    const minVal = Math.min(...allVals, 0);
    const maxVal = Math.max(...allVals, profile?.goalDeficit ?? 0, 1200);
    const bottom = Math.floor(minVal / 300) * 300;
    const top = Math.ceil(maxVal / 300) * 300;
    const steps: number[] = [];
    for (let v = bottom; v <= top; v += 300) steps.push(v);
    const goal = profile?.goalDeficit;
    if (goal && goal > 0) {
      const filtered = steps.filter((v) => Math.abs(v - goal) >= 100);
      return [...filtered, goal].sort((a, b) => a - b);
    }
    return steps;
  }, [deficitData, profile]);

  const weightLossData = useMemo<WeightLossDayData[] | null>(() => {
    if (!deficitData) return null;
    return deficitData.map((d) => ({
      label: d.label,
      date: d.date,
      deficit: d.deficit,
      grams: Math.round(d.deficit / KCAL_PER_GRAM),
      isToday: d.isToday,
    }));
  }, [deficitData]);

  const weightLossTicks = useMemo(() => {
    if (!weightLossData) return [];
    const vals = weightLossData.map((d) => d.grams);
    const minVal = Math.min(...vals, 0);
    const maxVal = Math.max(...vals, 200);
    const bottom = Math.floor(minVal / 50) * 50;
    const top = Math.ceil(maxVal / 50) * 50;
    const steps: number[] = [];
    for (let v = bottom; v <= top; v += 50) steps.push(v);
    return steps;
  }, [weightLossData]);

  // Weight history line chart data: x = days since first weighing, y = kg.
  // Each weight entry yields two points: actual (measured) and computed (projection).
  const weightHistory = useMemo(() => {
    if (!profile || !weightLog || weightLog.length === 0) return null;
    const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
    const startDate = sorted[0].date;
    const startMs = new Date(startDate + "T00:00:00").getTime();
    const dayMs = 86400000;

    const bmr = calculateBMR(profile, getEffectiveWeightKg(profile, weightLog, selectedDate));

    const points = sorted.map((entry) => {
      const t = Math.round((new Date(entry.date + "T00:00:00").getTime() - startMs) / dayMs);
      // Computed projection from profile.weightKg using cumulative deficit up to entry.date
      let totalDeficit = 0;
      const dateSet = new Set(entries.map((e) => e.date));
      for (const dateStr of dateSet) {
        if (dateStr > entry.date) continue;
        const dayEntries = entries.filter((e) => e.date === dateStr);
        if (dayEntries.length === 0) continue;
        const summary = calculateDailySummary(dayEntries);
        const bonus = calculateBookedActivityBonus(bookedActivities, dateStr);
        totalDeficit += (bmr + bonus) - summary.totalCalories;
      }
      const computed = profile.weightKg - totalDeficit / KCAL_PER_KG_FOR_HISTORY;
      return {
        t,
        date: entry.date,
        actual: entry.kg,
        computed: Math.round(computed * 10) / 10,
      };
    });

    const allKgs = points.flatMap((p) => [p.actual, p.computed]);
    const rawMax = Math.max(profile.weightKg + 2, ...allKgs);
    const rawMin = Math.min(...allKgs, profile.goalWeightKg ?? Number.POSITIVE_INFINITY) - 1;
    // Snap to 5 kg grid for a clean axis
    const yMax = Math.ceil(rawMax / 5) * 5;
    const yMin = Math.floor(rawMin / 5) * 5;
    const ticks: number[] = [];
    for (let v = yMin; v <= yMax; v += 5) ticks.push(v);
    return { points, yMax, yMin, ticks };
  }, [profile, weightLog, entries, bookedActivities, selectedDate]);

  // 30-day daily macro history (Makroverlauf)
  const macroHistory = useMemo(() => {
    const days = 30;
    const today = new Date(selectedDate + "T00:00:00");
    const points: { t: number; date: string; pro: number; fat: number; kh: number; fib: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayEntries = entries.filter((e) => e.date === dateStr);
      const s = calculateDailySummary(dayEntries);
      points.push({
        t: days - 1 - i,
        date: dateStr,
        pro: s.totalProtein,
        fat: s.totalFat,
        kh: s.totalCarbs,
        fib: s.totalFiber,
      });
    }
    const hasData = points.some((p) => p.pro + p.fat + p.kh + p.fib > 0);
    return hasData ? points : null;
  }, [entries, selectedDate]);


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
        <p style={{ color: data.deficit >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
          <span className="font-bold">{data.deficit >= 0 ? `-${data.deficit}` : `+${Math.abs(data.deficit)}`}</span> kcal
        </p>
      </div>
    );
  };

  const WeightLossTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as WeightLossDayData;
    const d = new Date(data.date + "T00:00:00");
    const dateLabel = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs">
        <p className="font-semibold text-popover-foreground">{dateLabel}</p>
        <p style={{ color: data.grams >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
          <span className="font-bold">{data.grams >= 0 ? `-${data.grams}` : `+${Math.abs(data.grams)}`}</span> g
        </p>
      </div>
    );
  };

  const hl = highlightedSection;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Stats Row */}
      <div id="section-uebersicht" data-section className={`glass-card rounded-xl p-3 ${hl === "section-uebersicht" ? "section-card-highlight" : ""}`}>
        <SectionHeading highlighted={hl === "section-uebersicht"} className="mb-2">Übersicht</SectionHeading>
        <div className="grid gap-3 w-full grid-cols-2 sm:grid-cols-3">
          {/* Mobile 2-col: Left=ØTag,Woche,Monat Right=Def7,DefMonat,Ziel */}
          {/* Desktop 3-col: Row1=ØTag,Woche,Monat Row2=Def7,DefMonat,Ziel */}
          <div className="rounded-xl bg-background p-3 text-center order-[0]">
            <p className="text-xs text-muted-foreground font-medium">Ø Tag</p>
            <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums tracking-tight leading-tight">{weekTotals.avgCalories}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
          {avgDeficit7 !== null && (
            <div className="rounded-xl bg-background p-3 text-center order-[1] sm:order-[3]">
              <p className="text-xs text-muted-foreground font-medium">Ø Defizit 7 Tage</p>
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                {avgDeficit7 > 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--destructive))" }} />
                )}
                <p className="text-xl font-bold tabular-nums tracking-tight leading-tight" style={{ color: avgDeficit7 > 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                  {Math.abs(avgDeficit7)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
          )}
          <div className="rounded-xl bg-background p-3 text-center order-[2] sm:order-[1]">
            <p className="text-xs text-muted-foreground font-medium">Woche</p>
            <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums tracking-tight leading-tight">{weekTotals.totalCalories}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
          {monthlyStats.avgDeficit !== null && profile && (
            <div className="rounded-xl bg-background p-3 text-center order-[3] sm:order-[4]">
              <p className="text-xs text-muted-foreground font-medium">Ø Defizit Monat</p>
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                {monthlyStats.avgDeficit > 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--destructive))" }} />
                )}
                <p className="text-xl font-bold tabular-nums tracking-tight leading-tight" style={{ color: monthlyStats.avgDeficit > 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                  {Math.abs(monthlyStats.avgDeficit)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
          )}
          <div className="rounded-xl bg-background p-3 text-center order-[4] sm:order-[2]">
            <p className="text-xs text-muted-foreground font-medium">Monat</p>
            <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums tracking-tight leading-tight">{monthlyStats.totalCalories}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
          {daysToGoal !== null && (() => {
            const goalDate = daysToGoal > 0 ? new Date(Date.now() + daysToGoal * 86400000) : null;
            const goalDateStr = goalDate ? `${goalDate.getDate().toString().padStart(2, "0")}.${(goalDate.getMonth() + 1).toString().padStart(2, "0")}.${goalDate.getFullYear()}` : null;
            return (
            <div className="rounded-xl bg-background p-3 text-center relative order-[5]">
              {daysToGoal > 0 && (
                <button
                  onClick={() => setShowGoalDate(d => !d)}
                  className="absolute top-1.5 right-1.5 p-0.5 rounded-md text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  title="Tage / Datum umschalten"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
              <p className="text-xs text-muted-foreground font-medium">
                {daysToGoal === 0 ? "Zielgewicht" : showGoalDate ? "Zielgewicht am" : "Zielgewicht in"}
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Target className="w-3.5 h-3.5 shrink-0 text-primary" />
                <p className="text-xl font-bold text-primary tabular-nums tracking-tight leading-tight">
                  {daysToGoal === 0 ? "✓" : showGoalDate ? goalDateStr : daysToGoal}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{daysToGoal === 0 ? "Erreicht!" : showGoalDate ? "" : "Tagen"}</p>
            </div>);
          })()}
        </div>
        {renderEditor("section-uebersicht")}
      </div>

      {/* Weight history line chart */}
      {weightHistory && weightHistory.points.length > 0 && (
        <div id="section-gewichts-verlauf" data-section className={`glass-card rounded-xl p-3 ${hl === "section-gewichts-verlauf" ? "section-card-highlight" : ""}`}>
          <SectionHeading highlighted={hl === "section-gewichts-verlauf"} className="mb-2">
            Gewichtsverlauf
          </SectionHeading>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightHistory.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: number) => `${v}d`}
                />
                <YAxis
                  domain={[weightHistory.yMin, weightHistory.yMax]}
                  ticks={weightHistory.ticks}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={48}
                  tickFormatter={(v: number) => `${Math.round(v)}`}
                  label={{ value: "kg", angle: -90, position: "insideLeft", offset: 18, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    const d = new Date(p.date + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "2-digit" });
                    return (
                      <div className="rounded-lg border border-border bg-popover px-2 py-1.5 shadow-md text-xs">
                        <p className="font-semibold text-popover-foreground">{d}</p>
                        <p style={{ color: "hsl(var(--primary))" }}>Gemessen: <span className="font-bold">{p.actual.toFixed(1).replace(".", ",")} kg</span></p>
                        <p className="text-muted-foreground">Rechnerisch: <span className="font-semibold">{p.computed.toFixed(1).replace(".", ",")} kg</span></p>
                      </div>
                    );
                  }}
                />
                {profile?.goalWeightKg && (
                  <ReferenceLine y={profile.goalWeightKg} stroke="hsl(var(--destructive))" strokeDasharray="4 3" strokeWidth={1.5} />
                )}
                <Line type="monotone" dataKey="actual" name="Gemessen" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="computed" name="Rechnerisch" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2.5, fill: "hsl(var(--muted-foreground))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />Gemessen</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" />Rechnerisch</span>
          </div>
          {renderEditor("section-gewichts-verlauf")}
        </div>
      )}

      {/* Calories per Day */}
      <div id="section-kalorien-pro-tag" data-section className={`glass-card rounded-xl p-3 ${hl === "section-kalorien-pro-tag" ? "section-card-highlight" : ""}`}>
        <SectionHeading highlighted={hl === "section-kalorien-pro-tag"} className="mb-2">
          Kalorien pro Tag
        </SectionHeading>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.4)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, bmr ?? 0, 2000) / 500) * 500]}
                ticks={calorieTicks}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const isBmr = !!bmr && Math.abs(Number(payload.value) - bmr) < 0.5;
                  return (
                    <text x={x} y={y} dy={4} textAnchor="end" fontSize={10}
                      fontWeight={isBmr ? 600 : 400}
                      fill={isBmr ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              {calorieTicks.filter(v => !bmr || Math.abs(v - bmr) > 0.5).map((v) => (
                <ReferenceLine key={v} y={v} stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth={0.5} />
              ))}
              <Tooltip content={<CaloriesTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
              <Bar dataKey="calories" radius={[6, 6, 0, 0]} maxBarSize={36} fill="url(#caloriesGradient)" />
              {bmr && (
                <ReferenceLine
                  y={bmr}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {renderEditor("section-kalorien-pro-tag")}
      </div>

      {/* Deficit Bar Chart */}
      {deficitData && (
        <div id="section-defizit-pro-tag" data-section className={`glass-card rounded-xl p-3 ${hl === "section-defizit-pro-tag" ? "section-card-highlight" : ""}`}>
          <SectionHeading highlighted={hl === "section-defizit-pro-tag"} className="mb-2">
            Defizit pro Tag
          </SectionHeading>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deficitData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary) / 0.4)" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                  </linearGradient>
                  <linearGradient id="surplusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive) / 0.4)" />
                    <stop offset="100%" stopColor="hsl(var(--destructive) / 0.8)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[(dataMin: number) => Math.floor(Math.min(dataMin, 0) / 300) * 300, (dataMax: number) => Math.ceil(Math.max(dataMax, profile?.goalDeficit ?? 0, 1200) / 300) * 300]}
                  ticks={deficitTicks}
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const isGoal = !!profile?.goalDeficit && Math.abs(Number(payload.value) - profile.goalDeficit) < 0.5;
                    return (
                      <text x={x} y={y} dy={4} textAnchor="end" fontSize={10}
                        fontWeight={isGoal ? 600 : 400}
                        fill={isGoal ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                {deficitTicks.filter(v => !profile?.goalDeficit || Math.abs(v - profile.goalDeficit) > 0.5).map((v) => (
                  <ReferenceLine key={v} y={v} stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth={0.5} />
                ))}
                <Tooltip content={<DeficitTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
                <Bar dataKey="deficit" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {deficitData.map((entry, index) => (
                    <Cell key={index} fill={entry.deficit >= 0 ? "url(#deficitGradient)" : "url(#surplusGradient)"} />
                  ))}
                </Bar>
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={0.5} />
                {profile?.goalDeficit && profile.goalDeficit > 0 && (
                  <ReferenceLine
                    y={profile.goalDeficit}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {renderEditor("section-defizit-pro-tag")}
        </div>
      )}

      {/* Weight Loss Bar Chart */}
      {weightLossData && (
        <div id="section-gewichtsverlust-pro-tag" data-section className={`glass-card rounded-xl p-3 ${hl === "section-gewichtsverlust-pro-tag" ? "section-card-highlight" : ""}`}>
          <SectionHeading highlighted={hl === "section-gewichtsverlust-pro-tag"} className="mb-2">
            Gewichtsverlust pro Tag (g)
          </SectionHeading>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weightLossData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightLossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary) / 0.4)" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                  </linearGradient>
                  <linearGradient id="weightGainGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive) / 0.4)" />
                    <stop offset="100%" stopColor="hsl(var(--destructive) / 0.8)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[(dataMin: number) => Math.floor(Math.min(dataMin, 0) / 50) * 50, (dataMax: number) => Math.ceil(Math.max(dataMax, 200) / 50) * 50]}
                  ticks={weightLossTicks}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                {weightLossTicks.map((v) => (
                  <ReferenceLine key={v} y={v} stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth={0.5} />
                ))}
                <Tooltip content={<WeightLossTooltip />} cursor={{ fill: "hsl(var(--accent) / 0.4)" }} />
                <Bar dataKey="grams" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {weightLossData.map((entry, index) => (
                    <Cell key={index} fill={entry.grams >= 0 ? "url(#weightLossGradient)" : "url(#weightGainGradient)"} />
                  ))}
                </Bar>
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {renderEditor("section-gewichtsverlust-pro-tag")}
        </div>
      )}

      {/* Daily macro with day selector */}
      {/* 90-day Macro Trend Line Chart */}
      {macroHistory && (
        <div id="section-makro-verlauf" data-section className={`glass-card rounded-xl p-3 ${hl === "section-makro-verlauf" ? "section-card-highlight" : ""}`}>
          <SectionHeading highlighted={hl === "section-makro-verlauf"} className="mb-2">
            Makroverlauf
          </SectionHeading>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={macroHistory} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={[0, 89]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: number) => `${v - 89}d`}
                  ticks={[0, 30, 60, 89]}
                />
                <YAxis
                  domain={[0, 250]}
                  ticks={[0, 50, 100, 150, 200, 250]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={32}
                  tickFormatter={(v: number) => `${v}`}
                  label={{ value: "g", angle: -90, position: "insideLeft", offset: 18, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
                />
                <Line type="monotone" dataKey="pro" stroke="hsl(var(--primary))" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="fat" stroke="hsl(var(--primary) / 0.6)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="kh" stroke="hsl(var(--primary) / 0.3)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="fib" stroke="hsl(var(--muted-foreground))" strokeWidth={1.2} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ backgroundColor: "hsl(var(--primary))" }} />PRO</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ backgroundColor: "hsl(var(--primary) / 0.6)" }} />FAT</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ backgroundColor: "hsl(var(--primary) / 0.3)" }} />KH</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-muted-foreground" />FIB</span>
          </div>
          {renderEditor("section-makro-verlauf")}
        </div>
      )}

      <DailyMacroCard weekData={weekData} highlighted={hl === "section-makros-pro-tag"} profile={profile} />


      {/* Macro Distribution */}
      <div id="section-makro-verteilung" data-section className={`glass-card rounded-xl p-3 ${hl === "section-makro-verteilung" ? "section-card-highlight" : ""}`}>
        <SectionHeading highlighted={hl === "section-makro-verteilung"} className="mb-2">
          Makro-Verteilung (Ø 7 Tage)
        </SectionHeading>
        <div className="space-y-1.5">
          {[
            { label: "PRO", percent: weekTotals.proteinPercent, grams: weekTotals.avgProtein, goal: profile?.goalProteinG },
            { label: "FAT", percent: weekTotals.fatPercent, grams: weekTotals.avgFat, goal: profile?.goalFatG },
            { label: "KH", percent: weekTotals.carbsPercent, grams: weekTotals.avgCarbs, goal: profile?.goalCarbsG },
            { label: "FIB", percent: weekTotals.fiberPercent, grams: weekTotals.avgFiber, goal: profile?.goalFiberG },
          ].map((m) => {
            const totalAvgG = weekTotals.avgProtein + weekTotals.avgFat + weekTotals.avgCarbs + weekTotals.avgFiber;
            const goalPct = m.goal && totalAvgG > 0 ? Math.round((m.goal / totalAvgG) * 100) : null;
            return (
              <div key={m.label} className="flex items-center gap-2 text-[11px]">
                <span className="w-7 font-semibold text-muted-foreground shrink-0">{m.label}</span>
                <div className="relative flex-1 h-3 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${m.percent}%`,
                      background: "linear-gradient(90deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.35))",
                    }}
                  />
                  {goalPct !== null && goalPct > 0 && goalPct <= 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px]"
                      style={{
                        left: `${goalPct}%`,
                        backgroundColor: "hsl(var(--destructive))",
                      }}
                    />
                  )}
                </div>
                <span className="w-10 text-right font-semibold tabular-nums text-foreground shrink-0">{m.grams}g</span>
                <span className="w-8 text-right tabular-nums text-muted-foreground shrink-0">{m.percent}%</span>
              </div>
            );
          })}
        </div>
        {renderEditor("section-makro-verteilung")}
      </div>

      {/* Weekly Nutrition Table */}
      <WeeklyNutritionTable
        entries={entries}
        selectedDate={selectedDate}
        highlighted={hl === "section-wochenansicht"}
      />

      <MicronutrientCoverageCard
        entries={entries}
        selectedDate={selectedDate}
        gender={profile?.gender ?? "male"}
        title="Vitamine (Ø 7 Tage)"
        kind="vitamins"
        highlighted={hl === "section-vitamine-7-tage"}
        sectionId="section-vitamine-7-tage"
        editorOpenSection={editorOpenSection}
        getHelpText={getHelpText}
        updateHelpText={updateHelpText}
        supplementTotals={supplementVitamins}
      />

      <MicronutrientCoverageCard
        entries={entries}
        selectedDate={selectedDate}
        gender={profile?.gender ?? "male"}
        title="Mineralstoffe & Spurenelemente (Ø 7 Tage)"
        kind="minerals"
        highlighted={hl === "section-mineralstoffe-7-tage"}
        sectionId="section-mineralstoffe-7-tage"
        editorOpenSection={editorOpenSection}
        getHelpText={getHelpText}
        updateHelpText={updateHelpText}
        supplementTotals={supplementMinerals}
      />

      {/* AI Nutrition Coach */}
      <div id="section-ki-coach" data-section className={hl === "section-ki-coach" ? "section-card-highlight" : ""}>
        <NutritionCoach
          entries={entries}
          selectedDate={selectedDate}
          profile={profile}
          bookedActivities={bookedActivities}
          highlightedSection={hl}
          analyzeRequestId={analyzeCoachRequestId}
        />
        {renderEditor("section-ki-coach")}
      </div>
    </div>
  );
};

export default WeeklyOverview;
