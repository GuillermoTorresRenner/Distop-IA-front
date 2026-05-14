import { useCallback, useEffect, useState } from "react";
import { AUDIO_MUTED_KEY, isMuted, setMuted } from "~/lib/audio/sounds.client";

/**
 * Estado reactivo del toggle de silenciar sonidos.
 * Lee/escribe localStorage y propaga el cambio entre componentes/montajes
 * vía el evento "storage" (también funciona entre pestañas).
 */
export function useAudioMute() {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isMuted();
  });

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === AUDIO_MUTED_KEY) {
        setMutedState(e.newValue === "1");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  }, []);

  return { muted, toggle };
}
