import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

const MAX_MESSAGE = 500;

const CommentSection = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setComments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_MESSAGE) return;

    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      name: name.trim() || "Anonym",
      message: trimmed,
    });

    if (error) {
      toast.error("Kommentar konnte nicht gesendet werden.");
    } else {
      toast.success("Danke für dein Feedback! 🙌");
      setMessage("");
      setName("");
      fetchComments();
    }
    setSubmitting(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "gerade eben";
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  };

  return (
    <section className="max-w-2xl mx-auto px-5 pb-12">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-5 h-5 text-primary shrink-0" />
          <p className="font-bold text-base">Community Feedback</p>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5">
          Deine Meinung ist uns wichtig! Hinterlasse einen Kommentar mit Kritik
          und Anregungen, wie <strong className="text-foreground">MampfLogger</strong> noch
          besser werden kann.
        </p>

        {/* Form */}
        <div className="space-y-3 mb-6">
          <Input
            placeholder="Dein Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            className="bg-background/50"
          />
          <div className="relative">
            <Textarea
              placeholder="Was denkst du über MampfLogger?"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              className="bg-background/50 min-h-[100px] pr-3 pb-8"
            />
            <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
              {message.length}/{MAX_MESSAGE}
            </span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className="font-bold gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Wird gesendet…" : "Absenden"}
          </Button>
        </div>

        {/* Comments list */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Lade Kommentare…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Noch keine Kommentare – sei der Erste! 🚀
          </p>
        ) : (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Letzte Kommentare
            </p>
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-background/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {c.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CommentSection;
