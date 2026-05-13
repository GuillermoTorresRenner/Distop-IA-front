import { useState, type ReactNode } from "react";
import { cn } from "~/lib/utils";

export interface TabItem {
  id: string;
  label: ReactNode;
  /**
   * Si está definido, se muestra como badge a la derecha del label
   * (útil para conteos: "Equipo (3)").
   */
  badge?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  /** Tab id activa (controlled). Si no se pasa, el componente mantiene estado interno. */
  value?: string;
  onChange?: (id: string) => void;
  /** Tab inicial cuando es uncontrolled. */
  defaultValue?: string;
  className?: string;
  children: ReactNode | ((activeId: string) => ReactNode);
}

/**
 * Sistema de tabs simple alineado con la paleta sangrienta.
 * - Tab activa: subrayado `border-blood` + fondo sutil.
 * - Tab inactiva: borde transparente.
 *
 * Uso:
 *   <Tabs items={[{ id: "a", label: "A" }]}>
 *     {(active) => active === "a" ? <PanelA /> : <PanelB />}
 *   </Tabs>
 */
export function Tabs({
  items,
  value,
  onChange,
  defaultValue,
  className,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items[0]?.id ?? "",
  );
  const active = value ?? internalValue;

  function select(id: string) {
    if (value === undefined) setInternalValue(id);
    onChange?.(id);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-border/60"
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => select(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-md px-4 py-2 text-sm font-medium transition",
                selected
                  ? "border-b-2 border-blood bg-card/70 text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {item.badge != null ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold leading-none",
                    selected
                      ? "bg-blood/20 text-blood"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div>{typeof children === "function" ? children(active) : children}</div>
    </div>
  );
}
