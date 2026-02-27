import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import LearnMore from "./pages/LearnMore";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaUpdateBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/more" element={<LearnMore />} />
          <Route path="/app" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
