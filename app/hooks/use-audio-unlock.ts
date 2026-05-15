import { useEffect } from "react";
import { unlockAudio } from "~/lib/audio/sounds.client";

/**
 * Suscribe al primer gesto del usuario (click/touch/keydown) para desbloquear
 * el AudioContext. Los browsers prohíben arrancarlo fuera de un gesto, así que
 * sin esto los sonidos disparados por eventos WS no suenan hasta que el
 * usuario interactúe con la página.
 *
 * Una vez desbloqueado, el listener se retira: no necesita reactivarse.
 * Llamar desde un componente que vive en la mesa (ej. el route principal).
 */
export function useAudioUnlock() {
  useEffect(() => {
    let done = false;
    function handler() {
      if (done) return;
      done = true;
      void unlockAudio();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    }
    window.addEventListener("pointerdown", handler, { passive: true });
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);
}
