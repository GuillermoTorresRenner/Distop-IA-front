import {
  AtSign,
  Dices,
  Filter,
  Flame,
  Globe2,
  Heart,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import type { ChatRecipientKind } from "~/lib/socket/types";
import { cn } from "~/lib/utils";

/**
 * Filtros disponibles para el chat de la mesa.
 *
 *   - `global`: mensajes públicos a toda la sala (`recipient.kind === 'all'`).
 *   - `tome`:   mensajes dirigidos a mí (susurros + al narrador si lo soy).
 *   - `sheet`:  cambios de hoja (Voluntad, Sangre, Heridas, Humanidad...).
 *   - `system`: anuncios automáticos del sistema (activación de disciplinas).
 *
 * Combinable con OR. Set vacío = mostrar todo.
 */
export type ChatFilter = "global" | "tome" | "sheet" | "system";

/**
 * Filtros para el historial de tiradas.
 *
 *   - `mine`: tiradas hechas por el viewer.
 *   - `wp`:   tiradas que gastaron Voluntad.
 *   - `botch`: pifias.
 *
 * Combinable con OR. Set vacío = mostrar todo.
 */
export type RollFilter = "mine" | "wp" | "botch";

const CHAT_OPTIONS: Array<{
  key: ChatFilter;
  label: string;
  icon: typeof Globe2;
  tooltip: string;
}> = [
  {
    key: "global",
    label: "Globales",
    icon: Globe2,
    tooltip: "Mensajes dirigidos a toda la mesa.",
  },
  {
    key: "tome",
    label: "A mí",
    icon: AtSign,
    tooltip:
      "Susurros recibidos y mensajes al narrador si lo eres. Lo que se te dirige.",
  },
  {
    key: "sheet",
    label: "Cambios",
    icon: Heart,
    tooltip: "Cambios en las hojas: Voluntad, Sangre, Heridas, Humanidad.",
  },
  {
    key: "system",
    label: "Sistema",
    icon: Wand2,
    tooltip:
      "Eventos automáticos: activación de disciplinas y otros anuncios del sistema.",
  },
];

const ROLL_OPTIONS: Array<{
  key: RollFilter;
  label: string;
  icon: typeof Dices;
  tooltip: string;
}> = [
  {
    key: "mine",
    label: "Mías",
    icon: Dices,
    tooltip: "Solo tiradas hechas por ti.",
  },
  {
    key: "wp",
    label: "Voluntad",
    icon: Zap,
    tooltip: "Tiradas que gastaron Voluntad en cualquiera de sus 3 usos.",
  },
  {
    key: "botch",
    label: "Pifias",
    icon: Flame,
    tooltip: "Tiradas que resultaron en pifia.",
  },
];

/**
 * Hook genérico para mantener un Set<string> de filtros activos con
 * persistencia opcional en localStorage. Si `storageKey` no está definido,
 * el estado vive solo en memoria.
 */
function useFilterSet<T extends string>(storageKey?: string) {
  const [active, setActive] = useState<Set<T>>(() => new Set());

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setActive(new Set(parsed as T[]));
      }
    } catch {
      // ignorar JSON inválido o sandbox sin localStorage
    }
  }, [storageKey]);

  const toggle = useCallback(
    (key: T) => {
      setActive((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        if (storageKey && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              storageKey,
              JSON.stringify(Array.from(next)),
            );
          } catch {
            // ignorar
          }
        }
        return next;
      });
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    setActive(new Set());
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignorar
      }
    }
  }, [storageKey]);

  return { active, toggle, clear };
}

export function useChatFilters(storageKey?: string) {
  return useFilterSet<ChatFilter>(storageKey);
}

export function useRollFilters(storageKey?: string) {
  return useFilterSet<RollFilter>(storageKey);
}

/**
 * Barra de chips para el feed del chat. Si nada está activo, se muestra
 * todo el feed (igual que hoy).
 */
export function ChatFilterChips({
  active,
  onToggle,
  onClear,
}: {
  active: Set<ChatFilter>;
  onToggle: (key: ChatFilter) => void;
  onClear: () => void;
}) {
  return (
    <FilterChipsBase
      options={CHAT_OPTIONS}
      active={active}
      onToggle={onToggle}
      onClear={onClear}
      emptyHint="Mostrando todo"
    />
  );
}

/** Igual al de chat pero para el historial de tiradas. */
export function RollFilterChips({
  active,
  onToggle,
  onClear,
}: {
  active: Set<RollFilter>;
  onToggle: (key: RollFilter) => void;
  onClear: () => void;
}) {
  return (
    <FilterChipsBase
      options={ROLL_OPTIONS}
      active={active}
      onToggle={onToggle}
      onClear={onClear}
      emptyHint="Todas"
    />
  );
}

function FilterChipsBase<T extends string>({
  options,
  active,
  onToggle,
  onClear,
  emptyHint,
}: {
  options: Array<{
    key: T;
    label: string;
    icon: typeof Globe2;
    tooltip: string;
  }>;
  active: Set<T>;
  onToggle: (key: T) => void;
  onClear: () => void;
  emptyHint: string;
}) {
  const hasActive = active.size > 0;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/40 px-3 py-1.5">
      <Filter className="size-3 shrink-0 text-muted-foreground" />
      {options.map((opt) => {
        const isOn = active.has(opt.key);
        const Icon = opt.icon;
        return (
          <Tooltip key={opt.key} content={opt.tooltip} side="top">
            <button
              type="button"
              onClick={() => onToggle(opt.key)}
              aria-pressed={isOn}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-heading text-[0.55rem] uppercase tracking-widest transition-colors",
                isOn
                  ? "border-blood bg-blood/20 text-blood-foreground"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:bg-blood/10 hover:text-foreground",
              )}
            >
              <Icon className="size-3" />
              {opt.label}
            </button>
          </Tooltip>
        );
      })}
      {hasActive ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-[10px] italic text-muted-foreground transition hover:text-foreground"
        >
          limpiar
        </button>
      ) : (
        <span className="ml-auto text-[10px] italic text-muted-foreground/70">
          {emptyHint}
        </span>
      )}
    </div>
  );
}

// ── Funciones de match ─────────────────────────────────────────────────────

interface ChatFilterContext {
  currentUserId: string | null;
  /** El back lo emite como ChronicleMemberRole | string | null; ampliamos. */
  myRole: string | null;
}

/**
 * Decide si un item del feed debe mostrarse dado el set de filtros activos.
 * Si no hay filtros, todo pasa (igual al comportamiento sin filtros).
 *
 * El item puede ser `{ _t: "chat", ... }` o `{ _t: "sheet", ... }` (no
 * tipamos estricto para que el caller pueda llamar con `FeedItem`).
 */
export function matchesChatFilters(
  item: ChatFeedItemLike,
  active: Set<ChatFilter>,
  ctx: ChatFilterContext,
): boolean {
  if (active.size === 0) return true;

  if (item._t === "sheet") {
    return active.has("sheet");
  }

  // _t === "chat"
  const speakerKind = item.speaker?.kind;
  const recipientKind: ChatRecipientKind = item.recipient?.kind ?? "all";

  if (speakerKind === "system") {
    return active.has("system");
  }

  if (active.has("global") && recipientKind === "all") return true;

  if (active.has("tome")) {
    // Susurro recibido (yo soy destinatario explícito).
    if (
      recipientKind === "user" &&
      item.recipient?.userId === ctx.currentUserId
    ) {
      return true;
    }
    // Mensaje al narrador y yo lo soy.
    if (recipientKind === "narrator" && ctx.myRole === "NARRATOR") {
      return true;
    }
    // También: mensajes que YO envié a alguien (echo de mis propios susurros).
    // Los muestra para que el autor vea su propia traza.
    if (
      (recipientKind === "user" || recipientKind === "narrator") &&
      item.userId === ctx.currentUserId
    ) {
      return true;
    }
  }

  return false;
}

interface RollFilterContext {
  currentUserId: string | null;
}

export function matchesRollFilters(
  roll: RollLike,
  active: Set<RollFilter>,
  ctx: RollFilterContext,
): boolean {
  if (active.size === 0) return true;
  if (active.has("mine") && roll.userId === ctx.currentUserId) return true;
  if (
    active.has("wp") &&
    (roll.willpowerSpent ||
      roll.wpForSuccess ||
      roll.wpForWound ||
      roll.wpForReroll)
  ) {
    return true;
  }
  if (active.has("botch") && roll.isBotch) return true;
  return false;
}

// Tipos "estructurales" para evitar acoplamiento fuerte con FeedItem/DiceRoll
// del hook (que viven en use-table.ts y dice/types respectivamente).
type ChatFeedItemLike =
  | {
      _t: "chat";
      userId?: string;
      speaker?: { kind: "self" | "character" | "system" };
      recipient?: { kind: ChatRecipientKind; userId?: string | null };
    }
  | { _t: "sheet" };

interface RollLike {
  userId: string;
  isBotch: boolean;
  willpowerSpent: boolean;
  wpForSuccess?: boolean;
  wpForWound?: boolean;
  wpForReroll?: boolean;
}

// Re-exportamos algo útil para que el caller pueda useMemo de forma estable.
export function useMemoActiveCount(active: Set<string>): number {
  return useMemo(() => active.size, [active]);
}
