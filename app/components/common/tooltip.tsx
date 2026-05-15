import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";

interface TooltipProps {
  content: ReactNode;
  title?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "right" | "left";
  className?: string;
}

const GAP = 8; // separación entre trigger y tooltip
const VIEWPORT_PADDING = 8; // mínimo entre tooltip y borde del viewport

/**
 * Tooltip con portal a `document.body` y posición fixed calculada.
 *
 * Por qué portal: el editor markdown y otros modales viven dentro de
 * contenedores con `overflow: hidden`. Un tooltip con `absolute` queda
 * clipeado o se desborda hacia un lado invisible. Renderizando en el body
 * con `position: fixed`, el tooltip queda libre del DOM tree del trigger.
 *
 * Funcionalidad:
 *   - Abre con hover (mouseenter) y con focus (keyboard accessible).
 *   - Calcula posición a partir del rect del trigger.
 *   - Clamp a viewport: si se sale del borde, lo desplaza para que quede
 *     visible (manteniendo el lado lógicamente solicitado).
 *   - Reposiciona en scroll/resize mientras está abierto.
 */
export function Tooltip({
  content,
  title,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const id = useId();

  const updatePosition = useCallback(() => {
    const trigger = wrapperRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;
    const tr = trigger.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;
    switch (side) {
      case "top":
        top = tr.top - th - GAP;
        left = tr.left + tr.width / 2 - tw / 2;
        break;
      case "bottom":
        top = tr.bottom + GAP;
        left = tr.left + tr.width / 2 - tw / 2;
        break;
      case "left":
        top = tr.top + tr.height / 2 - th / 2;
        left = tr.left - tw - GAP;
        break;
      case "right":
        top = tr.top + tr.height / 2 - th / 2;
        left = tr.right + GAP;
        break;
    }
    // Clamp horizontal.
    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
    if (left + tw > vw - VIEWPORT_PADDING) left = vw - tw - VIEWPORT_PADDING;
    // Clamp vertical. Si no entra, flip al lado opuesto.
    if (top < VIEWPORT_PADDING) {
      if (side === "top") top = tr.bottom + GAP; // flip a bottom
      else top = VIEWPORT_PADDING;
    }
    if (top + th > vh - VIEWPORT_PADDING) {
      if (side === "bottom") top = tr.top - th - GAP; // flip a top
      else top = vh - th - VIEWPORT_PADDING;
    }

    setCoords({ top, left });
  }, [side]);

  // Recalcula al abrir.
  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  // Recalcula en scroll/resize mientras está abierto.
  useEffect(() => {
    if (!open) return;
    function onScroll() {
      updatePosition();
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, updatePosition]);

  if (!content && !title) return <>{children}</>;

  return (
    <span
      ref={wrapperRef}
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
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              id={id}
              role="tooltip"
              // `visibility:hidden` mientras coords es null evita el "flash"
              // en el primer render (antes del useLayoutEffect que calcula
              // posición). El padre garantiza que en el segundo paint ya
              // tiene coords.
              style={{
                position: "fixed",
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                visibility: coords ? "visible" : "hidden",
              }}
              className="pointer-events-none z-1000 w-64 max-w-xs rounded-md border border-blood/30 bg-popover px-3 py-2 text-left text-xs text-popover-foreground shadow-lg shadow-black/60"
            >
              {title ? (
                <span className="mb-1 block font-heading text-[0.65rem] uppercase tracking-widest text-blood">
                  {title}
                </span>
              ) : null}
              <span className="block leading-relaxed text-foreground/90">
                {content}
              </span>
            </div>,
            document.body
          )
        : null}
    </span>
  );
}
