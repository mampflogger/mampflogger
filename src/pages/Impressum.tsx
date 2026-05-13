import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const Impressum = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("mampflogger-color-theme") || "yellow";
    const el = document.documentElement;
    el.classList.remove("theme-yellow", "theme-blue", "theme-pink", "theme-orange", "theme-teal", "theme-red", "theme-gray", "theme-gold", "theme-silver", "theme-azure", "theme-cappuccino");
    if (stored !== "green") {
      el.classList.add(`theme-${stored}`);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
          <Button size="sm" variant="outline" className="px-2.5 text-xs" onClick={() => navigate(-1 as any)}>
            ← Zurück
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 py-10 flex-1">
        <h1 className="text-2xl font-extrabold mb-8">Impressum</h1>

        <section className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <p className="font-bold text-foreground mb-1">Anbieter:</p>
            <p>Dieter Netter</p>
            <p>Rintelner Str. 14</p>
            <p>31675 Bückeburg</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">Kontakt:</p>
            <p>E-Mail: <a href="mailto:email@mampflogger.de" className="text-primary hover:underline">email@mampflogger.de</a></p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</p>
            <p>Dieter Netter</p>
            <p>Rintelner Str. 14</p>
            <p>31675 Bückeburg</p>
          </div>

          <div>
            <p className="font-bold text-foreground mb-1">Haftungshinweis:</p>
            <p>
              Dieses Web-Angebot dient rein privaten, informellen Zwecken und verfolgt keine gewerblichen
              Interessen. Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die
              Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber
              verantwortlich.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 text-center text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} MampfLogger</span>
        </div>
      </footer>
    </div>
  );
};

export default Impressum;
