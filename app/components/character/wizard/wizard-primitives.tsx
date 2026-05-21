/**
 * Primitives reutilizables del wizard:
 *   - PointPool        → contador grande con código de color.
 *   - StepperRow       → fila etiqueta + stepper −/+.
 *   - WizardCard       → tarjeta con título y subtítulo.
 *   - PriorityPicker   → selector de prioridad primaria/secundaria/terciaria.
 */

import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { DotRating } from "~/components/character/dot-rating";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface PointPoolProps {
  label: string;
  spent: number;
  total: number;
  remaining: number;
  hint?: ReactNode;
  className?: string;
}

export function PointPool({
  label,
  spent,
  total,
  remaining,
  hint,
  className,
}: PointPoolProps) {
  const tone =
    remaining === 0
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : remaining > 0
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-blood/40 bg-blood/10 text-blood";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs",
        tone,
        className,
      )}
    >
      <div className="flex flex-col">
        <span className="font-heading uppercase tracking-widest">{label}</span>
        {hint ? <span className="text-[0.7rem] opacity-80">{hint}</span> : null}
      </div>
      <div className="flex items-baseline gap-2 font-display">
        <span className="text-2xl leading-none">{remaining}</span>
        <span className="text-[0.7rem] opacity-70">
          de {total} (gastados {spent})
        </span>
      </div>
    </div>
  );
}

interface StepperRowProps {
  label: ReactNode;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** Mostrar los círculos rellenos como rating visual. */
  showDots?: boolean;
  /** Cantidad de círculos totales (defaults a max ?? 5). */
  dotsTotal?: number;
  /** Texto auxiliar a la derecha del label. */
  hint?: ReactNode;
  /** Indica que el valor proviene parcialmente de freebies (resalta). */
  highlight?: boolean;
  /** Botón "i" u otro slot interactivo, a la izquierda del label. */
  info?: ReactNode;
}

export function StepperRow({
  label,
  value,
  min = 0,
  max = 5,
  onChange,
  disabled,
  showDots = true,
  dotsTotal,
  hint,
  highlight,
  info,
}: StepperRowProps) {
  const totalDots = dotsTotal ?? max;
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-sm",
        highlight && "border-blood/40 bg-blood/5",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {info ? <span className="shrink-0">{info}</span> : null}
        <span className="truncate font-serif text-foreground">{label}</span>
        {hint ? (
          <span className="truncate text-[0.7rem] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {showDots ? (
          <span className="flex items-center gap-0.5">
            {Array.from({ length: totalDots }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-2.5 rounded-full border border-blood/60",
                  i < value ? "bg-blood" : "bg-transparent",
                )}
              />
            ))}
          </span>
        ) : null}
        <span className="w-6 text-center font-display text-base text-foreground">
          {value}
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!canDec}
          onClick={() => onChange(value - 1)}
          aria-label="Restar"
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!canInc}
          onClick={() => onChange(value + 1)}
          aria-label="Sumar"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Variante de fila para los pasos de Atributos y Habilidades del wizard.
 *
 * A diferencia de `StepperRow`, no muestra botones +/- ni el número del
 * valor: usa el componente `DotRating` (clic directo sobre los puntos)
 * igual que la hoja de personaje. Es más compacta y consistente con la
 * forma de subir/bajar valores que el jugador ya conoce de la hoja.
 *
 * - `max` es el techo dinámico real (refleja el pool restante y reglas
 *   de creación).
 * - `dotsTotal` es la cantidad de huecos visuales (típicamente 5 para
 *   atributos y 3 para habilidades), para que las filas se vean alineadas
 *   aunque el techo varíe entre filas.
 */
interface DotRatingRowProps {
  label: ReactNode;
  value: number;
  min?: number;
  max?: number;
  /** Cantidad de huecos visuales (default = max). */
  dotsTotal?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** Indica que el valor proviene parcialmente de freebies (resalta). */
  highlight?: boolean;
  /** Botón "i" u otro slot interactivo, a la izquierda del label. */
  info?: ReactNode;
}

export function DotRatingRow({
  label,
  value,
  min = 0,
  max = 5,
  dotsTotal,
  onChange,
  disabled,
  highlight,
  info,
}: DotRatingRowProps) {
  const slots = dotsTotal ?? max;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1.5 text-sm",
        highlight && "border-blood/40 bg-blood/5",
        disabled && "opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {info ? <span className="shrink-0">{info}</span> : null}
        <span className="truncate font-serif text-foreground">{label}</span>
      </div>
      <DotRating
        value={value}
        min={min}
        max={max}
        slots={slots}
        onChange={onChange}
        readOnly={disabled}
        ariaLabel={typeof label === "string" ? label : undefined}
        size="sm"
      />
    </div>
  );
}

interface WizardCardProps {
  title: string;
  subtitle?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}

export function WizardCard({
  title,
  subtitle,
  description,
  children,
  aside,
}: WizardCardProps) {
  return (
    <article className="space-y-4 rounded-lg border border-border/60 bg-card/70 p-5 shadow-lg shadow-black/20">
      <header className="space-y-2">
        <h2 className="font-heading text-2xl uppercase tracking-widest text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="font-display text-sm text-blood/80">{subtitle}</p>
        ) : null}
        {description ? (
          <p className="font-serif text-sm leading-relaxed text-foreground/80">
            {description}
          </p>
        ) : null}
      </header>
      {/* Si hay aside, dos columnas (contenido + 18rem aside). Si no, el
          contenido ocupa el 100% del ancho del card para que steps como
          Atributos y Habilidades — que mueven sus contadores arriba — no
          dejen un hueco lateral vacío. */}
      <div
        className={cn(
          "grid gap-4",
          aside && "xl:grid-cols-[minmax(0,1fr)_18rem]",
        )}
      >
        <div className="min-w-0 space-y-4">{children}</div>
        {aside ? (
          <aside className="space-y-3 xl:w-72">{aside}</aside>
        ) : null}
      </div>
    </article>
  );
}

interface PriorityPickerProps<T extends string> {
  /** Lista de categorías a priorizar. */
  categories: { key: T; label: string; description?: string }[];
  /** Estado actual: categoría → prioridad asignada. */
  value: Record<T, "primary" | "secondary" | "tertiary" | null>;
  /** Etiquetas de cada prioridad para el botón. */
  pools: Record<"primary" | "secondary" | "tertiary", number>;
  onChange: (cat: T, prio: "primary" | "secondary" | "tertiary") => void;
}

export function PriorityPicker<T extends string>({
  categories,
  value,
  pools,
  onChange,
}: PriorityPickerProps<T>) {
  const priorities = ["primary", "secondary", "tertiary"] as const;
  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const current = value[cat.key];
        return (
          <div
            key={cat.key}
            className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-heading text-sm uppercase tracking-wider text-foreground">
                {cat.label}
              </div>
              {cat.description ? (
                <div className="text-[0.7rem] text-muted-foreground">
                  {cat.description}
                </div>
              ) : null}
            </div>
            <div className="flex gap-1">
              {priorities.map((p) => {
                const taken = (Object.entries(value) as [T, typeof current][]).some(
                  ([k, v]) => k !== cat.key && v === p,
                );
                const selected = current === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange(cat.key, p)}
                    className={cn(
                      "min-w-12 rounded-md border px-3 py-1.5 text-xs font-medium transition",
                      selected
                        ? "border-blood bg-blood/20 text-blood"
                        : taken
                          ? "border-border/40 bg-background/60 text-muted-foreground hover:border-blood/40"
                          : "border-border/60 bg-background/60 text-foreground hover:border-blood/40 hover:bg-blood/5",
                    )}
                  >
                    {pools[p]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
