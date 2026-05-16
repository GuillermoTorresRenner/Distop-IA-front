import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface CollapsibleSectionProps {
  /** Texto principal del header (a la izquierda). */
  title: ReactNode;
  /** Slot derecho del header (badge, contador, etc.). */
  rightSlot?: ReactNode;
  /** Estado inicial. Si hay `storageKey`, este valor solo se aplica la
   *  primera vez (cuando todavía no hay nada persistido). */
  defaultOpen?: boolean;
  /** Si está definido, el estado se persiste en localStorage. Suele ser
   *  algo como `mesa:<chronicleId>:<characterId>:atributos`. */
  storageKey?: string;
  /** Children del cuerpo. Se anima con grid-template-rows. */
  children: ReactNode;
  /** Clases extra del wrapper externo. */
  className?: string;
  /** Si true, no muestra borde ni padding propio; solo controla el toggle.
   *  Útil cuando el children ya tiene su propia card. */
  flush?: boolean;
}

/**
 * Sección plegable con animación de altura suave usando el truco de
 * `grid-template-rows: 0fr ↔ 1fr`. Permite animar height auto sin tener
 * que medir el contenido (que rompe cuando hay nested grids).
 *
 * Estado opcionalmente persistido en localStorage por `storageKey` para
 * mantener la preferencia del usuario entre montajes.
 */
export function CollapsibleSection({
  title,
  rightSlot,
  defaultOpen = false,
  storageKey,
  children,
  className,
  flush = false,
}: CollapsibleSectionProps) {
  // Inicializamos cerrado para evitar mismatch SSR. El estado persistido se
  // hidrata en el primer effect (solo client).
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "1") setOpen(true);
      else if (raw === "0") setOpen(false);
      // Si no hay nada guardado, dejamos el defaultOpen ya seteado.
    } catch {
      // localStorage puede no estar disponible (sandbox, modo incógnito).
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (storageKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          // ignorar
        }
      }
      return next;
    });
  }, [storageKey]);

  return (
    <section
      className={cn(
        flush
          ? "space-y-2"
          : "space-y-2 rounded-md border border-border/60 bg-card/40 p-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-sm px-1 py-1 text-left transition-colors",
          "hover:bg-blood/10",
        )}
      >
        <span className="flex items-center gap-2 font-heading text-xs uppercase tracking-wider text-blood">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {rightSlot}
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-300 ease-out",
              open ? "rotate-180" : "rotate-0",
            )}
          />
        </span>
      </button>
      {/* Animación: padre con grid-template-rows que pasa de 0fr a 1fr.
          El hijo overflow-hidden recorta cuando está cerrado, y el contenido
          interno hace lo suyo. Funciona con altura auto. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
