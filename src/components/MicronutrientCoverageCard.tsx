import { useMemo, useState, useEffect, useCallback } from "react";
import { Pencil, Check } from "lucide-react";
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

const STORAGE_KEY = "mampflogger-custom-targets";

type CustomTargets = Record<string, number>;

function loadCustomTargets(kind: "vitamins" | "minerals"): CustomTargets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed?.[kind] ?? {};
  } catch {
    return {};
  }
}

function saveCustomTargets(kind: "vitamins" | "minerals", targets: CustomTargets) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[kind] = targets;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch { /* ignore */ }
}

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

  const [editing, setEditing] = useState(false);
  const [customTargets, setCustomTargets] = useState<CustomTargets>(() => loadCustomTargets(kind));
  const [draftTargets, setDraftTargets] = useState<CustomTargets>({});

  // Listen for external reset
  useEffect(() => {
    const handler = () => setCustomTargets({});
    window.addEventListener("mampflogger-custom-targets-reset", handler);
    return () => window.removeEventListener("mampflogger-custom-targets-reset", handler);
  }, []);

  const startEditing = useCallback(() => {
    setDraftTargets({ ...customTargets });
    setEditing(true);
  }, [customTargets]);

  const saveEditing = useCallback(() => {
    setCustomTargets(draftTargets);
    saveCustomTargets(kind, draftTargets);
    setEditing(false);
  }, [draftTargets, kind]);

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
      const defaultTarget = getMicronutrientTarget(definition, gender);
      const target = customTargets[definition.key] !== undefined ? customTargets[definition.key] : defaultTarget;
      const coverage = target && target > 0 ? (averageDaily / target) * 100 : 0;

      return {
        ...definition,
        averageDaily,
        target,
        fillWidth: `${Math.max(0, Math.min(coverage, 100))}%`,
      };
    });
  }, [definitions, gender, kind, totals.minerals, totals.vitamins, customTargets]);

  return (
    <div id={sectionId} data-section className={`glass-card rounded-xl p-3 ${highlighted ? "section-card-highlight" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading highlighted={highlighted} className="mb-0">
          {title}
        </SectionHeading>
        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Sollwerte bearbeiten"
          >
            <Pencil className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={saveEditing}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Check className="w-3 h-3" />
            OK
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <MicronutrientTile
            key={item.key}
            item={item}
            editing={editing}
            draftValue={draftTargets[item.key]}
            onDraftChange={(val) =>
              setDraftTargets((prev) => {
                const next = { ...prev };
                if (val === undefined || val === null) {
                  delete next[item.key];
                } else {
                  next[item.key] = val;
                }
                return next;
              })
            }
            gender={gender}
            definitions={definitions}
          />
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
  editing: boolean;
  draftValue: number | undefined;
  onDraftChange: (val: number | undefined) => void;
  gender: MicronutrientGender;
  definitions: readonly MicronutrientDefinition[];
}

const MicronutrientTile = ({ item, editing, draftValue, onDraftChange, gender, definitions }: MicronutrientTileProps) => {
  const def = definitions.find((d) => d.key === item.key);
  const defaultTarget = def ? getMicronutrientTarget(def, gender) : null;

  const displayDraft = draftValue !== undefined ? draftValue : (defaultTarget ?? 0);

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-border bg-background px-3 py-2">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/10 to-primary/20 transition-all duration-500"
        style={{ width: item.fillWidth }}
        aria-hidden="true"
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground">
            {item.label} ({item.unit})
          </p>
          <p className="text-[10px] text-muted-foreground/70 italic truncate ml-2 pr-2">
            {item.fullName}
          </p>
        </div>
        <p className="mt-1 text-xl font-semibold leading-none tabular-nums text-foreground">
          {formatMicronutrientValue(item.averageDaily)}
        </p>
        {!editing ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {item.target ? `Soll ${formatMicronutrientValue(item.target)}` : "n. spez."}
          </p>
        ) : (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Soll</span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={displayDraft || ""}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  onDraftChange(undefined);
                } else {
                  onDraftChange(parseFloat(v));
                }
              }}
              className="w-14 h-5 text-[10px] px-1 rounded border border-border bg-accent text-foreground tabular-nums text-center focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MicronutrientCoverageCard;
