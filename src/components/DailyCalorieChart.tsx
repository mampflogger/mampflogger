import { useMemo } from "react";
import { NutritionEntry } from "@/types/nutrition";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DailyCalorieChartProps {
  entries: NutritionEntry[];
}

const DailyCalorieChart = ({ entries }: DailyCalorieChartProps) => {
  const data = useMemo(() => {
    // Build 24 hourly buckets
    const buckets = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, "0")}`,
      kcal: 0,
    }));

    entries.forEach((e) => {
      const h = parseInt(e.time.split(":")[0], 10);
      if (h >= 0 && h < 24) {
        buckets[h].kcal += Math.round(e.calories);
      }
    });

    return buckets;
  }, [entries]);

  const maxKcal = Math.max(...data.map((d) => d.kcal), 1);

  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={40}
            domain={[0, Math.ceil(maxKcal / 100) * 100 || 100]}
            tickCount={4}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                  <p className="font-medium">{d.label}:00 – {d.label}:59</p>
                  <p className="text-muted-foreground">{d.kcal} kcal</p>
                </div>
              );
            }}
          />
          <defs>
            <linearGradient id="kcalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <Bar
            dataKey="kcal"
            fill="url(#kcalGradient)"
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyCalorieChart;
