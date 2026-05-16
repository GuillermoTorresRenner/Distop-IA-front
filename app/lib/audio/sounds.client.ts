/**
 * Feedback sonoro sintetizado para la Mesa Virtual.
 *
 * Toda la lógica vive en Web Audio API (sin archivos extra al bundle). El
 * estado de "silenciar" se persiste en localStorage bajo `AUDIO_MUTED_KEY`.
 *
 * Reglas:
 *   - El módulo SOLO debe importarse en código que corre en el browser.
 *   - El AudioContext se crea perezosamente al primer sonido para evitar el
 *     warning "AudioContext was not allowed to start" (que pasa si lo
 *     instanciamos antes de un click del usuario).
 */

export const AUDIO_MUTED_KEY = "distopia.audio-muted";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(ctx.destination);
  return ctx;
}

/** Retoma el AudioContext si el browser lo suspendió tras inactividad. */
async function ensureRunning(c: AudioContext) {
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* el browser puede negarlo si no hay gesto del usuario */
    }
  }
}

/**
 * "Desbloquea" el AudioContext en respuesta a un gesto del usuario.
 *
 * Los browsers prohíben crear/resumir un AudioContext fuera de un gesto;
 * llamar a esta función desde un handler de click/keydown garantiza que el
 * contexto quede en estado "running" para los próximos `playMessage` /
 * `playDiceRoll` que vendrán desde eventos WS (sin gesto del usuario).
 *
 * Idempotente: si el contexto ya está corriendo, no hace nada.
 */
export async function unlockAudio(): Promise<void> {
  const c = getContext();
  if (!c) return;
  await ensureRunning(c);
}

/**
 * Lee el flag de mute desde localStorage. Lo consultamos en cada disparo
 * para que el toggle tenga efecto inmediato sin necesidad de event bus.
 */
export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUDIO_MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIO_MUTED_KEY, muted ? "1" : "0");
  } catch {
    /* ignore quota errors */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sonidos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notificación de mensaje de chat: dos pulsos cortos y brillantes,
 * separados por ~70ms (típico "ping ping" de mensajería).
 *
 * - Sonido distinto al de la tirada (que es un único pulso descendente).
 * - Ondas sinusoidales puras → tono limpio sin armónicos sintéticos.
 * - Segundo pulso una quinta más arriba para sensación de "completado".
 */
export function playMessage(): void {
  if (isMuted()) return;
  const c = getContext();
  if (!c || !masterGain) return;
  void ensureRunning(c);

  const now = c.currentTime;
  const blip = (when: number, freq: number, peak: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
    osc.connect(gain).connect(masterGain!);
    osc.start(when);
    osc.stop(when + 0.08);
  };
  // Dos pulsos. El segundo más agudo y un poco más bajo de volumen, como
  // las notificaciones de iOS/Telegram.
  blip(now, 1175, 0.22); // ~D6
  blip(now + 0.075, 1760, 0.18); // ~A6 (quinta arriba)
}

/**
 * Tirada de dados: reproduce `/sounds/dados.mp3` (sample real de dados
 * rodando), servido desde `front/public/sounds/`.
 *
 * Usa un `HTMLAudioElement` precargado y clonado por disparo para permitir
 * tiradas solapadas sin cortar el sample anterior. El `diceCount` se mantiene
 * en la firma por compatibilidad pero no afecta el sonido.
 */
const DICE_SOUND_URL = "/sounds/dados.mp3";
const DICE_SOUND_VOLUME = 0.6;
let dicePrototype: HTMLAudioElement | null = null;

function getDicePrototype(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (dicePrototype) return dicePrototype;
  dicePrototype = new Audio(DICE_SOUND_URL);
  dicePrototype.preload = "auto";
  return dicePrototype;
}

export function playDiceRoll(_diceCount = 5): void {
  if (isMuted()) return;
  const proto = getDicePrototype();
  if (!proto) return;
  const a = proto.cloneNode(true) as HTMLAudioElement;
  a.volume = DICE_SOUND_VOLUME;
  void a.play().catch(() => {
    /* el browser puede negarlo si no hay gesto previo del usuario */
  });
}
