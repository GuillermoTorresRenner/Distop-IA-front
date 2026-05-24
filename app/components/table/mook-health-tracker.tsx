import { useMemo } from "react";
import { Tooltip } from "~/components/common/tooltip";
import type { MookHealth } from "~/lib/api/combat/combat.types";
import { cn } from "~/lib/utils";

/**
 * Tracker compacto de salud V20 para mooks (copias de antagonista).
 *
 * Render: una fila de 11 cuadritos agrupados por nivel
 *   Bruised (1) · Hurt (1) · Injured (2) · Wounded (2) · Mauled (2) · Crippled (2) · Incapacitated (1)
 *
 * Click en un cuadrito marca daño hasta esa casilla (estilo barra de vida);
 * click en una casilla ya marcada la limpia (y todas las posteriores).
 * Esto evita que el narrador tenga que tocar 7 controles por separado.
 *
 * Tooltip por casilla muestra nombre del nivel y penalizador V20.
 */
type LevelKey = keyof MookHealth;

interface LevelConfig {
  key: LevelKey;
  max: number;
  label: string;
  penalty: string;
}

const LEVELS: LevelConfig[] = [
  { key: "bruised", max: 1, label: "Magullado", penalty: "0" },
  { key: "hurt", max: 1, label: "Herido", penalty: "-1" },
  { key: "injured", max: 2, label: "Lesionado", penalty: "-1" },
  { key: "wounded", max: 2, label: "Herida", penalty: "-2" },
  { key: "mauled", max: 2, label: "Destrozado", penalty: "-2" },
  { key: "crippled", max: 2, label: "Inmovilizado", penalty: "-5" },
  { key: "incapacitated", max: 1, label: "Incapacitado", penalty: "—" },
];

interface Cell {
  level: LevelConfig;
  /** 1-based dentro del nivel. */
  slot: number;
  /** Índice global acumulado (1..11). */
  globalIndex: number;
}

const CELLS: Cell[] = (() => {
  const out: Cell[] = [];
  let gi = 0;
  for (const level of LEVELS) {
    for (let s = 1; s <= level.max; s++) {
      gi += 1;
      out.push({ level, slot: s, globalIndex: gi });
    }
  }
  return out;
})();

const TOTAL_CELLS = CELLS.length; // 11

interface Props {
  health: MookHealth;
  disabled?: boolean;
  /** El componente delega: emite el patch completo (todos los 7 niveles). */
  onChange: (next: MookHealth) => void;
}

export function MookHealthTracker({ health, disabled, onChange }: Props) {
  // Cuántas casillas (globales) están marcadas, sumando por nivel.
  const marked = useMemo(() => {
    let total = 0;
    for (const lvl of LEVELS) {
      total += Math.min(lvl.max, Math.max(0, health[lvl.key] ?? 0));
    }
    return Math.min(TOTAL_CELLS, total);
  }, [health]);

  function setMarked(target: number) {
    if (disabled) return;
    const next: MookHealth = {
      bruised: 0,
      hurt: 0,
      injured: 0,
      wounded: 0,
      mauled: 0,
      crippled: 0,
      incapacitated: 0,
    };
    let remaining = Math.max(0, Math.min(TOTAL_CELLS, target));
    for (const lvl of LEVELS) {
      const take = Math.min(lvl.max, remaining);
      next[lvl.key] = take;
      remaining -= take;
    }
    onChange(next);
  }

  function handleClick(cell: Cell) {
    // Si la casilla ya está marcada, limpia desde ahí en adelante (deja
    // exactamente globalIndex-1 marcadas). Si no, marca hasta esta inclusive.
    if (cell.globalIndex <= marked) {
      setMarked(cell.globalIndex - 1);
    } else {
      setMarked(cell.globalIndex);
    }
  }

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label="Salud"
    >
      {CELLS.map((cell) => {
        const isMarked = cell.globalIndex <= marked;
        const isLast = cell.globalIndex === marked;
        return (
          <Tooltip
            key={cell.globalIndex}
            content={
              <div className="text-xs">
                <div className="font-medium">{cell.level.label}</div>
                <div className="text-muted-foreground">
                  Penalizador {cell.level.penalty}
                </div>
              </div>
            }
            side="top"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleClick(cell)}
              aria-label={`${cell.level.label} ${cell.slot}/${cell.level.max}`}
              aria-pressed={isMarked}
              className={cn(
                "size-3.5 rounded-sm border transition-colors",
                isMarked
                  ? "border-blood bg-blood"
                  : "border-border/60 bg-card/40 hover:border-blood/60",
                isLast && "ring-1 ring-blood/60",
                disabled && "cursor-not-allowed opacity-60",
                // Pequeña separación entre grupos de nivel.
                cell.slot === cell.level.max && "mr-1",
              )}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}
