import { Dices, EyeOff, HeartCrack, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { RollVtmInput } from "~/lib/socket/types";

export interface RollerPrefill {
  pool?: number;
  label?: string;
  characterId?: string;
  /**
   * Penalizador por heridas del personaje seleccionado (negativo o 0).
   * Lo emite la hoja de personaje. Se usa para mostrar el desglose en el
   * preview y para enviárselo al back, que lo persiste con la tirada.
   */
  woundPenalty?: number;
  /**
   * Voluntad actual del personaje seleccionado. Si está definido, los toggles
   * de voluntad se deshabilitan cuando no alcanza el saldo. Si es undefined
   * (tirada sin personaje asociado), los toggles quedan deshabilitados también.
   */
  willpowerAvailable?: number;
  /** Incrementa cuando cambia para forzar re-set del form aunque pool sea igual */
  signature?: number;
}

interface DiceRollerVtMProps {
  canTryPrivate: boolean;
  prefill?: RollerPrefill;
  onRoll: (
    input: RollVtmInput
  ) => Promise<{ ok: boolean; error?: string; id?: string }>;
}

/**
 * Roller VtM V20:
 *   pool d10s contra dificultad. 10 con especialidad = doble éxito.
 *   1s restan éxitos.
 *   Voluntad puede usarse para dos cosas (cada una cuesta 1 punto):
 *     - éxito automático no removible por 1s.
 *     - anular el penalizador por heridas en esta tirada.
 *   Pifia: 0 éxitos finales con al menos un 1.
 */
export function DiceRollerVtM({
  canTryPrivate,
  prefill,
  onRoll,
}: DiceRollerVtMProps) {
  const [pool, setPool] = useState(5);
  const [difficulty, setDifficulty] = useState(6);
  const [specialty, setSpecialty] = useState(false);
  const [wpSuccess, setWpSuccess] = useState(false);
  const [wpWound, setWpWound] = useState(false);
  const [label, setLabel] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aplica prefill cuando cambia su signature (al hacer click-to-roll en la hoja).
  useEffect(() => {
    if (!prefill) return;
    if (typeof prefill.pool === "number") setPool(prefill.pool);
    if (typeof prefill.label === "string") setLabel(prefill.label);
    // Reset de los toggles de voluntad cuando viene una selección nueva,
    // para no arrastrar gastos del último click.
    setWpSuccess(false);
    setWpWound(false);
  }, [prefill?.signature]);

  // Penalizador por heridas que vino del prefill (negativo o 0).
  const rawPenalty = Math.min(0, prefill?.woundPenalty ?? 0);
  const effectivePenalty = wpWound ? 0 : rawPenalty;
  const previewPool = Math.max(1, pool + effectivePenalty);

  // Voluntad disponible para gastar en esta tirada. Si no hay personaje
  // asociado (tirada anónima), el saldo es 0 y los toggles quedan deshabilitados.
  const wpBudget = prefill?.willpowerAvailable ?? 0;
  /** Cuántos puntos de voluntad costaría la combinación dada. */
  function wpCost(success: boolean, wound: boolean) {
    return (success ? 1 : 0) + (wound ? 1 : 0);
  }
  const wpToSpend = wpCost(wpSuccess, wpWound);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const resp = await onRoll({
      pool,
      difficulty,
      specialty,
      willpowerForSuccess: wpSuccess,
      willpowerForWound: wpWound,
      woundPenalty: rawPenalty,
      isPublic,
      label: label.trim() || undefined,
      characterId: prefill?.characterId,
    });
    setBusy(false);
    if (!resp.ok) setError(resp.error ?? "No se pudo tirar");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberStepper
          label="Pool (d10)"
          value={pool}
          min={1}
          max={20}
          onChange={setPool}
        />
        <NumberStepper
          label="Dificultad"
          value={difficulty}
          min={2}
          max={10}
          onChange={setDifficulty}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Toggle
          active={specialty}
          onToggle={() => setSpecialty((v) => !v)}
          icon={<Star className="size-3.5" />}
          label="Especialidad"
          tooltip="Especialidad (V20): si tu habilidad tiene especialidad declarada, cada 10 que saques cuenta como 2 éxitos."
        />
        <Toggle
          active={wpSuccess}
          onToggle={() => {
            // Si vamos a activar, validamos que no exceda el saldo.
            if (!wpSuccess && wpCost(true, wpWound) > wpBudget) return;
            setWpSuccess((v) => !v);
          }}
          icon={<Zap className="size-3.5" />}
          label="Voluntad: éxito"
          tooltip={
            prefill?.characterId === undefined
              ? "Asocia un personaje para gastar Voluntad."
              : wpBudget === 0
                ? "Tu personaje no tiene puntos de Voluntad actuales."
                : !wpSuccess && wpCost(true, wpWound) > wpBudget
                  ? "No te alcanzan los puntos de Voluntad para esta combinación."
                  : "Gasta 1 punto de Voluntad para sumar 1 éxito automático no removible por 1s. La pifia sigue contando: la Voluntad no rescata de un botch."
          }
          disabled={
            prefill?.characterId === undefined ||
            (!wpSuccess && wpCost(true, wpWound) > wpBudget)
          }
        />
        <Toggle
          active={wpWound}
          onToggle={() => {
            if (!wpWound && wpCost(wpSuccess, true) > wpBudget) return;
            setWpWound((v) => !v);
          }}
          icon={<HeartCrack className="size-3.5" />}
          label="Voluntad: anular heridas"
          tooltip={
            rawPenalty === 0
              ? "Sin heridas penalizadoras: no hay nada que anular."
              : prefill?.characterId === undefined
                ? "Asocia un personaje para gastar Voluntad."
                : wpBudget === 0
                  ? "Tu personaje no tiene puntos de Voluntad actuales."
                  : !wpWound && wpCost(wpSuccess, true) > wpBudget
                    ? "No te alcanzan los puntos de Voluntad para esta combinación."
                    : "Gasta 1 punto de Voluntad para anular el penalizador por heridas en esta tirada. Tu pool no se ve reducido por el daño recibido."
          }
          disabled={
            rawPenalty === 0 ||
            prefill?.characterId === undefined ||
            (!wpWound && wpCost(wpSuccess, true) > wpBudget)
          }
        />
        {canTryPrivate ? (
          <Toggle
            active={!isPublic}
            onToggle={() => setIsPublic((v) => !v)}
            icon={<EyeOff className="size-3.5" />}
            label="Privada"
            tooltip="Tirada privada: solo el narrador y tú veréis el resultado. Queda registrada para auditoría."
          />
        ) : null}
      </div>

      {rawPenalty < 0 ? (
        <p className="text-[10px] text-amber-400/90">
          Penalización por heridas: {rawPenalty}
          {wpWound ? (
            <span className="ml-1 text-emerald-300">
              · anulada por Voluntad
            </span>
          ) : null}
        </p>
      ) : null}

      {prefill?.characterId && wpToSpend > 0 ? (
        <p className="text-[10px] text-amber-300">
          Gastarás {wpToSpend}{" "}
          {wpToSpend === 1 ? "punto" : "puntos"} de Voluntad ({wpBudget}{" "}
          disponibles).
        </p>
      ) : null}

      {error ? <p className="text-xs text-blood">{error}</p> : null}

      <Button
        type="submit"
        disabled={busy}
        className="w-full bg-blood text-blood-foreground hover:bg-blood/90"
      >
        <Dices className="size-4" />
        {busy
          ? "Tirando..."
          : `Tirar ${previewPool}d10 vs ${difficulty}`}
      </Button>
    </form>
  );
}

// ── Subcomponentes ───────────────────────────────────────────────

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  function clamp(v: number) {
    return Math.max(min, Math.min(max, v));
  }
  return (
    <div>
      <label className="mb-1 block text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center rounded-md border border-input bg-input/30">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          className="px-2 py-1 text-sm font-heading hover:bg-blood/20"
        >
          −
        </button>
        <input
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onChange(clamp(n));
          }}
          className="h-9 w-full bg-transparent text-center font-heading text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          className="px-2 py-1 text-sm font-heading hover:bg-blood/20"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({
  active,
  onToggle,
  icon,
  label,
  tooltip,
  disabled = false,
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  disabled?: boolean;
}) {
  const button = (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-heading uppercase tracking-wider transition-colors",
        active
          ? "border-blood bg-blood/20 text-blood-foreground"
          : "border-border bg-input/30 text-muted-foreground hover:bg-blood/10",
        disabled && "opacity-40 cursor-not-allowed hover:bg-input/30"
      )}
    >
      {icon}
      {label}
    </button>
  );

  if (!tooltip) return button;
  return (
    <Tooltip content={tooltip} title={label} side="top">
      {button}
    </Tooltip>
  );
}
