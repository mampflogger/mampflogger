import { useState, useRef, useEffect, useCallback, type CSSProperties, type MutableRefObject } from "react";
import {
  ActivityType,
  BookedActivity,
  loadActivityTypes,
  saveActivityTypes,
} from "@/types/profile";
import { generateId } from "@/types/nutrition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseSpokenSelectionIndex } from "@/lib/voiceSelection";
import { parseGermanSpokenNumber } from "@/lib/spokenNumbers";

type FocusedField = "value" | "type" | "submit" | null;

const DEFERRED_SINGLE_NUMBER_WORDS = new Set([
  "ein",
  "eins",
  "eine",
  "einen",
  "einem",
  "zwei",
  "drei",
  "vier",
  "fuenf",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
]);

interface ActivityInputProps {
  bookedActivities: BookedActivity[];
  selectedDate: string;
  onAddActivity: (activity: BookedActivity) => void;
  onDeleteActivity: (id: string) => void;
  onEditActivity: (activity: BookedActivity) => void;
  editingActivity: BookedActivity | null;
  onCancelEdit: () => void;
  activityBonus: number;
  goalActivityBonus?: number;
  voiceInputRef?: MutableRefObject<((transcript: string, isInterim: boolean) => void) | undefined>;
  isVoiceActive?: boolean;
  focusRequestId?: number;
}

const ActivityInput = ({
  bookedActivities,
  selectedDate,
  onAddActivity,
  onDeleteActivity,
  onEditActivity,
  editingActivity,
  onCancelEdit,
  activityBonus,
  goalActivityBonus,
  voiceInputRef,
  isVoiceActive = false,
  focusRequestId,
}: ActivityInputProps) => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(() => {
    const types = loadActivityTypes();
    const lastUsedId = localStorage.getItem("mampflogger-last-activity-type");
    if (lastUsedId) {
      const idx = types.findIndex((t) => t.id === lastUsedId);
      if (idx > 0) {
        const [item] = types.splice(idx, 1);
        types.unshift(item);
      }
    }
    return types;
  });

  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    editingActivity?.activityTypeId || activityTypes[0]?.id || "",
  );
  const [value, setValue] = useState(editingActivity?.value.toString() || "");
  const [showNewType, setShowNewType] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [focusedField, setFocusedField] = useState<FocusedField>("value");
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const valueInputRef = useRef<HTMLInputElement>(null);
  const selectTriggerRef = useRef<HTMLButtonElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const focusedFieldRef = useRef<FocusedField>("value");
  const valueVoiceBufferRef = useRef("");
  const valueVoiceTimerRef = useRef<number | null>(null);
  const valueVoiceDeferredRef = useRef(false);
  const pendingTypeIgnoreNumericUntilRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const isEditing = !!editingActivity;

  useEffect(() => {
    focusedFieldRef.current = focusedField;
  }, [focusedField]);

  useEffect(() => {
    if (!editingActivity) return;
    setSelectedTypeId(editingActivity.activityTypeId);
    setValue(String(editingActivity.value));
  }, [editingActivity]);

  const normalizeForVoice = useCallback((text: string) => (
    text
      .toLowerCase()
      .replace(/[.,!?;:]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .trim()
  ), []);

  const isBookingCommand = useCallback((text: string) => /\b(?:okay|ja|buchen)\b/i.test(text), []);
  const isStornoCommand = useCallback((text: string) => /\b(?:storno|abbrechen|reset)\b/i.test(text), []);
  const isOptionsCommand = useCallback((text: string) => /\b(?:optionen|option|ausklappen|dropdown|liste)\b/i.test(text), []);

  const shouldDeferSpokenValue = useCallback((buffer: string, parsed: number) => {
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9) return false;

    const normalized = normalizeForVoice(buffer);
    if (!normalized || /\b(?:hundert|tausend)\b/.test(normalized)) return false;

    const tokens = normalized.split(/\s+/).filter(Boolean);
    if (tokens.length !== 1) return false;

    const token = tokens[0];
    return DEFERRED_SINGLE_NUMBER_WORDS.has(token) || /^[1-9]$/.test(token);
  }, [normalizeForVoice]);

  const playConfirmationTone = useCallback(() => {
    if (typeof window === "undefined") return;

    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(420, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.008, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);

  const focusSubmitButton = useCallback(() => {
    setTimeout(() => {
      submitButtonRef.current?.focus();
      setFocusedField("submit");
    }, 0);
  }, []);

  const resetActivityInput = useCallback((cancelEdit = false) => {
    setValue("");
    setSelectedTypeId(activityTypes[0]?.id || "");
    setIsTypeOpen(false);
    pendingTypeIgnoreNumericUntilRef.current = 0;
    valueVoiceBufferRef.current = "";
    valueVoiceDeferredRef.current = false;
    if (valueVoiceTimerRef.current !== null) {
      window.clearTimeout(valueVoiceTimerRef.current);
      valueVoiceTimerRef.current = null;
    }
    if (cancelEdit && isEditing) {
      onCancelEdit();
    }
    setTimeout(() => {
      valueInputRef.current?.focus();
      setFocusedField("value");
    }, 0);
  }, [activityTypes, isEditing, onCancelEdit]);

  const selectActivityTypeByIndex = useCallback((index: number) => {
    const type = activityTypes[index];
    if (!type) return;
    setSelectedTypeId(type.id);
    setIsTypeOpen(false);
    playConfirmationTone();
    focusSubmitButton();
  }, [activityTypes, focusSubmitButton, playConfirmationTone]);

  const flushSpokenValueBuffer = useCallback(() => {
    const bufferedTranscript = valueVoiceBufferRef.current.trim();
    if (!bufferedTranscript) return;

    const spokenValue = parseGermanSpokenNumber(bufferedTranscript);
    if (spokenValue === null || spokenValue <= 0) {
      valueVoiceBufferRef.current = "";
      valueVoiceDeferredRef.current = false;
      return;
    }

    if (!valueVoiceDeferredRef.current && shouldDeferSpokenValue(bufferedTranscript, spokenValue)) {
      valueVoiceDeferredRef.current = true;
      valueVoiceTimerRef.current = window.setTimeout(() => {
        valueVoiceTimerRef.current = null;
        valueVoiceDeferredRef.current = false;

        const finalTranscript = valueVoiceBufferRef.current.trim();
        valueVoiceBufferRef.current = "";
        const finalValue = parseGermanSpokenNumber(finalTranscript);
        if (finalValue === null || finalValue <= 0) return;

        setValue(String(finalValue));
        playConfirmationTone();
        pendingTypeIgnoreNumericUntilRef.current = Date.now() + 1500;
        setTimeout(() => {
          selectTriggerRef.current?.focus();
          setFocusedField("type");
        }, 0);
      }, 1400);
      return;
    }

    valueVoiceBufferRef.current = "";
    valueVoiceDeferredRef.current = false;
    setValue(String(spokenValue));
    playConfirmationTone();
    pendingTypeIgnoreNumericUntilRef.current = Date.now() + 1500;
    setTimeout(() => {
      selectTriggerRef.current?.focus();
      setFocusedField("type");
    }, 0);
  }, [playConfirmationTone, shouldDeferSpokenValue]);

  const handleVoiceInput = useCallback((transcript: string, isInterim: boolean) => {
    const currentField = focusedFieldRef.current;

    if (isStornoCommand(transcript)) {
      pendingTypeIgnoreNumericUntilRef.current = 0;
      valueVoiceDeferredRef.current = false;
      playConfirmationTone();
      resetActivityInput(true);
      return;
    }

    if (isOptionsCommand(transcript)) {
      valueVoiceBufferRef.current = "";
      valueVoiceDeferredRef.current = false;
      if (valueVoiceTimerRef.current !== null) {
        window.clearTimeout(valueVoiceTimerRef.current);
        valueVoiceTimerRef.current = null;
      }
      pendingTypeIgnoreNumericUntilRef.current = 0;
      setIsTypeOpen(true);
      playConfirmationTone();
      setTimeout(() => {
        selectTriggerRef.current?.focus();
        setFocusedField("type");
      }, 0);
      return;
    }

    if (currentField === "submit" && isBookingCommand(transcript)) {
      playConfirmationTone();
      submitButtonRef.current?.click();
      return;
    }

    if (currentField === "value") {
      const chunk = transcript.trim();
      if (!chunk) return;

      valueVoiceDeferredRef.current = false;
      valueVoiceBufferRef.current = `${valueVoiceBufferRef.current} ${chunk}`.trim();

      if (valueVoiceTimerRef.current !== null) {
        window.clearTimeout(valueVoiceTimerRef.current);
      }

      valueVoiceTimerRef.current = window.setTimeout(() => {
        valueVoiceTimerRef.current = null;
        flushSpokenValueBuffer();
      }, isInterim ? 1800 : 1600);
      return;
    }

    if (isInterim) return;
    if (currentField !== "type") return;

    if (isBookingCommand(transcript)) {
      const numValue = Number.parseFloat(value.replace(",", "."));
      if (selectedTypeId && Number.isFinite(numValue) && numValue > 0) {
        playConfirmationTone();
        submitButtonRef.current?.click();
        return;
      }
    }

    const hasSelectionKeyword = /\b(?:nummer|position|nimm|nehme|zeige|liste|auswahl|dropdown|option|optionen)\b/i.test(transcript);
    if (!hasSelectionKeyword && !isTypeOpen && Date.now() < pendingTypeIgnoreNumericUntilRef.current) {
      const carryOverNumber = parseGermanSpokenNumber(transcript);
      if (carryOverNumber !== null) {
        return;
      }
    }

    const pickIndex = parseSpokenSelectionIndex(transcript, {
      allowBareNumber: isTypeOpen,
      max: activityTypes.length || undefined,
      keywords: ["nummer", "position", "nimm", "nehme", "zeige", "liste", "auswahl", "dropdown", "option", "optionen", "aktivitaet", "activity"],
    });

    if (pickIndex !== null) {
      pendingTypeIgnoreNumericUntilRef.current = 0;
      selectActivityTypeByIndex(pickIndex);
      return;
    }

    const normalizedTranscript = normalizeForVoice(transcript)
      .replace(/\b(?:bitte|nimm|nehme|waehle|waehl|aktivitaet|activity|auswahl|nummer|position|option|optionen)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const searchTerm = normalizedTranscript || normalizeForVoice(transcript);
    if (searchTerm.length > 0) {
      let matches = activityTypes.filter((type) => {
        const normalizedName = normalizeForVoice(type.name);
        return normalizedName === searchTerm || normalizedName.startsWith(searchTerm) || normalizedName.includes(searchTerm) || searchTerm.includes(normalizedName);
      });

      if (matches.length !== 1) {
        const tokens = searchTerm.split(" ").filter((token) => token.length > 1);
        const scored = activityTypes
          .map((type) => {
            const normalizedName = normalizeForVoice(type.name);
            const score = tokens.reduce((sum, token) => sum + (normalizedName.includes(token) ? 1 : 0), 0);
            return { type, score };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0 && scored[0].score > (scored[1]?.score ?? 0)) {
          matches = [scored[0].type];
        }
      }

      if (matches.length === 1) {
        pendingTypeIgnoreNumericUntilRef.current = 0;
        setSelectedTypeId(matches[0].id);
        setIsTypeOpen(false);
        playConfirmationTone();
        focusSubmitButton();
        return;
      }
    }

    setIsTypeOpen(true);
    setTimeout(() => {
      selectTriggerRef.current?.focus();
      setFocusedField("type");
    }, 0);
  }, [activityTypes, flushSpokenValueBuffer, focusSubmitButton, isBookingCommand, isOptionsCommand, isStornoCommand, isTypeOpen, normalizeForVoice, playConfirmationTone, resetActivityInput, selectActivityTypeByIndex, selectedTypeId, value]);

  useEffect(() => {
    if (!voiceInputRef) return;
    voiceInputRef.current = handleVoiceInput;
    return () => {
      if (voiceInputRef) voiceInputRef.current = undefined;
    };
  }, [voiceInputRef, handleVoiceInput]);

  useEffect(() => {
    return () => {
      if (valueVoiceTimerRef.current !== null) {
        window.clearTimeout(valueVoiceTimerRef.current);
        valueVoiceTimerRef.current = null;
      }
      valueVoiceBufferRef.current = "";
      valueVoiceDeferredRef.current = false;
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (focusRequestId === undefined) return;
    setTimeout(() => {
      valueInputRef.current?.focus();
      setFocusedField("value");
      pendingTypeIgnoreNumericUntilRef.current = 0;
      valueVoiceBufferRef.current = "";
      valueVoiceDeferredRef.current = false;
      if (valueVoiceTimerRef.current !== null) {
        window.clearTimeout(valueVoiceTimerRef.current);
        valueVoiceTimerRef.current = null;
      }
    }, 0);
  }, [focusRequestId]);

  // Field navigation commands (Zurück / Weiter / Löschen)
  useEffect(() => {
    const FIELD_ORDER: FocusedField[] = ["value", "type", "submit"];
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | { action: string; scope?: string };
      const cmd = typeof detail === "string" ? detail : detail?.action;
      const scope = typeof detail === "string" ? undefined : detail?.scope;
      if (!cmd || (scope && scope !== "activity")) return;
      const current = focusedFieldRef.current;
      const idx = current ? FIELD_ORDER.indexOf(current) : -1;

      if (cmd === "field:next") {
        const next = FIELD_ORDER[Math.min(idx + 1, FIELD_ORDER.length - 1)];
        if (next) {
          setFocusedField(next);
          setTimeout(() => {
            if (next === "value") valueInputRef.current?.focus();
            else if (next === "type") selectTriggerRef.current?.focus();
            else if (next === "submit") submitButtonRef.current?.focus();
          }, 0);
        }
      } else if (cmd === "field:prev") {
        const prev = FIELD_ORDER[Math.max(idx - 1, 0)];
        if (prev) {
          setFocusedField(prev);
          setTimeout(() => {
            if (prev === "value") valueInputRef.current?.focus();
            else if (prev === "type") selectTriggerRef.current?.focus();
            else if (prev === "submit") submitButtonRef.current?.focus();
          }, 0);
        }
      } else if (cmd === "field:clear") {
        if (current === "value") {
          setValue("");
          valueVoiceBufferRef.current = "";
          valueVoiceDeferredRef.current = false;
          if (valueVoiceTimerRef.current !== null) {
            window.clearTimeout(valueVoiceTimerRef.current);
            valueVoiceTimerRef.current = null;
          }
          valueInputRef.current?.focus();
        } else if (current === "type") {
          setSelectedTypeId(activityTypes[0]?.id || "");
          selectTriggerRef.current?.focus();
        }
      }
    };
    window.addEventListener("mampflogger:field-command", handler);
    return () => window.removeEventListener("mampflogger:field-command", handler);
  }, [activityTypes]);

  const handleSubmit = () => {
    const type = activityTypes.find((t) => t.id === selectedTypeId);
    if (!type || !value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    const calories = Math.round(type.caloriesPerUnit * numValue);

    localStorage.setItem("mampflogger-last-activity-type", type.id);
    const reordered = [type, ...activityTypes.filter((t) => t.id !== type.id)];
    setActivityTypes(reordered);

    if (isEditing && editingActivity) {
      onEditActivity({
        ...editingActivity,
        activityTypeId: type.id,
        activityName: type.name,
        value: numValue,
        calories,
        unit: type.unit,
      });
    } else {
      onAddActivity({
        id: generateId(),
        date: selectedDate,
        activityTypeId: type.id,
        activityName: type.name,
        value: numValue,
        calories,
        unit: type.unit,
      });
    }

    setValue("");
    setSelectedTypeId(reordered[0]?.id || "");
    if (isEditing) onCancelEdit();
    setTimeout(() => {
      valueInputRef.current?.focus();
      setFocusedField("value");
    }, 0);
  };

  const handleAddType = () => {
    if (!newName.trim() || !newCalories || !newUnit.trim()) return;
    const newType: ActivityType = {
      id: generateId(),
      name: newName.trim(),
      caloriesPerUnit: parseFloat(newCalories) || 0,
      unit: newUnit.trim(),
    };
    const updated = [...activityTypes, newType];
    setActivityTypes(updated);
    saveActivityTypes(updated);
    setNewName("");
    setNewCalories("");
    setNewUnit("");
    setShowNewType(false);
  };

  const handleDeleteType = (id: string) => {
    const updated = activityTypes.filter((t) => t.id !== id);
    setActivityTypes(updated);
    saveActivityTypes(updated);
    if (selectedTypeId === id) {
      setSelectedTypeId(updated[0]?.id || "");
    }
  };

  const selectedType = activityTypes.find((t) => t.id === selectedTypeId);
  const todayActivities = bookedActivities.filter((a) => a.date === selectedDate);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <div className="w-16">
          <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            {selectedType?.unit || "Menge"}
          </Label>
          <Input
            ref={valueInputRef}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocusedField("value")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitButtonRef.current?.focus();
              }
            }}
            className={`h-9 text-xs px-2 ${isVoiceActive && focusedField === "value" ? "ring-2 ring-primary" : ""}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Activity
          </Label>
          <Select
            open={isTypeOpen}
            onOpenChange={(open) => {
              setIsTypeOpen(open);
              if (open) setFocusedField("type");
            }}
            value={selectedTypeId}
            onValueChange={(val) => {
              setSelectedTypeId(val);
              setIsTypeOpen(false);
              focusSubmitButton();
            }}
          >
            <SelectTrigger
              ref={selectTriggerRef}
              className={`h-9 text-xs w-full ${isVoiceActive && focusedField === "type" ? "ring-2 ring-primary" : ""}`}
              onFocus={() => setFocusedField("type")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <span className="block truncate text-left">{selectedType?.name || "Wählen..."}</span>
            </SelectTrigger>
            <SelectContent>
              {activityTypes.map((type, index) => (
                <SelectItem key={type.id} value={type.id} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[9px] font-bold text-muted-foreground shrink-0">
                      {index + 1}
                    </span>
                    <span>{type.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          ref={submitButtonRef}
          onClick={handleSubmit}
          onFocus={() => setFocusedField("submit")}
          className={`h-9 px-3 rounded-full text-xs font-semibold bg-primary text-primary-foreground shrink-0 ${
            isVoiceActive && focusedField === "submit" ? "ring-2 ring-primary" : ""
          }`}
        >
          OK
        </button>
      </div>

      <div className="mt-1">
        <Dialog open={showNewType} onOpenChange={setShowNewType}>
          <DialogTrigger asChild>
            <button className="text-xs text-primary font-medium hover:underline">
              + New Workout
            </button>
          </DialogTrigger>
          <DialogContent
            hideClose
            className="w-screen h-[100dvh] max-w-none max-h-[100dvh] rounded-none border-0 flex flex-col p-0 gap-0 data-[state=open]:animate-none data-[state=closed]:animate-none md:left-0 md:top-0 md:w-screen md:translate-x-0 md:translate-y-0 md:h-[100dvh] md:max-h-[100dvh] md:max-w-none md:rounded-none md:border-0"
            style={{
              "--tw-enter-scale": "1",
              "--tw-exit-scale": "1",
              "--tw-enter-translate-x": "0",
              "--tw-enter-translate-y": "0",
              "--tw-exit-translate-x": "0",
              "--tw-exit-translate-y": "0",
            } as CSSProperties}
          >
            <header className="shrink-0 sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
              <div className="max-w-lg mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <a href="/" className="flex items-center gap-2 no-underline text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="10" width="3" height="7" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                        <rect x="5" y="6" width="3" height="11" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                        <rect x="9" y="8" width="3" height="9" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                        <rect x="13" y="3" width="3" height="14" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                      </svg>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight">MampfLogger</h1>
                  </a>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNewType(false)} title="Schließen">
                    <span className="text-lg">✕</span>
                  </Button>
                </div>
              </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>Neue Activity</DialogTitle>
                <DialogDescription>Definiere eine neue Sportart mit Kalorienverbrauch pro Einheit.</DialogDescription>
              </DialogHeader>
              <div className="max-w-lg mx-auto px-4 w-full pb-8">
                <div className="glass-card rounded-xl p-3 my-3 space-y-3">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Neue Aktivität</h2>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="z.B. Schwimmen"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">kcal pro Einheit</Label>
                      <Input
                        type="number"
                        placeholder="z.B. 300"
                        value={newCalories}
                        onChange={(e) => setNewCalories(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Einheit</Label>
                      <Input
                        placeholder="z.B. 60min, km"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddType} className="w-full bg-primary text-primary-foreground">
                    Hinzufügen
                  </Button>
                </div>

                <div className="glass-card rounded-xl p-3 space-y-1">
                  <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Gespeicherte Workouts</h2>
                  {activityTypes.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-b-0">
                      <span>{t.name} ({t.caloriesPerUnit} kcal/{t.unit})</span>
                      <button
                        onClick={() => handleDeleteType(t.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </DialogContent>
        </Dialog>
      </div>

      {isEditing && (
        <button onClick={onCancelEdit} className="text-xs text-muted-foreground underline">
          Abbrechen
        </button>
      )}

      {todayActivities.length > 0 && (
        <div className="space-y-0.5">
          {todayActivities.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between text-xs py-1 px-1 rounded hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <span className="font-medium">{a.activityName}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {a.value} {a.unit}
                </span>
                <span className="font-semibold">+{a.calories} kcal</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteActivity(a.id);
                  }}
                  className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5 mt-1">
            <span className="text-xs text-muted-foreground font-medium">Activity Bonus</span>
            <span className="text-sm font-bold text-foreground">+{activityBonus} kcal</span>
          </div>
        </div>
      )}

      {goalActivityBonus && goalActivityBonus > 0 && (
        <>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((activityBonus / goalActivityBonus) * 100))}%`,
                backgroundColor: activityBonus >= goalActivityBonus
                  ? "hsl(var(--success))"
                  : "hsl(var(--primary))",
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {activityBonus === 0
              ? <span>Leg los – verdiene dir deinen Activity Bonus!</span>
              : <span>Du hast schon <span className="font-bold">{Math.min(100, Math.round((activityBonus / goalActivityBonus) * 100))} %</span> deines Activity Ziels geschafft.</span>
            }
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityInput;
