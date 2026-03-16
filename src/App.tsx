import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { DisclaimerModal } from "@/components/DisclaimerModal";

const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const LearnMore = lazy(() => import("./pages/LearnMore"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const isLovablePreviewHost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith("lovableproject.com") || (host.endsWith(".lovable.app") && host.includes("--"));
};

const PwaUpdateBanner = () => {
  const { needsUpdate, applyUpdate } = usePwaUpdate();
  if (!needsUpdate) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-base font-bold">
          <span className="text-xl">🔄</span>
          <span>Neue Version verfügbar!</span>
        </div>
        <p className="text-sm opacity-90 leading-snug">
          Eine Aktualisierung wurde heruntergeladen. Tippe auf den Button – die App lädt neu und ist sofort auf dem neuesten Stand.
        </p>
        <button
          onClick={applyUpdate}
          className="w-full bg-primary-foreground text-primary font-bold py-3 rounded-xl text-sm active:opacity-80"
        >
          ✓ Jetzt aktualisieren
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const pwaEnabled = !isLovablePreviewHost();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DisclaimerModal />
        {pwaEnabled && <PwaUpdateBanner />}
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/more" element={<LearnMore />} />
              <Route path="/app" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
