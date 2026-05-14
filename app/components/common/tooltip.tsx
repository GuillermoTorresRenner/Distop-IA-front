import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface TooltipProps {
  content: ReactNode;
  title?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "right" | "left";
  className?: string;
}

/**
 * Tooltip simple basado en hover/focus. Renderiza un cuadrito con título y cuerpo.
 * No requiere portal: usa position absolute relativo al wrapper.
 */
export function Tooltip({
  content,
  title,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  if (!content && !title) return <>{children}</>;

  const position: Record<typeof side, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  return (
    <span
      ref={ref}
      // `min-w-0` evita que el inline-flex se expanda más allá del 100% del
      // padre cuando el children tiene contenido largo dentro de grids/flex.
      className={cn("relative inline-flex min-w-0", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 w-64 max-w-xs rounded-md border border-blood/30 bg-popover px-3 py-2 text-left text-xs text-popover-foreground shadow-lg shadow-black/60",
            position[side],
          )}
        >
          {title ? (
            <span className="mb-1 block font-heading text-[0.65rem] uppercase tracking-widest text-blood">
              {title}
            </span>
          ) : null}
          <span className="block leading-relaxed text-foreground/90">
            {content}
          </span>
        </span>
      ) : null}
    </span>
  );
}
