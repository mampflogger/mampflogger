import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Activity, BarChart3, Minimize2, Lock, Share, Plus, Smartphone } from "lucide-react";

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

const Landing = () => {
  const navigate = useNavigate();

  // Apply stored color theme (same logic as Index.tsx)
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1"  y="10" width="3" height="7" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="5"  y="6"  width="3" height="11" rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="9"  y="8"  width="3" height="9"  rx="0.8" fill="currentColor" className="text-primary-foreground" />
                <rect x="13" y="3"  width="3" height="14" rx="0.8" fill="currentColor" className="text-primary-foreground" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">MampfLogger</span>
          </div>
          <Button size="sm" onClick={() => navigate("/app")}>
            App öffnen
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-5 pt-16 pb-12 text-center">
        <div className="inline-block mb-5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest">
          Free · No Account · No Ads
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
          EAT SMARTER<br />
          <span className="text-primary">and GET CONTROL</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-3">
          <strong className="text-foreground">MampfLogger</strong> ist das Tool für alle, die Ergebnisse wollen.{" "}
          <strong className="text-foreground">MampfLogger</strong> liefert{" "}
          <strong className="text-foreground">harte Fakten</strong> zu deiner Ernährung, damit du immer die{" "}
          <strong className="text-foreground">volle Kontrolle</strong> über deinen Body und deine Goals hast.
        </p>
        <p className="text-muted-foreground text-sm mb-8 italic">
          Lass dir keinen Bullshit erzählen. Check es selbst!
        </p>
        <Button
          size="lg"
          className="text-base px-8 py-5 font-bold shadow-lg"
          onClick={() => navigate("/app")}
        >
          Jetzt starten →
        </Button>
      </section>

      {/* Divider */}
      <div className="max-w-2xl mx-auto px-5">
        <div className="border-t border-border" />
      </div>

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
      <section className="max-w-2xl mx-auto px-5 pb-10">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-primary shrink-0" />
            <p className="font-bold text-base">App aufs iPhone – in 3 Schritten</p>
          </div>
          <p className="text-muted-foreground text-xs mb-5 leading-relaxed">
            Kein App Store. Kein Konto. Einfach die Seite im Browser öffnen und als App speichern.
          </p>
          <div className="grid gap-3">
            {/* Step 1 */}
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
            {/* Step 2 */}
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
            {/* Step 3 */}
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
      <section className="max-w-2xl mx-auto px-5 pb-16 text-center">
        <div className="glass-card rounded-2xl p-8">
          <p className="font-bold text-lg mb-2">Take your Diet seriously.</p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Egal ob du dein Gewicht droppen möchtest oder einfach nur wissen willst,
            was du dir wirklich reinziehst: Wissen ist Macht. Mit{" "}
            <strong className="text-foreground">MampfLogger</strong> hast du den vollen Durchblick.
          </p>
          <Button
            size="lg"
            className="font-bold px-8"
            onClick={() => navigate("/app")}
          >
            Starte jetzt MampfLogger →
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-0.5">
          <span>Keine Anmeldung · Keine Werbung · Keine Kosten</span>
          <span>© {new Date().getFullYear()} MampfLogger</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
