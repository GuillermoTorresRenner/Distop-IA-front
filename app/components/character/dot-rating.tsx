import { cn } from "~/lib/utils";

interface DotRatingProps {
  value: number;
  max?: number;
  min?: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
  ariaLabel?: string;
}

export function DotRating({
  value,
  max = 5,
  min = 0,
  onChange,
  readOnly,
  size = "md",
  ariaLabel,
}: DotRatingProps) {
  const dotSize = size === "sm" ? "size-2.5" : "size-3.5";
  const dots = Array.from({ length: max }, (_, i) => i + 1);

  function handleClick(dot: number) {
    if (readOnly || !onChange) return;
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
        const filled = dot <= value;
        return (
          <button
            key={dot}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(dot)}
            className={cn(
              "rounded-full border transition",
              dotSize,
              filled
                ? "border-blood bg-blood"
                : "border-muted-foreground/40 bg-transparent",
              !readOnly && "cursor-pointer hover:border-blood/70",
            )}
            aria-label={`${ariaLabel ?? "Punto"} ${dot}`}
          />
        );
      })}
    </span>
  );
}
