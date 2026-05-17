import { Info, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "~/components/ui/button";
import {
  loadCatalogBundle,
  resolveInfoEntry,
  type InfoEntry,
  type InfoKind,
} from "~/lib/catalog-cache";

interface InfoModalProps {
  open: boolean;
  kind: InfoKind;
  identifier: string;
  /** Si se conoce el nombre antes de cargar el catálogo (para evitar "Cargando…" vacío). */
  fallbackTitle?: string;
  onClose: () => void;
}

/**
 * Modal informativo para cualquier entidad del catálogo: atributo, habilidad,
 * disciplina (y sus poderes), mérito/defecto, clan, arma, armadura, nivel de
 * salud. Renderiza el texto enriquecido del vault con ReactMarkdown.
 */
export function InfoModal({
  open,
  kind,
  identifier,
  fallbackTitle,
  onClose,
}: InfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<InfoEntry | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setEntry(null);
    loadCatalogBundle()
      .then((bundle) => {
        if (cancelled) return;
        const resolved = resolveInfoEntry(bundle, kind, identifier);
        if (!resolved) {
          setNotFound(true);
        } else {
          setEntry(resolved);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, identifier]);

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

  const title = entry?.title ?? fallbackTitle ?? "Cargando…";
  const subtitle = entry?.subtitle;
  const body = entry?.body;

  const hasContent = !!(body && body.trim().length > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
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
                id="info-modal-title"
                className="font-heading text-lg uppercase tracking-wider text-foreground"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="font-serif text-xs italic text-muted-foreground">
                  {subtitle}
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
          {loading ? (
            <p className="flex items-center gap-2 text-sm italic text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Cargando información…
            </p>
          ) : notFound || !entry ? (
            <NotFoundBlock title={fallbackTitle ?? identifier} />
          ) : (
            <>
              {entry.chips && entry.chips.length > 0 ? (
                <ul className="mb-3 flex flex-wrap gap-1">
                  {entry.chips.map((c, i) => (
                    <li
                      key={`${c}-${i}`}
                      className="rounded-full border border-blood/30 bg-blood/10 px-2 py-0.5 font-heading text-[10px] uppercase tracking-widest text-blood"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}
              {hasContent ? (
                <div className="prose prose-sm prose-invert max-w-none font-serif text-sm leading-relaxed text-foreground/90">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    urlTransform={(url) => url}
                  >
                    {body ?? ""}
                  </ReactMarkdown>
                </div>
              ) : (
                <WipBlock />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WipBlock() {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-card/40 p-4 text-sm italic text-muted-foreground">
      El equipo técnico está trabajando en actualizar esta información.
      Pronto encontrarás aquí el texto del manual.
    </div>
  );
}

function NotFoundBlock({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-card/40 p-4 text-sm italic text-muted-foreground">
      No tenemos información de catálogo para
      <strong className="not-italic text-foreground"> {title}</strong>. El equipo
      técnico está trabajando en actualizarla.
    </div>
  );
}

// ─── Hook práctico para abrir el modal desde cualquier hoja ────────

interface UseInfoModalReturn {
  /** Apertura programática. */
  open: (kind: InfoKind, identifier: string, fallbackTitle?: string) => void;
  /** JSX para inyectar en el árbol (mounted at root once). */
  modal: ReactNode;
}

export function useInfoModal(): UseInfoModalReturn {
  const [state, setState] = useState<{
    open: boolean;
    kind: InfoKind;
    identifier: string;
    fallbackTitle?: string;
  }>({ open: false, kind: "attribute", identifier: "" });

  const open = useCallback(
    (kind: InfoKind, identifier: string, fallbackTitle?: string) => {
      setState({ open: true, kind, identifier, fallbackTitle });
    },
    [],
  );

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const modal = (
    <InfoModal
      open={state.open}
      kind={state.kind}
      identifier={state.identifier}
      fallbackTitle={state.fallbackTitle}
      onClose={close}
    />
  );

  return { open, modal };
}
