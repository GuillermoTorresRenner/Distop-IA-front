import { EyeOff, Loader2, Star, Trash2, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { DiceRoll } from "~/lib/socket/types";

interface RollHistoryProps {
  rolls: DiceRoll[];
  latestRollId: string | null;
  onDismissLatest?: () => void;
  /** Si está definido y true, muestra el botón "Limpiar" (solo narrador). */
  canClear?: boolean;
  onClear?: () => void;
  clearing?: boolean;
}

export function RollHistory({
  rolls,
  latestRollId,
  onDismissLatest,
  canClear = false,
  onClear,
  clearing = false,
}: RollHistoryProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Auto-dismiss del highlight de la última tirada después de 1.5s.
  useEffect(() => {
    if (!latestRollId || !onDismissLatest) return;
    const t = setTimeout(() => onDismissLatest(), 1500);
    return () => clearTimeout(t);
  }, [latestRollId, onDismissLatest]);

  // Autoscroll al fondo cuando llega una tirada nueva (igual que el chat).
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rolls.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <span className="text-sm font-heading uppercase tracking-wider text-muted-foreground">
          Historial de tiradas
        </span>
        {canClear && onClear ? (
          <Tooltip
            title="Limpiar historial"
            content="Borra permanentemente todas las tiradas de esta crónica. Esta acción no se puede deshacer."
            side="left"
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClear}
              disabled={clearing || rolls.length === 0}
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-blood"
            >
              {clearing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
              Limpiar
            </Button>
          </Tooltip>
        ) : null}
      </div>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
      >
        {rolls.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Aún no hay tiradas en esta sesión.
          </p>
        ) : (
          rolls.map((roll) => (
            <RollCard
              key={roll.id}
              roll={roll}
              highlight={roll.id === latestRollId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RollCard({ roll, highlight }: { roll: DiceRoll; highlight: boolean }) {
  const authorName = roll.user?.nickname ?? roll.user?.email ?? "Anónimo";
  const at = new Date(roll.createdAt).toLocaleTimeString();

  const resultColor = roll.isBotch
    ? "text-blood"
    : roll.successes > 0
      ? "text-emerald-400"
      : "text-muted-foreground";

  return (
    <article
      className={cn(
        "rounded-md border border-border bg-card/60 p-2 transition-all",
        highlight && "ring-2 ring-blood shadow-lg shadow-blood/30 scale-[1.02]"
      )}
    >
      <header className="flex items-start justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-heading uppercase tracking-wider text-blood">
              {authorName}
            </span>
            {roll.character ? (
              <span className="text-muted-foreground">
                · {roll.character.name}
              </span>
            ) : null}
          </div>
          {roll.label ? (
            <p className="text-muted-foreground truncate">
              {roll.label}
            </p>
          ) : null}
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {at}
        </span>
      </header>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        {roll.rolls.map((d, i) => (
          <Die
            key={i}
            value={d}
            difficulty={roll.difficulty}
            specialty={roll.specialty}
          />
        ))}
      </div>

      <footer className="mt-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>
            {roll.pool}d10 · dif {roll.difficulty}
          </span>
          {roll.specialty ? (
            <Tooltip
              title="Especialidad"
              content="Con especialidad declarada, cada 10 cuenta como 2 éxitos."
            >
              <span className="inline-flex items-center gap-0.5">
                <Star className="size-3" />
              </span>
            </Tooltip>
          ) : null}
          {roll.willpowerSpent ? (
            <Tooltip
              title="Voluntad"
              content="Punto de Fuerza de Voluntad gastado: +1 éxito automático no removible por 1s."
            >
              <span className="inline-flex items-center gap-0.5">
                <Zap className="size-3" />
              </span>
            </Tooltip>
          ) : null}
          {!roll.isPublic ? (
            <Tooltip
              title="Tirada privada"
              content="Sólo el narrador y quien tiró ven el resultado. Queda registrada para auditoría."
            >
              <span className="inline-flex items-center gap-0.5 text-blood">
                <EyeOff className="size-3" />
              </span>
            </Tooltip>
          ) : null}
        </div>
        <strong className={cn("font-heading uppercase tracking-wider", resultColor)}>
          {roll.isBotch
            ? "Pifia"
            : `${roll.successes} ${roll.successes === 1 ? "éxito" : "éxitos"}`}
        </strong>
      </footer>
    </article>
  );
}

function Die({
  value,
  difficulty,
  specialty,
}: {
  value: number;
  difficulty: number;
  specialty: boolean;
}) {
  const isSuccess = value >= difficulty;
  const isOne = value === 1;
  const isCrit = specialty && value === 10;

  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-sm border text-[11px] font-heading font-bold",
        isCrit && "border-amber-400 bg-amber-400/20 text-amber-300",
        !isCrit && isSuccess && "border-emerald-500 bg-emerald-500/20 text-emerald-300",
        isOne && "border-blood bg-blood/20 text-blood",
        !isCrit && !isSuccess && !isOne && "border-border bg-muted/30 text-muted-foreground"
      )}
      title={
        isCrit
          ? `${value} (doble éxito por specialty)`
          : isSuccess
            ? `${value} (éxito)`
            : isOne
              ? `${value} (resta un éxito)`
              : `${value}`
      }
    >
      {value}
    </span>
  );
}
