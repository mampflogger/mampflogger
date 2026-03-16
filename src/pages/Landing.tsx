import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import VisitorCounter from "@/components/VisitorCounter";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("mampflogger-color-theme") || "yellow";
    const el = document.documentElement;
    el.classList.remove("theme-yellow", "theme-blue", "theme-pink", "theme-orange", "theme-teal", "theme-red", "theme-gray");
    if (stored !== "green") {
      el.classList.add(`theme-${stored}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
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
            <Button size="sm" variant="outline" className="px-2.5 text-xs" onClick={() => navigate("/more")}>
              Learn more
            </Button>
            <Button size="sm" className="px-2.5 text-xs" onClick={() => navigate("/app")}>
              App öffnen
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-5 pt-8 pb-8 text-center flex-1 flex flex-col justify-center">
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mx-auto">
          Free · No Account · No Ads
        </div>
        <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed mb-5">
          <strong className="text-foreground">MampfLogger</strong> ist deine kostenlose Ernährungs-App mit super smarten KI-Funktionen. Damit zählst du nicht nur stumpf Kalorien, sondern checkst genau, ob dein Körper alle Nährstoffe bekommt, die er braucht.{" "}
          <strong className="text-foreground">MampfLogger</strong> liefert dir präzise Daten und mit dem KI-Coach hast du{" "}
          <strong className="text-foreground">volle Kontrolle</strong> über deinen Körper und erreichst sicher deine Ernährungsziele.
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-4">
          EAT SMARTER<br />
          <span className="text-primary">and GET CONTROL</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-6 italic">
          Lass dir keinen Bullshit erzählen. Check es selbst!
        </p>
        <Button
          size="lg"
          className="text-base px-8 py-5 font-bold shadow-lg mx-auto"
          onClick={() => navigate("/app?settings=profile")}
        >
          Jetzt starten →
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-0.5">
          <span>Keine Anmeldung · Keine Werbung · Keine Kosten</span>
          <VisitorCounter />
          
          <a href="/impressum" className="hover:text-foreground transition-colors">Impressum</a>
          <a href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</a>
          <span>© {new Date().getFullYear()} MampfLogger</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
