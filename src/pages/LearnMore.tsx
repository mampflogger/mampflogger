import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Activity, BarChart3, Minimize2, Lock, Share, Plus, Smartphone } from "lucide-react";
import VisitorCounter from "@/components/VisitorCounter";
import CommentSection from "@/components/CommentSection";

const features = [
  {
    icon: Zap,
    title: "Precision Tracking",
    desc: "Logge dein Food in Sekunden. Behalte in Echtzeit deine Kalorien und Makros im Auge. Nur wer seine Makros kennt, beherrscht das Spiel.",
  },
  {
    icon: Activity,
    title: "Next-Level Activity",
    desc: "Logge auch deine Workouts und Activities für eine exakte Planung deiner Ernährung.",
  },
  {
    icon: BarChart3,
    title: "Clean Dashboard",
    desc: "Dein 7-Tage-Check zeigt dir sofort, ob du im Defizit bist oder deinen Aufbau perfekt triffst.",
  },
  {
    icon: Minimize2,
    title: "Minimal Design",
    desc: "Kein Schnickschnack. Nur du und deine Daten.",
  },
  {
    icon: Lock,
    title: "Keine Anmeldung. Keine Werbung. Keine Kosten.",
    desc: "Deine Daten bleiben auf deinem Gerät. Komplett privat.",
  },
];

const LearnMore = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("mampflogger-color-theme") || "yellow";
    const el = document.documentElement;
    el.classList.remove("theme-yellow", "theme-blue", "theme-pink");
    if (stored !== "green") {
      el.classList.add(`theme-${stored}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="10" width="3" height="7" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="5" y="6" width="3" height="11" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="9" y="8" width="3" height="9" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="13" y="3" width="3" height="14" rx="0.8" fill="currentColor" className="text-primary-foreground" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">MampfLogger</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="px-2.5 text-xs" onClick={() => navigate("/")}>
              Learn more
            </Button>
            <Button size="sm" className="px-2.5 text-xs" onClick={() => navigate("/app")}>
              App öffnen
            </Button>
          </div>
        </div>
      </header>

      {/* Deep Dive section */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-center">
          <strong className="text-foreground">MampfLogger</strong> ist Deep Dive. Du zählst nicht nur stumpf Kalorien, sondern checkst genau,
          ob dein Körper alle Nährstoffe bekommt, die er braucht.
        </p>
      </section>

      {/* Features */}
      <section className="max-w-2xl mx-auto px-5 pb-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6 text-center">
          Die wichtigsten Features für deinen maximalen Progress
        </h2>
        <div className="grid gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card rounded-xl p-4 flex items-start gap-4"
            >
              <div className="mt-0.5 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm mb-0.5">{f.title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PWA Install Guide */}
      <section className="max-w-2xl mx-auto px-5 pb-6">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-primary shrink-0" />
            <p className="font-bold text-base">App aufs iPhone – in 3 Schritten</p>
          </div>
          <p className="text-muted-foreground text-xs mb-5 leading-relaxed">
            Kein App Store. Kein Konto. Einfach die Seite im Browser öffnen und als App speichern.
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-semibold text-sm">In Safari öffnen</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Öffne <span className="font-mono text-foreground text-[11px]">mampflogger.de</span> in Safari – nicht in Chrome oder Firefox.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  Teilen-Button tippen
                  <Share className="w-3.5 h-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Das Viereck mit dem Pfeil nach oben – unten in der Mitte der Safari-Leiste.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  „Zum Home-Bildschirm"
                  <Plus className="w-3.5 h-3.5 text-primary inline" />
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Im Menü nach unten scrollen, auf „Zum Home-Bildschirm" tippen → „Hinzufügen". Fertig! 🎉
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground">
              Für Android: Chrome-Menü (⋮) → „App installieren"
            </p>
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="max-w-2xl mx-auto px-5 pb-6 text-center">
        <div className="glass-card rounded-2xl p-8">
          <p className="font-bold text-lg mb-2">Take your Diet seriously.</p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Egal ob du dein Gewicht droppen möchtest oder einfach nur wissen willst,
            was du dir wirklich reinziehst: Wissen ist Macht. Mit{" "}
            <strong className="text-foreground">MampfLogger</strong> hast du den vollen Durchblick.
          </p>
          <Button
            size="lg"
            className="text-base px-8 py-5 font-bold shadow-lg"
            onClick={() => navigate("/app?settings=profile")}
          >
            Jetzt starten →
          </Button>
        </div>
      </section>

      {/* Community Feedback */}
      <CommentSection />

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-0.5">
          <span>Keine Anmeldung · Keine Werbung · Keine Kosten</span>
          <VisitorCounter />
          <a href="mailto:email@mampflogger.de" className="hover:text-foreground transition-colors">Kontakt: email@mampflogger.de</a>
          <span>© {new Date().getFullYear()} MampfLogger</span>
        </div>
      </footer>
    </div>
  );
};

export default LearnMore;
