import { cn } from "~/lib/utils";

/**
 * Triple toggle de daño: 0 = vacío, 1 = contundente (/), 2 = letal (X).
 * Click cicla 0 → 1 → 2 → 0.
 */
export type DamageState = 0 | 1 | 2;

export function HealthToggle({
  value,
  onChange,
  readOnly,
  ariaLabel,
}: {
  value: number;
  onChange?: (v: DamageState) => void;
  readOnly?: boolean;
  ariaLabel?: string;
}) {
  const safe: DamageState = (value === 1 || value === 2 ? value : 0) as DamageState;

  function cycle() {
    if (readOnly || !onChange) return;
    const next: DamageState = (((safe + 1) % 3) as DamageState);
    onChange(next);
  }

  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={cycle}
      aria-label={ariaLabel}
      aria-pressed={safe !== 0}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-sm border font-mono text-sm leading-none transition",
        safe === 0 && "border-muted-foreground/40 bg-transparent text-transparent",
        safe === 1 && "border-amber-500/70 bg-amber-500/15 text-amber-400",
        safe === 2 && "border-blood/70 bg-blood/20 text-blood",
        !readOnly && "cursor-pointer hover:border-blood/70",
      )}
    >
      {safe === 0 ? "·" : safe === 1 ? "/" : "✕"}
    </button>
  );
}

export function HealthRow({
  value,
  onChange,
  readOnly,
  ariaLabel,
}: {
  value: number;
  onChange?: (v: DamageState) => void;
  readOnly?: boolean;
  ariaLabel?: string;
}) {
  // Mantiene compatibilidad con el patrón anterior: una sola "casilla" por nivel,
  // con triple toggle. Si se quisieran múltiples toggles por nivel a futuro, este
  // componente se puede reutilizar varias veces.
  return (
    <HealthToggle
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      ariaLabel={ariaLabel}
    />
  );
}
