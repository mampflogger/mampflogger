import { Textarea } from "@/components/ui/textarea";

interface AudioGuideEditorProps {
  sectionId: string;
  value: string;
  onChange: (sectionId: string, text: string) => void;
}

const AudioGuideEditor = ({ sectionId, value, onChange }: AudioGuideEditorProps) => {
  return (
    <div className="mt-2 rounded-lg border border-primary/30 bg-card/80 p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
        Audio-Hilfetext · {sectionId}
      </p>
      <Textarea
        value={value}
        onChange={(e) => onChange(sectionId, e.target.value)}
        className="min-h-[100px] text-xs leading-relaxed"
        placeholder="Hilfetext für diese Sektion eingeben…"
      />
    </div>
  );
};

export default AudioGuideEditor;
