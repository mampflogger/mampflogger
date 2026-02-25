import { useRegisterSW } from "virtual:pwa-register/react";

export function usePwaUpdate() {
  const {
    needRefresh: [needsUpdate, setNeedsUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("[PWA] SW registered", r);
    },
    onRegisterError(error) {
      console.error("[PWA] SW registration error", error);
    },
  });

  const applyUpdate = () => {
    updateServiceWorker(true);
  };

  return { needsUpdate, applyUpdate };
}
