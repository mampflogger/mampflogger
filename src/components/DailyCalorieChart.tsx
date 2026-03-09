import { useMemo } from "react";
import { NutritionEntry } from "@/types/nutrition";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface DailyCalorieChartProps {
  entries: NutritionEntry[];
}

const DailyCalorieChart = ({ entries }: DailyCalorieChartProps) => {
  const data = useMemo(() => {
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

  const maxVal = Math.max(...data.map((d) => d.kcal), 0);
  const yMax = maxVal > 1000 ? 1500 : 1000;
  const yTicks = maxVal > 1000 ? [0, 500, 1000, 1500] : [0, 250, 500, 750, 1000];

  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -4 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={38}
            ticks={yTicks}
            domain={[0, yMax]}
          />
          {yTicks.filter((t) => t > 0).map((t) => (
            <ReferenceLine key={t} y={t} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          ))}
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              if (d.kcal === 0) return null;
              return (
                <div className="rounded-lg border border-border/50 bg-background px-2 py-1 text-xs shadow-xl">
                  <span className="font-medium">{d.kcal} kcal</span>
                </div>
              );
            }}
          />
          <defs>
            <linearGradient id="kcalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <Bar
            dataKey="kcal"
            fill="url(#kcalGradient)"
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyCalorieChart;
