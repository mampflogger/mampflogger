import { DailyActivity } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Footprints } from "lucide-react";

interface ActivityInputProps {
  activity: DailyActivity;
  onChange: (activity: DailyActivity) => void;
  activityBonus: number;
}

const ActivityInput = ({ activity, onChange, activityBonus }: ActivityInputProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
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
        <div className="flex flex-col gap-2 pt-5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={activity.intensity === "low"}
              onCheckedChange={() => onChange({ ...activity, intensity: "low" })}
            />
            <span className="text-xs font-medium text-muted-foreground">Low</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={activity.intensity === "high"}
              onCheckedChange={() => onChange({ ...activity, intensity: "high" })}
            />
            <span className="text-xs font-medium text-muted-foreground">High</span>
          </label>
        </div>
      </div>
      {activityBonus > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2">
          <span className="text-xs text-muted-foreground font-medium">
            Bewegungsbonus ({activity.intensity === "high" ? "Powerwalking" : "Spazieren"})
          </span>
          <span className="text-sm font-bold text-foreground">+{activityBonus} kcal</span>
        </div>
      )}
    </div>
  );
};

export default ActivityInput;
