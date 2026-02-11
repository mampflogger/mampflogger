import { DailyActivity } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footprints, Route } from "lucide-react";

interface ActivityInputProps {
  activity: DailyActivity;
  onChange: (activity: DailyActivity) => void;
  activityBonus: number;
}

const ActivityInput = ({ activity, onChange, activityBonus }: ActivityInputProps) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="steps" className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5" />
            Schritte
          </Label>
          <Input
            id="steps"
            type="number"
            inputMode="numeric"
            value={activity.steps || ""}
            onChange={(e) =>
              onChange({ ...activity, steps: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
            className="h-11 bg-muted/50"
          />
        </div>
        <div>
          <Label htmlFor="jogging" className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5" />
            Joggen (km)
          </Label>
          <Input
            id="jogging"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={activity.joggingKm || ""}
            onChange={(e) =>
              onChange({ ...activity, joggingKm: parseFloat(e.target.value) || 0 })
            }
            placeholder="0"
            className="h-11 bg-muted/50"
          />
        </div>
      </div>
      {activityBonus > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2">
          <span className="text-xs text-muted-foreground font-medium">Bewegungsbonus</span>
          <span className="text-sm font-bold text-foreground">+{activityBonus} kcal</span>
        </div>
      )}
    </div>
  );
};

export default ActivityInput;
