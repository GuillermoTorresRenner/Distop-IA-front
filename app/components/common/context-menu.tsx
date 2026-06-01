import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Renders a separator line above this item */
  separator?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface UseContextMenuReturn {
  onContextMenu: (items: ContextMenuItem[]) => (e: React.MouseEvent) => void;
  menu: React.ReactNode;
}

export function useContextMenu(): UseContextMenuReturn {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;

    function handleClose(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setState(null);
    }

    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleClose);
    };
  }, [state]);

  // Adjust position so menu doesn't clip outside the viewport
  useEffect(() => {
    if (!state || !menuRef.current) return;
    const el = menuRef.current;
    const { innerWidth, innerHeight } = window;
    const rect = el.getBoundingClientRect();
    let { x, y } = state;
    if (x + rect.width > innerWidth) x = innerWidth - rect.width - 8;
    if (y + rect.height > innerHeight) y = innerHeight - rect.height - 8;
    if (x !== state.x || y !== state.y) setState(s => s ? { ...s, x, y } : null);
  }, [state]);

  const onContextMenu = (items: ContextMenuItem[]) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ x: e.clientX, y: e.clientY, items });
  };

  const menu = state
    ? createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", left: state.x, top: state.y, zIndex: 9999 }}
          className="min-w-[180px] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl"
          onMouseDown={e => e.stopPropagation()}
        >
          {state.items.map((item, i) => (
            <div key={i}>
              {item.separator && (
                <div className="my-1 h-px bg-border/60" />
              )}
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  setState(null);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors",
                  "disabled:pointer-events-none disabled:opacity-40",
                  item.danger
                    ? "text-blood hover:bg-blood/10"
                    : "text-foreground hover:bg-muted/50",
                )}
              >
                {item.icon && (
                  <span className="size-3.5 shrink-0 [&>svg]:size-3.5">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )
    : null;

  return { onContextMenu, menu };
}
