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
      <section className="max-w-2xl mx-auto px-5 pt-16 pb-12 text-center flex-1 flex flex-col justify-center">
        <div className="inline-block mb-5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mx-auto">
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
          <a href="mailto:email@mampflogger.de" className="hover:text-foreground transition-colors">Kontakt: email@mampflogger.de</a>
          <a href="/impressum" className="hover:text-foreground transition-colors">Impressum</a>
          <a href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</a>
          <span>© {new Date().getFullYear()} MampfLogger</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
