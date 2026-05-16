import {
  EyeOff,
  HeartCrack,
  Loader2,
  RotateCcw,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-gutter-stable themed-scrollbar p-2 space-y-2"
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

  // Compat: rolls antiguos solo tienen `willpowerEffect`. Si no llegan los
  // flags nuevos, los derivamos del enum legacy.
  const wp = roll.willpowerEffect;
  const wpForSuccess =
    roll.wpForSuccess ?? (wp === "SUCCESS" || wp === "BOTH");
  const wpForWound = roll.wpForWound ?? (wp === "WOUND" || wp === "BOTH");
  const wpForReroll = roll.wpForReroll ?? false;
  const wpCount =
    (wpForSuccess ? 1 : 0) + (wpForWound ? 1 : 0) + (wpForReroll ? 1 : 0);
  const hasWound = roll.woundPenalty < 0;
  const woundAnulledByWp = hasWound && wpForWound;
  const specialtyRerolls = roll.specialtyRerolls ?? [];
  const willpowerRerolls = roll.willpowerRerolls ?? [];

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
                {roll.character.kind && roll.character.kind !== "PC" ? (
                  <span className="ml-1 text-amber-400">
                    ({roll.character.kind === "NPC" ? "PNJ" : "antagonista"})
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
          {roll.label ? (
            <p className="text-muted-foreground truncate">{roll.label}</p>
          ) : null}
          {roll.specialty ? (
            <SpecialtyBadge text={roll.specialtyText ?? null} />
          ) : null}
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {at}
        </span>
      </header>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        {roll.rolls.map((d, i) => (
          <Die
            key={`p-${i}`}
            value={d}
            difficulty={roll.difficulty}
            specialty={roll.specialty}
          />
        ))}
      </div>

      {willpowerRerolls.length > 0 ? (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-amber-500/15 px-1 py-0.5 font-heading text-[9px] uppercase tracking-wider text-amber-300">
            <RotateCcw className="size-3" /> Reroll
          </span>
          {willpowerRerolls.map((d, i) => (
            <Die
              key={`r-${i}`}
              value={d}
              difficulty={roll.difficulty}
              specialty={roll.specialty}
            />
          ))}
        </div>
      ) : null}

      {specialtyRerolls.length > 0 ? (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-blood/20 px-1 py-0.5 font-heading text-[9px] uppercase tracking-wider text-blood">
            <Star className="size-3" /> Esp.
          </span>
          {specialtyRerolls.map((d, i) => (
            <Die
              key={`s-${i}`}
              value={d}
              difficulty={roll.difficulty}
              specialty={false}
              isSpecialtyExtra
            />
          ))}
        </div>
      ) : null}

      {/* Desglose explicativo */}
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
        <span>
          {roll.pool}d10 vs dif {roll.difficulty}
        </span>
        {hasWound ? (
          woundAnulledByWp ? (
            <span className="ml-1 text-emerald-300">
              · heridas {roll.woundPenalty} anuladas con Voluntad
            </span>
          ) : (
            <span className="ml-1 text-amber-400">
              · heridas {roll.woundPenalty} ya aplicadas al pool
            </span>
          )
        ) : null}
        {wpForReroll ? (
          <span className="ml-1 text-amber-300">
            · fallos relanzados con Voluntad
          </span>
        ) : null}
        {wpForSuccess ? (
          <span className="ml-1 text-amber-300">
            · +1 éxito por Voluntad (no removible por 1s)
          </span>
        ) : null}
        {wpCount > 0 ? (
          <span className="ml-1 text-muted-foreground/70">
            · gasta {wpCount} {wpCount === 1 ? "Voluntad" : "Voluntades"}
          </span>
        ) : null}
      </p>

      <footer className="mt-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {wpForSuccess ? (
            <Tooltip
              title="Voluntad: éxito"
              content="1 punto de Voluntad gastado para sumar 1 éxito automático no removible por 1s."
            >
              <span className="inline-flex items-center gap-0.5 text-amber-300">
                <Zap className="size-3" />
              </span>
            </Tooltip>
          ) : null}
          {wpForWound ? (
            <Tooltip
              title="Voluntad: anular heridas"
              content="1 punto de Voluntad gastado para anular el penalizador por heridas en esta tirada."
            >
              <span className="inline-flex items-center gap-0.5 text-emerald-300">
                <HeartCrack className="size-3" />
              </span>
            </Tooltip>
          ) : null}
          {wpForReroll ? (
            <Tooltip
              title="Voluntad: relanzar fallos"
              content="1 punto de Voluntad gastado para relanzar todos los dados que no fueron éxito (una vez)."
            >
              <span className="inline-flex items-center gap-0.5 text-amber-300">
                <RotateCcw className="size-3" />
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

/**
 * Badge que aparece en la cabecera de la tirada cuando se usó especialidad.
 * Sólo muestra el texto "Especialidad" en verde. Al hacer hover, el tooltip
 * incluye el snapshot del texto declarado (markdown). Si la tirada no trae
 * texto (compat con tiradas antiguas), el tooltip explica la regla genérica.
 */
function SpecialtyBadge({ text }: { text: string | null }) {
  const hasText = !!text && text.trim().length > 0;
  const content = hasText ? (
    <span className="block space-y-1">
      <span className="block font-heading text-[0.6rem] uppercase tracking-widest text-emerald-300">
        Especialidad usada
      </span>
      <span className="markdown-content block text-[11px] leading-snug text-foreground/90">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          urlTransform={(url) => url}
          components={{
            p: ({ children }) => <span className="block">{children}</span>,
            h1: ({ children }) => (
              <span className="block font-heading">{children}</span>
            ),
            h2: ({ children }) => (
              <span className="block font-heading">{children}</span>
            ),
            h3: ({ children }) => (
              <span className="block font-heading">{children}</span>
            ),
            ul: ({ children }) => (
              <span className="block pl-3">{children}</span>
            ),
            ol: ({ children }) => (
              <span className="block pl-3">{children}</span>
            ),
            li: ({ children }) => (
              <span className="block">• {children}</span>
            ),
          }}
        >
          {text!}
        </ReactMarkdown>
      </span>
    </span>
  ) : (
    "Especialidad declarada en la habilidad. Cada 10 detona un dado extra; si ese extra es 1, anula un éxito."
  );

  return (
    <Tooltip title="Especialidad" content={content} side="top">
      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/60 bg-emerald-500/15 px-1.5 py-0.5 font-heading text-[0.55rem] uppercase tracking-widest text-emerald-300">
        <Star className="size-3" />
        Especialidad
      </span>
    </Tooltip>
  );
}

function Die({
  value,
  difficulty,
  specialty,
  isSpecialtyExtra = false,
}: {
  value: number;
  difficulty: number;
  specialty: boolean;
  /** Si true, este dado es un extra surgido por la regla de especialidad. */
  isSpecialtyExtra?: boolean;
}) {
  const isSuccess = value >= difficulty;
  const isOne = value === 1;
  // Con especialidad activa, un 10 del pool inicial detona un dado extra
  // (no dobla éxitos). Lo marcamos visualmente igual con tono ámbar para
  // que se identifique como "dado que detonó un extra".
  const isTenWithSpecialty = specialty && value === 10;

  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-sm border text-[11px] font-heading font-bold",
        isTenWithSpecialty && "border-amber-400 bg-amber-400/20 text-amber-300",
        isSpecialtyExtra && !isTenWithSpecialty &&
          "border-amber-400/60 bg-amber-400/10 text-amber-300/90",
        !isTenWithSpecialty && !isSpecialtyExtra && isSuccess &&
          "border-emerald-500 bg-emerald-500/20 text-emerald-300",
        isOne && "border-blood bg-blood/20 text-blood",
        !isTenWithSpecialty &&
          !isSpecialtyExtra &&
          !isSuccess &&
          !isOne &&
          "border-border bg-muted/30 text-muted-foreground"
      )}
      title={
        isTenWithSpecialty
          ? `${value} (éxito, detona dado extra de especialidad)`
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
