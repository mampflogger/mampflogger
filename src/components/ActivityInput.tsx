import { useState } from "react";
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
}: ActivityInputProps) => {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>(() => {
    const types = loadActivityTypes();
    // Sort by last used (stored order)
    const lastUsedId = localStorage.getItem("foodlog-last-activity-type");
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

  // Sync editing state
  const isEditing = !!editingActivity;

  const handleSubmit = () => {
    const type = activityTypes.find((t) => t.id === selectedTypeId);
    if (!type || !value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    const calories = Math.round(type.caloriesPerUnit * numValue);

    // Move last used type to top
    localStorage.setItem("foodlog-last-activity-type", type.id);
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
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 bg-muted/50 text-xs px-2"
          />
        </div>
        <div className="flex-1 min-w-0">
          <Label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Bewegungsart
          </Label>
          <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
            <SelectTrigger className="h-9 text-xs w-full">
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
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Neue Bewegungsart</DialogTitle>
                  <DialogDescription>
                    Definiere eine neue Sportart mit Kalorienverbrauch pro Einheit.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
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
                  {/* List existing types with delete */}
                  <div className="border-t border-border pt-3 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Vorhandene Typen</p>
                    {activityTypes.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs py-1">
                        <span>{t.name} ({t.caloriesPerUnit} kcal/{t.unit})</span>
                        <button
                          onClick={() => handleDeleteType(t.id)}
                          className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
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
            <span className="text-xs text-muted-foreground font-medium">Bewegungsbonus</span>
            <span className="text-sm font-bold text-foreground">+{activityBonus} kcal</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityInput;
