import { useState, useEffect } from "react";
import { UserProfile, calculateBMR } from "@/types/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Save } from "lucide-react";

interface ProfileDialogProps {
  profile: UserProfile | null;
  onSave: (profile: UserProfile) => void;
}

const ProfileDialog = ({ profile, onSave }: ProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  useEffect(() => {
    if (open && profile) {
      setName(profile.name);
      setBirthYear(String(profile.birthYear));
      setHeightCm(String(profile.heightCm));
      setWeightKg(String(profile.weightKg));
      setGender(profile.gender);
    }
  }, [open, profile]);

  const currentProfile: UserProfile | null =
    name && birthYear && heightCm && weightKg
      ? {
          name,
          birthYear: parseInt(birthYear),
          heightCm: parseInt(heightCm),
          weightKg: parseFloat(weightKg),
          gender,
        }
      : null;

  const bmrPreview = currentProfile ? calculateBMR(currentProfile) : null;

  const handleSave = () => {
    if (!currentProfile) return;
    onSave(currentProfile);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Profil"
        >
          <UserCircle className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Persönliches Profil</DialogTitle>
          <DialogDescription>
            Deine Daten für die Grundumsatz-Berechnung
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="profile-name" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              className="h-11 bg-muted/50"
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Geschlecht
            </Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  gender === "male"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Männlich
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  gender === "female"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Weiblich
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="profile-birth" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Geburtsjahr
              </Label>
              <Input
                id="profile-birth"
                type="number"
                inputMode="numeric"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="1990"
                min={1900}
                max={2025}
                className="h-11 bg-muted/50"
              />
            </div>
            <div>
              <Label htmlFor="profile-height" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Größe (cm)
              </Label>
              <Input
                id="profile-height"
                type="number"
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="180"
                className="h-11 bg-muted/50"
              />
            </div>
            <div>
              <Label htmlFor="profile-weight" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Gewicht (kg)
              </Label>
              <Input
                id="profile-weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="80.0"
                className="h-11 bg-muted/50"
              />
            </div>
          </div>

          {bmrPreview && (
            <div className="rounded-xl bg-accent/40 p-3 text-center">
              <p className="text-xs text-muted-foreground font-medium">Grundumsatz (BMR)</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{bmrPreview}</p>
              <p className="text-xs text-muted-foreground">kcal / Tag</p>
            </div>
          )}

          <Button onClick={handleSave} disabled={!currentProfile} className="w-full h-11 gap-2">
            <Save className="w-4 h-4" />
            Profil speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
