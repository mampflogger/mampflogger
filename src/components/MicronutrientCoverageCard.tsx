import { useMemo, useState, useEffect, useCallback } from "react";
import { Pencil, Check, ChevronDown } from "lucide-react";
import AudioGuideEditor from "@/components/AudioGuideEditor";
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
import { NUTRIENT_INFO } from "@/data/nutrientInfo";

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
  editorOpenSection?: string | null;
  getHelpText?: (sectionId: string) => string;
  updateHelpText?: (sectionId: string, text: string) => void;
  /** Daily supplement totals for this kind (keyed by nutrient key) */
  supplementTotals?: Record<string, number>;
}

// Window tiers based on available history (days):
//   < 14 Tage Historie  → 7-Tages-Durchschnitt
//   14–29 Tage Historie → 14-Tages-Durchschnitt
//   ≥ 30 Tage Historie  → 30-Tages-Durchschnitt
const WINDOW_TIERS = [
  { minHistory: 30, window: 30 },
  { minHistory: 14, window: 14 },
  { minHistory: 0, window: 7 },
] as const;

const MicronutrientCoverageCard = ({
  entries,
  selectedDate,
  gender,
  title,
  kind,
  highlighted = false,
  sectionId,
  editorOpenSection,
  getHelpText,
  updateHelpText,
  supplementTotals,
}: MicronutrientCoverageCardProps) => {
  const definitions = kind === "vitamins" ? VITAMIN_DEFINITIONS : MINERAL_DEFINITIONS;

  const [editing, setEditing] = useState(false);
  const [customTargets, setCustomTargets] = useState<CustomTargets>(() => loadCustomTargets(kind));
  const [draftTargets, setDraftTargets] = useState<CustomTargets>({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Listen for external reset
  useEffect(() => {
    const handler = () => setCustomTargets({});
    window.addEventListener("mampflogger-custom-targets-reset", handler);
    return () => window.removeEventListener("mampflogger-custom-targets-reset", handler);
  }, []);

  // Voice control: listen for nutrient-info toggle events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { key: string; kind: string } | undefined;
      if (!detail || detail.kind !== kind) return;
      if (detail.key === "__close__") { setExpandedKey(null); return; }
      setExpandedKey((prev) => (prev === detail.key ? null : detail.key));
    };
    window.addEventListener("mampflogger:nutrient-info", handler);
    return () => window.removeEventListener("mampflogger:nutrient-info", handler);
  }, [kind]);

  const startEditing = useCallback(() => {
    setDraftTargets({ ...customTargets });
    setEditing(true);
  }, [customTargets]);

  const saveEditing = useCallback(() => {
    setCustomTargets(draftTargets);
    saveCustomTargets(kind, draftTargets);
    setEditing(false);
  }, [draftTargets, kind]);

  const toggleExpand = useCallback((key: string) => {
    if (editing) return;
    setExpandedKey((prev) => (prev === key ? null : key));
  }, [editing]);

  // Determine averaging window based on available history (entries earlier than selectedDate)
  const daysInWindow = useMemo(() => {
    const endDate = new Date(`${selectedDate}T00:00:00`);
    let earliest: Date | null = null;
    for (const entry of entries) {
      const d = new Date(`${entry.date}T00:00:00`);
      if (!earliest || d < earliest) earliest = d;
    }
    if (!earliest) return SHORT_WINDOW;
    const diffDays = Math.floor((endDate.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > HISTORY_THRESHOLD_FOR_LONG ? LONG_WINDOW : SHORT_WINDOW;
  }, [entries, selectedDate]);

  const visibleEntries = useMemo(() => {
    const endDate = new Date(`${selectedDate}T00:00:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (daysInWindow - 1));

    return entries.filter((entry) => {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [entries, selectedDate, daysInWindow]);

  const totals = useMemo(() => aggregateMicronutrients(visibleEntries), [visibleEntries]);

  const items = useMemo(() => {
    const source = kind === "vitamins" ? totals.vitamins : totals.minerals;

    return definitions.map((definition) => {
      const weeklyTotal = source[definition.key] ?? 0;
      // Add daily supplement contribution (supplement amount × days in window)
      const supplementDaily = supplementTotals?.[definition.key] ?? 0;
      const totalWithSupplements = weeklyTotal + (supplementDaily * daysInWindow);
      const averageDaily = totalWithSupplements / daysInWindow;
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
  }, [definitions, gender, kind, totals.minerals, totals.vitamins, customTargets, supplementTotals, daysInWindow]);

  return (
    <div id={sectionId} data-section className={`glass-card rounded-xl p-3 ${highlighted ? "section-card-highlight" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading highlighted={highlighted} className="mb-0">
          {title} <span className="text-[10px] font-normal text-muted-foreground">(Ø {daysInWindow} Tage)</span>
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
        {items.map((item) => {
          const isExpanded = expandedKey === item.key;
          const info = NUTRIENT_INFO[item.key];
          return (
            <div key={item.key} className={isExpanded ? "col-span-2 sm:col-span-3" : ""}>
              <MicronutrientTile
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
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(item.key)}
              />
              {isExpanded && info && (
                <div className="mt-1 rounded-xl border border-border bg-accent/50 px-3 py-2.5 animate-in slide-in-from-top-2 fade-in duration-200">
                  <p className="text-xs leading-relaxed text-foreground">
                    {info.description}
                  </p>
                  <div className="mt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Gute Quellen
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {info.foods.map((food) => (
                        <span
                          key={food}
                          className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                        >
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {kind === "minerals" && (
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Schwefel hat keinen separaten DGE-Sollwert und wird daher nur informativ angezeigt.
        </p>
      )}
      {editorOpenSection === sectionId && getHelpText && updateHelpText && (
        <AudioGuideEditor sectionId={sectionId} value={getHelpText(sectionId)} onChange={updateHelpText} />
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
  isExpanded?: boolean;
  onToggle?: () => void;
}

const MicronutrientTile = ({ item, editing, draftValue, onDraftChange, gender, definitions, isExpanded, onToggle }: MicronutrientTileProps) => {
  const def = definitions.find((d) => d.key === item.key);
  const defaultTarget = def ? getMicronutrientTarget(def, gender) : null;

  const displayDraft = draftValue !== undefined ? draftValue : (defaultTarget ?? 0);

  return (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] border border-border bg-background px-3 py-2 transition-colors ${
        !editing ? "cursor-pointer active:bg-accent/30" : ""
      } ${isExpanded ? "ring-1 ring-primary/40" : ""}`}
      onClick={!editing ? onToggle : undefined}
    >
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/10 to-primary/20 transition-all duration-500"
        style={{ width: item.fillWidth }}
        aria-hidden="true"
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">
            {item.label} ({item.unit})
          </p>
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <p className="text-[10px] text-muted-foreground/70 italic truncate pr-0.5">
              {item.fullName}
            </p>
            {!editing && (
              <ChevronDown
                className={`w-3 h-3 text-muted-foreground/50 transition-transform duration-200 flex-shrink-0 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            )}
          </div>
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
