import { cn } from "~/lib/utils";

interface DotRatingProps {
  value: number;
  max?: number;
  min?: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
  /**
   * Cantidad de puntos a renderizar. Si es mayor que `max`, los puntos
   * extra se muestran deshabilitados (no clicables) para preservar la
   * alineación con otras filas. Default: `max`.
   *
   * Ej. Voluntad actual con `max=4` y `slots=10` muestra 10 huecos pero
   * solo los primeros 4 son clicables.
   */
  slots?: number;
}

export function DotRating({
  value,
  max = 5,
  min = 0,
  onChange,
  readOnly,
  size = "md",
  ariaLabel,
  slots,
}: DotRatingProps) {
  const dotSize = size === "sm" ? "size-2.5" : "size-3.5";
  const totalSlots = Math.max(max, slots ?? max);
  const dots = Array.from({ length: totalSlots }, (_, i) => i + 1);

  function handleClick(dot: number) {
    if (readOnly || !onChange) return;
    if (dot > max) return; // slot "inactivo": solo decorativo.
    // Click sobre el último relleno → bajar uno; click sobre vacío → subir hasta él.
    const next = dot === value ? Math.max(min, dot - 1) : dot;
    if (next < min) return;
    onChange(next);
  }

  return (
    <span
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className="inline-flex items-center gap-1"
    >
      {dots.map((dot) => {
        const inactive = dot > max;
        const filled = !inactive && dot <= value;
        return (
          <button
            key={dot}
            type="button"
            disabled={readOnly || inactive}
            onClick={() => handleClick(dot)}
            aria-hidden={inactive || undefined}
            tabIndex={inactive ? -1 : undefined}
            className={cn(
              "rounded-full border transition",
              dotSize,
              filled && "border-blood bg-blood",
              !filled && !inactive && "border-muted-foreground/40 bg-transparent",
              inactive &&
                "border-dashed border-muted-foreground/15 bg-transparent",
              !readOnly && !inactive && "cursor-pointer hover:border-blood/70",
            )}
            aria-label={`${ariaLabel ?? "Punto"} ${dot}`}
          />
        );
      })}
    </span>
  );
}
