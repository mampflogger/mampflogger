import { useState, useCallback, useRef, useEffect, type MutableRefObject } from "react";
import { Pill, Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Supplement,
  SupplementNutrient,
  loadSupplements,
  saveSupplements,
  createSupplement,
  SUPPLEMENT_NUTRIENT_OPTIONS,
} from "@/types/supplements";

interface SupplementTrackerProps {
  supplements: Supplement[];
  onSupplementsChange: (supplements: Supplement[]) => void;
  voiceInputRef?: MutableRefObject<((transcript: string, isInterim: boolean) => void) | undefined>;
  isVoiceActive?: boolean;
}

const UNIT_OPTIONS = ["µg", "mg", "IE"];

const SupplementTracker = ({
  supplements,
  onSupplementsChange,
  voiceInputRef,
  isVoiceActive = false,
}: SupplementTrackerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New supplement form state
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [nutrients, setNutrients] = useState<SupplementNutrient[]>([]);
  const [daily, setDaily] = useState(true);

  // New nutrient row state
  const [selectedNutrientKey, setSelectedNutrientKey] = useState("");
  const [nutrientAmount, setNutrientAmount] = useState("");
  const [nutrientUnit, setNutrientUnit] = useState("µg");

  const nameInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setName("");
    setQuantity("1");
    setNutrients([]);
    setDaily(true);
    setSelectedNutrientKey("");
    setNutrientAmount("");
    setNutrientUnit("µg");
    setIsAdding(false);
    setEditingId(null);
  }, []);

  const addNutrientRow = useCallback(() => {
    if (!selectedNutrientKey || !nutrientAmount) return;
    const opt = SUPPLEMENT_NUTRIENT_OPTIONS.find((o) => o.key === selectedNutrientKey);
    if (!opt) return;
    // Prevent duplicates
    if (nutrients.some((n) => n.nutrientKey === selectedNutrientKey)) return;

    setNutrients((prev) => [
      ...prev,
      {
        nutrientKey: opt.key,
        kind: opt.kind,
        amountPerUnit: parseFloat(nutrientAmount.replace(",", ".")),
        displayUnit: nutrientUnit,
      },
    ]);
    setSelectedNutrientKey("");
    setNutrientAmount("");
  }, [selectedNutrientKey, nutrientAmount, nutrientUnit, nutrients]);

  const removeNutrientRow = useCallback((key: string) => {
    setNutrients((prev) => prev.filter((n) => n.nutrientKey !== key));
  }, []);

  const saveSupplement = useCallback(() => {
    if (!name.trim() || nutrients.length === 0) return;

    const qty = parseInt(quantity, 10) || 1;

    if (editingId) {
      const updated = supplements.map((s) =>
        s.id === editingId
          ? { ...s, name: name.trim(), quantity: qty, nutrients, daily }
          : s
      );
      onSupplementsChange(updated);
    } else {
      const newSupp = createSupplement({
        name: name.trim(),
        quantity: qty,
        nutrients,
        daily,
      });
      onSupplementsChange([...supplements, newSupp]);
    }
    resetForm();
  }, [name, quantity, nutrients, daily, editingId, supplements, onSupplementsChange, resetForm]);

  const deleteSupplement = useCallback(
    (id: string) => {
      onSupplementsChange(supplements.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
    },
    [supplements, onSupplementsChange, editingId, resetForm]
  );

  const toggleDaily = useCallback(
    (id: string) => {
      const updated = supplements.map((s) =>
        s.id === id ? { ...s, daily: !s.daily } : s
      );
      onSupplementsChange(updated);
    },
    [supplements, onSupplementsChange]
  );

  const startEditing = useCallback(
    (supp: Supplement) => {
      setEditingId(supp.id);
      setName(supp.name);
      setQuantity(String(supp.quantity));
      setNutrients([...supp.nutrients]);
      setDaily(supp.daily);
      setIsAdding(true);
      setExpandedId(null);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    },
    []
  );

  const activeCount = supplements.filter((s) => s.daily).length;

  // Voice input handler
  useEffect(() => {
    if (!voiceInputRef) return;
    voiceInputRef.current = (transcript: string, isInterim: boolean) => {
      if (isInterim) return;
      const lower = transcript.toLowerCase().trim();

      if (/\b(?:supplement|nahrungsergänzung)\s+(?:hinzufügen|neu|neue[sr]?|add)\b/i.test(lower) || /\bneue?s?\s+supplement\b/i.test(lower)) {
        setIsAdding(true);
        setTimeout(() => nameInputRef.current?.focus(), 100);
        return;
      }
      if (/\b(?:storno|abbrechen|cancel)\b/i.test(lower)) {
        resetForm();
        return;
      }
      if (/\b(?:okay|speichern|save)\b/i.test(lower) && isAdding) {
        saveSupplement();
        return;
      }
    };
    return () => {
      if (voiceInputRef.current) voiceInputRef.current = undefined;
    };
  }, [voiceInputRef, isAdding, saveSupplement, resetForm]);

  const getNutrientLabel = (key: string) => {
    return SUPPLEMENT_NUTRIENT_OPTIONS.find((o) => o.key === key)?.label ?? key;
  };

  return (
    <div className="space-y-2">
      {/* Summary line */}
      <div className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5">
        <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Pill className="w-3.5 h-3.5" />
          Supplements
        </span>
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          {activeCount} aktiv
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setIsAdding(true);
              setTimeout(() => nameInputRef.current?.focus(), 100);
            }}
            title="Supplement hinzufügen"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </span>
      </div>

      {/* List of existing supplements */}
      {supplements.map((supp) => (
        <div
          key={supp.id}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
              onClick={() => setExpandedId((prev) => (prev === supp.id ? null : supp.id))}
            >
              <Checkbox
                checked={supp.daily}
                onCheckedChange={() => toggleDaily(supp.id)}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              />
              <span className={`font-medium truncate ${!supp.daily ? "line-through text-muted-foreground" : ""}`}>
                {supp.quantity > 1 ? `${supp.quantity}× ` : ""}{supp.name}
              </span>
              {expandedId === supp.id ? (
                <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={() => startEditing(supp)}
                title="Bearbeiten"
              >
                <span className="text-[10px]">✎</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={() => deleteSupplement(supp.id)}
                title="Löschen"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {expandedId === supp.id && (
            <div className="mt-2 space-y-1 pl-6 animate-in slide-in-from-top-2 fade-in duration-200">
              {supp.nutrients.map((n) => (
                <div key={n.nutrientKey} className="flex justify-between text-muted-foreground">
                  <span>{getNutrientLabel(n.nutrientKey)}</span>
                  <span className="font-mono">
                    {n.amountPerUnit} {n.displayUnit} × {supp.quantity}
                  </span>
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground/70 mt-1">
                {supp.daily ? "✓ Wird täglich eingerechnet" : "✗ Pausiert"}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add/Edit form */}
      {isAdding && (
        <div className="rounded-lg border-2 border-primary/30 bg-accent/50 p-3 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
          <p className="text-xs font-semibold text-foreground">
            {editingId ? "Supplement bearbeiten" : "Neues Supplement"}
          </p>

          {/* Name + Quantity */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-[10px]">Name</Label>
              <Input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Vitamin D3"
                className="h-8 text-xs"
              />
            </div>
            <div className="w-16">
              <Label className="text-[10px]">Stück</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-8 text-xs text-center"
              />
            </div>
          </div>

          {/* Added nutrients */}
          {nutrients.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Inhaltsstoffe</p>
              {nutrients.map((n) => (
                <div key={n.nutrientKey} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
                  <span>{getNutrientLabel(n.nutrientKey)}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-muted-foreground">
                      {n.amountPerUnit} {n.displayUnit}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNutrientRow(n.nutrientKey)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add nutrient row */}
          <div className="flex gap-1 items-end">
            <div className="flex-1">
              <Label className="text-[10px]">Stoff</Label>
              <Select value={selectedNutrientKey} onValueChange={(v) => {
                setSelectedNutrientKey(v);
                const opt = SUPPLEMENT_NUTRIENT_OPTIONS.find((o) => o.key === v);
                if (opt) setNutrientUnit(opt.defaultUnit);
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Nährstoff wählen" />
                </SelectTrigger>
                <SelectContent>
                  <div className="text-[10px] font-bold text-muted-foreground px-2 py-1">Vitamine</div>
                  {SUPPLEMENT_NUTRIENT_OPTIONS.filter((o) => o.kind === "vitamins").map((opt) => (
                    <SelectItem key={opt.key} value={opt.key} disabled={nutrients.some((n) => n.nutrientKey === opt.key)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                  <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 mt-1">Mineralstoffe</div>
                  {SUPPLEMENT_NUTRIENT_OPTIONS.filter((o) => o.kind === "minerals").map((opt) => (
                    <SelectItem key={opt.key} value={opt.key} disabled={nutrients.some((n) => n.nutrientKey === opt.key)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-16">
              <Label className="text-[10px]">Menge</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                value={nutrientAmount}
                onChange={(e) => setNutrientAmount(e.target.value)}
                placeholder="250"
                className="h-8 text-xs text-center"
              />
            </div>
            <div className="w-16">
              <Label className="text-[10px]">Einheit</Label>
              <Select value={nutrientUnit} onValueChange={setNutrientUnit}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={addNutrientRow}
              disabled={!selectedNutrientKey || !nutrientAmount}
              title="Nährstoff hinzufügen"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Daily checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="supplement-daily"
              checked={daily}
              onCheckedChange={(checked) => setDaily(!!checked)}
            />
            <Label htmlFor="supplement-daily" className="text-xs cursor-pointer">
              Täglich einrechnen
            </Label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={saveSupplement}
              disabled={!name.trim() || nutrients.length === 0}
            >
              <Check className="w-3 h-3 mr-1" />
              {editingId ? "Speichern" : "Hinzufügen"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={resetForm}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {supplements.length === 0 && !isAdding && (
        <p className="text-[10px] text-muted-foreground text-center py-1">
          Noch keine Supplements erfasst. Tippe auf + um eins hinzuzufügen.
        </p>
      )}
    </div>
  );
};

export default SupplementTracker;
