import { useState, useRef } from "react";
import {
  ActivityType,
  BookedActivity,
  loadActivityTypes,
  saveActivityTypes,
} from "@/types/profile";
import { generateId } from "@/types/nutrition";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
}: ActivityInputProps) => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(() => {
    const types = loadActivityTypes();
    // Sort by last used (stored order)
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
    editingActivity?.activityTypeId || activityTypes[0]?.id || ""
  );
  const [value, setValue] = useState(editingActivity?.value.toString() || "");
  const [showNewType, setShowNewType] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const valueInputRef = useRef<HTMLInputElement>(null);
  const selectTriggerRef = useRef<HTMLButtonElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Sync editing state
  const isEditing = !!editingActivity;

  const handleSubmit = () => {
    const type = activityTypes.find((t) => t.id === selectedTypeId);
    if (!type || !value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    const calories = Math.round(type.caloriesPerUnit * numValue);

    // Move last used type to top
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
    setTimeout(() => valueInputRef.current?.focus(), 0);
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
      {/* Input row: value, type dropdown, add button */}
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
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitButtonRef.current?.focus(); } }}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Activity
          </Label>
          <Select value={selectedTypeId} onValueChange={(val) => { setSelectedTypeId(val); setTimeout(() => submitButtonRef.current?.focus(), 0); }}>
            <SelectTrigger ref={selectTriggerRef} className="h-9 text-xs w-full" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.click(); } }}>
              <SelectValue placeholder="Wählen..." />
            </SelectTrigger>
            <SelectContent>
              {activityTypes.map((type) => (
                <SelectItem key={type.id} value={type.id} className="text-xs">
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          ref={submitButtonRef}
          onClick={handleSubmit}
          className="h-9 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground shrink-0"
        >
          {isEditing ? "Speichern" : "Buchen"}
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
              '--tw-enter-scale': '1',
              '--tw-exit-scale': '1',
              '--tw-enter-translate-x': '0',
              '--tw-enter-translate-y': '0',
              '--tw-exit-translate-x': '0',
              '--tw-exit-translate-y': '0',
            } as React.CSSProperties}
          >
            {/* Standard header */}
            <header className="shrink-0 sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
                {/* New activity form card */}
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

                {/* Existing types card */}
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

      {/* Booked activities list */}
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
          <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-1.5 mt-1">
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
                  : "hsl(var(--warning, 38 92% 50%))",
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
