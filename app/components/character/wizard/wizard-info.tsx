/**
 * Botón "i" reutilizable para el wizard.
 *
 * Tiene dos modos:
 *  - `kind`: delega a `useInfoModal()` del catálogo (clan, atributo, habilidad,
 *    disciplina, trasfondo, mérito/defecto, etc.).
 *  - `inline`: abre un modal simple con título + body markdown, para entidades
 *    que no están en `InfoKind` (virtudes, arquetipos, conceptos del manual
 *    como "Puntos gratuitos" o "Reserva de sangre").
 */

import { Info, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "~/components/ui/button";
import { Tooltip } from "~/components/common/tooltip";
import type { InfoKind } from "~/lib/catalog-cache";
import { cn } from "~/lib/utils";

interface InlineInfo {
  title: string;
  subtitle?: string;
  /** Texto largo en Markdown. */
  body?: string | null;
  /** Pildoras meta arriba del body. */
  chips?: string[];
}

interface WizardInfoButtonProps {
  /** Tooltip corto que se muestra al hover (resumen). */
  tooltip?: ReactNode;
  /** Modo catálogo: delega a `useInfoModal` del padre. */
  kind?: InfoKind;
  identifier?: string;
  fallbackTitle?: string;
  /** Modo inline: contenido completo del modal. */
  inline?: InlineInfo;
  /** Callback que el padre pasa para abrir el InfoModal del catálogo. */
  onOpenCatalog?: (kind: InfoKind, identifier: string, fallbackTitle?: string) => void;
  ariaLabel?: string;
  /** Tamaño del icono. */
  size?: "sm" | "md";
  className?: string;
}

export function WizardInfoButton({
  tooltip,
  kind,
  identifier,
  fallbackTitle,
  inline,
  onOpenCatalog,
  ariaLabel = "Más información",
  size = "sm",
  className,
}: WizardInfoButtonProps) {
  const [inlineOpen, setInlineOpen] = useState(false);

  const isCatalog = !!(kind && identifier && onOpenCatalog);
  const isInline = !!inline;
  const disabled = !isCatalog && !isInline;

  function handleClick() {
    if (isCatalog) {
      onOpenCatalog!(kind!, identifier!, fallbackTitle);
      return;
    }
    if (isInline) setInlineOpen(true);
  }

  const iconCls = size === "md" ? "size-4" : "size-3.5";
  const btnCls = cn(
    "inline-flex shrink-0 items-center justify-center rounded-full border border-blood/40 bg-blood/10 text-blood transition hover:bg-blood/20",
    size === "md" ? "size-6" : "size-5",
    disabled && "opacity-30 pointer-events-none",
    className,
  );

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={btnCls}
    >
      <Info className={iconCls} />
    </button>
  );

  return (
    <>
      {tooltip ? (
        <Tooltip content={tooltip} side="top">
          {button}
        </Tooltip>
      ) : (
        button
      )}
      {inline ? (
        <InlineInfoModal
          open={inlineOpen}
          info={inline}
          onClose={() => setInlineOpen(false)}
        />
      ) : null}
    </>
  );
}

interface InlineInfoModalProps {
  open: boolean;
  info: InlineInfo;
  onClose: () => void;
}

function InlineInfoModal({ open, info, onClose }: InlineInfoModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-info-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-blood/20 text-blood">
              <Info className="size-4" />
            </span>
            <div className="min-w-0">
              <h2
                id="wizard-info-title"
                className="font-heading text-lg uppercase tracking-wider text-foreground"
              >
                {info.title}
              </h2>
              {info.subtitle ? (
                <p className="font-serif text-xs italic text-muted-foreground">
                  {info.subtitle}
                </p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Cerrar"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {info.chips && info.chips.length > 0 ? (
            <ul className="mb-3 flex flex-wrap gap-1">
              {info.chips.map((c, i) => (
                <li
                  key={`${c}-${i}`}
                  className="rounded-full border border-blood/30 bg-blood/10 px-2 py-0.5 font-heading text-[10px] uppercase tracking-widest text-blood"
                >
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
          {info.body && info.body.trim().length > 0 ? (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                urlTransform={(url) => url}
              >
                {info.body}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border/60 bg-card/40 p-4 text-sm italic text-muted-foreground">
              El equipo técnico está trabajando en esta entrada. Pronto
              encontrarás aquí más detalle.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
