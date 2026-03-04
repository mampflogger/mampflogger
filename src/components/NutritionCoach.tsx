import { useState, useRef, useEffect, useCallback } from "react";
import { NutritionEntry, calculateDailySummary, formatDate } from "@/types/nutrition";
import { UserProfile, BookedActivity, calculateBMR, calculateBookedActivityBonus } from "@/types/profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SectionHeading from "@/components/SectionHeading";

interface CoachTip {
  icon: string;
  title: string;
  text: string;
}

interface CoachResult {
  summary: string;
  tips: CoachTip[];
}

interface NutritionCoachProps {
  entries: NutritionEntry[];
  selectedDate: string;
  profile?: UserProfile | null;
  bookedActivities?: BookedActivity[];
  highlightedSection?: string | null;
  analyzeRequestId?: number;
}

const NutritionCoach = ({
  entries,
  selectedDate,
  profile,
  bookedActivities = [],
  highlightedSection,
  analyzeRequestId,
}: NutritionCoachProps) => {
  const [result, setResult] = useState<CoachResult | null>(null);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const { toast } = useToast();

  const handleAnalyze = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const today = new Date(selectedDate + "T00:00:00");
      const weekData = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        const dayEntries = entries.filter((e) => e.date === dateStr);
        const summary = calculateDailySummary(dayEntries);
        const bonus = calculateBookedActivityBonus(bookedActivities, dateStr);
        const bmr = profile ? calculateBMR(profile) : null;

        weekData.push({
          date: dateStr,
          weekday: d.toLocaleDateString("de-DE", { weekday: "long" }),
          calories: summary.totalCalories,
          protein: summary.totalProtein,
          carbs: summary.totalCarbs,
          fat: summary.totalFat,
          fiber: summary.totalFiber,
          bmr,
          activityBonus: bonus,
          deficit: bmr ? (bmr + bonus) - summary.totalCalories : null,
          meals: dayEntries.map((e) => ({
            time: e.time,
            food: e.food,
            calories: Math.round(e.calories),
            protein: Math.round(e.protein),
            carbs: Math.round(e.carbs),
            fat: Math.round(e.fat),
            fiber: Math.round(e.fiber),
          })),
        });
      }

      const { data, error } = await supabase.functions.invoke("nutrition-coach", {
        body: { weekData, profile },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Fehler", description: data.error, variant: "destructive" });
        return;
      }

      setResult(data);
    } catch (e) {
      console.error("Coach error:", e);
      toast({ title: "Fehler", description: "KI-Analyse konnte nicht durchgeführt werden.", variant: "destructive" });
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [bookedActivities, entries, profile, selectedDate, toast]);

  useEffect(() => {
    if (analyzeRequestId && analyzeRequestId > 0) {
      void handleAnalyze();
    }
  }, [analyzeRequestId, handleAnalyze]);

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <SectionHeading highlighted={highlightedSection === "section-ki-coach"}>
          KI-Ernährungscoach
        </SectionHeading>
        <Button
          size="sm"
          onClick={handleAnalyze}
          disabled={loading}
          className="h-7 text-[11px] gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          {loading ? "Analysiere…" : "Wochenanalyse"}
        </Button>
      </div>

      {!result && !loading && (
        <p className="text-xs text-muted-foreground">
          Lass deine Wochendaten von der <Sparkles className="w-3 h-3 text-primary inline-block align-middle -mt-0.5" /> KI analysieren und erhalte personalisierte Ernährungstipps.
        </p>
      )}

      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className="rounded-lg bg-background border border-border/50 p-3">
            <p className="text-xs font-medium text-foreground leading-relaxed">{result.summary}</p>
          </div>

          <div className="space-y-2">
            {result.tips.map((tip, i) => (
              <div
                key={i}
                className="rounded-lg bg-background border border-border/50 p-3 flex gap-3 items-start"
              >
                <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionCoach;
