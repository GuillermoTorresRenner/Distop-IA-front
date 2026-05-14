import { Dices, EyeOff, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { RollVtmInput } from "~/lib/socket/types";

export interface RollerPrefill {
  pool?: number;
  label?: string;
  characterId?: string;
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
 *   1s restan éxitos. Voluntad = +1 éxito automático.
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
  const [willpower, setWillpower] = useState(false);
  const [label, setLabel] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aplica prefill cuando cambia su signature (al hacer click-to-roll en la hoja).
  useEffect(() => {
    if (!prefill) return;
    if (typeof prefill.pool === "number") setPool(prefill.pool);
    if (typeof prefill.label === "string") setLabel(prefill.label);
  }, [prefill?.signature]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const resp = await onRoll({
      pool,
      difficulty,
      specialty,
      willpowerSpent: willpower,
      isPublic,
      label: label.trim() || undefined,
      characterId: prefill?.characterId,
    });
    setBusy(false);
    if (!resp.ok) setError(resp.error ?? "No se pudo tirar");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Etiqueta (ej: Percepción + Alerta)"
          maxLength={120}
          className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm font-serif placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
        />
      </div>

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
          active={willpower}
          onToggle={() => setWillpower((v) => !v)}
          icon={<Zap className="size-3.5" />}
          label="Voluntad"
          tooltip="Gastar 1 punto de Fuerza de Voluntad: agrega 1 éxito automático no removible por 1s. La pifia (botch) sigue contando."
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

      {error ? (
        <p className="text-xs text-blood">{error}</p>
      ) : null}

      <Button
        type="submit"
        disabled={busy}
        className="w-full bg-blood text-blood-foreground hover:bg-blood/90"
      >
        <Dices className="size-4" />
        {busy ? "Tirando..." : `Tirar ${pool}d10 vs ${difficulty}`}
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
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
}) {
  const button = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-heading uppercase tracking-wider transition-colors",
        active
          ? "border-blood bg-blood/20 text-blood-foreground"
          : "border-border bg-input/30 text-muted-foreground hover:bg-blood/10"
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
