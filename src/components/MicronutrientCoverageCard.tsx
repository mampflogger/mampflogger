import { useMemo } from "react";
import type { NutritionEntry } from "@/types/nutrition";
import SectionHeading from "@/components/SectionHeading";
import {
  aggregateMicronutrients,
  formatMicronutrientValue,
  getMicronutrientTarget,
  MINERAL_DEFINITIONS,
  type MicronutrientDefinition,
  type MicronutrientGender,
  VITAMIN_DEFINITIONS,
} from "@/lib/micronutrients";

interface MicronutrientCoverageCardProps {
  entries: NutritionEntry[];
  selectedDate: string;
  gender: MicronutrientGender;
  title: string;
  kind: "vitamins" | "minerals";
  highlighted?: boolean;
  sectionId: string;
}

const DAYS_IN_WINDOW = 7;

const MicronutrientCoverageCard = ({
  entries,
  selectedDate,
  gender,
  title,
  kind,
  highlighted = false,
  sectionId,
}: MicronutrientCoverageCardProps) => {
  const definitions = kind === "vitamins" ? VITAMIN_DEFINITIONS : MINERAL_DEFINITIONS;

  const visibleEntries = useMemo(() => {
    const endDate = new Date(`${selectedDate}T00:00:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (DAYS_IN_WINDOW - 1));

    return entries.filter((entry) => {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [entries, selectedDate]);

  const totals = useMemo(() => aggregateMicronutrients(visibleEntries), [visibleEntries]);

  const items = useMemo(() => {
    const source = kind === "vitamins" ? totals.vitamins : totals.minerals;

    return definitions.map((definition) => {
      const weeklyTotal = source[definition.key] ?? 0;
      const averageDaily = weeklyTotal / DAYS_IN_WINDOW;
      const target = getMicronutrientTarget(definition, gender);
      const coverage = target && target > 0 ? (averageDaily / target) * 100 : 0;

      return {
        ...definition,
        averageDaily,
        target,
        fillWidth: `${Math.max(0, Math.min(coverage, 100))}%`,
      };
    });
  }, [definitions, gender, kind, totals.minerals, totals.vitamins]);

  return (
    <div id={sectionId} data-section className="glass-card rounded-xl p-3">
      <SectionHeading highlighted={highlighted} className="mb-3">
        {title}
      </SectionHeading>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <MicronutrientTile key={item.key} item={item} />
        ))}
      </div>

      {kind === "minerals" && (
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Schwefel hat keinen separaten DGE-Sollwert und wird daher nur informativ angezeigt.
        </p>
      )}
    </div>
  );
};

interface MicronutrientTileProps {
  item: MicronutrientDefinition & {
    averageDaily: number;
    target: number | null;
    fillWidth: string;
  };
}

const MicronutrientTile = ({ item }: MicronutrientTileProps) => {
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-border bg-background px-3 py-2">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/10 to-primary/20 transition-all duration-500"
        style={{ width: item.fillWidth }}
        aria-hidden="true"
      />
      <div className="relative z-10">
        <p className="text-[11px] font-medium text-muted-foreground">
          {item.label} ({item.unit})
        </p>
        <p className="mt-1 text-xl font-semibold leading-none tabular-nums text-foreground">
          {formatMicronutrientValue(item.averageDaily)}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {item.target ? `Soll ${formatMicronutrientValue(item.target)}` : "n. spez."}
        </p>
      </div>
    </div>
  );
};

export default MicronutrientCoverageCard;
