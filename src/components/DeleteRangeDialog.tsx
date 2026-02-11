import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteRangeDialogProps {
  onCount: (from: string, to: string) => number;
  onDelete: (from: string, to: string) => number;
}

const DeleteRangeDialog = ({ onCount, onDelete }: DeleteRangeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handlePreview = () => {
    if (!fromDate || !toDate) return;
    setPreview(onCount(fromDate, toDate));
  };

  const handleConfirm = () => {
    if (!fromDate || !toDate) return;
    onDelete(fromDate, toDate);
    setConfirmed(true);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 1200);
  };

  const reset = () => {
    setFromDate("");
    setToDate("");
    setPreview(null);
    setConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Einträge löschen</DialogTitle>
          <DialogDescription>
            Wähle einen Zeitraum, um alle Einträge darin zu löschen.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="from-date">Von</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPreview(null); setConfirmed(false); }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="to-date">Bis</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPreview(null); setConfirmed(false); }}
            />
          </div>
          {preview !== null && !confirmed && (
            <p className="text-sm text-destructive font-medium">
              {preview} Einträge werden gelöscht.
            </p>
          )}
          {confirmed && (
            <p className="text-sm text-primary font-medium">✓ Einträge gelöscht!</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {preview === null ? (
            <Button
              onClick={handlePreview}
              disabled={!fromDate || !toDate}
              variant="secondary"
            >
              Vorschau
            </Button>
          ) : !confirmed ? (
            <Button
              onClick={handleConfirm}
              variant="destructive"
              disabled={preview === 0}
            >
              {preview} Einträge löschen
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteRangeDialog;
