import { Star, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MarkdownEditor } from "~/components/common/markdown-editor";
import { Button } from "~/components/ui/button";

interface SpecialtyDialogProps {
  open: boolean;
  /** Nombre de la habilidad a la que se le asigna la especialidad. */
  abilityName: string;
  /** Valor actual del campo specialty (markdown) o null/empty si no hay. */
  initialValue: string;
  /** True si la hoja está en sólo-lectura: el modal abre, pero sin guardar/borrar. */
  readOnly?: boolean;
  onClose: () => void;
  /** Persiste el nuevo texto. Si se borra todo, llega "" y el caller decide
   * si traducirlo a null. */
  onSave: (next: string) => void;
  /** Limpia la especialidad de la habilidad. */
  onClear: () => void;
}

const MAX_LEN = 2000;

export function SpecialtyDialog({
  open,
  abilityName,
  initialValue,
  readOnly = false,
  onClose,
  onSave,
  onClear,
}: SpecialtyDialogProps) {
  const [body, setBody] = useState(initialValue);

  useEffect(() => {
    if (!open) return;
    setBody(initialValue);
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
  }, [open, initialValue, onClose]);

  if (!open) return null;
  // SSR-safe: el portal solo se monta cuando hay document.
  if (typeof document === "undefined") return null;

  function handleSave() {
    if (readOnly) return;
    onSave(body.trim());
    onClose();
  }

  function handleClear() {
    if (readOnly) return;
    onClear();
    onClose();
  }

  // Renderizamos vía portal en <body> para evitar quedar dentro del <form>
  // padre del personaje. Si quedara anidado, un <button type=submit> en este
  // diálogo o cualquier Enter dispararía el submit del form externo, lo que
  // persistía la hoja sin los cambios del modal y descartaba la especialidad
  // que se acababa de escribir.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Especialidad de ${abilityName}`}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Star className="size-4 shrink-0 text-blood" />
            <h2 className="truncate font-heading text-lg uppercase tracking-wider text-foreground">
              Especialidad · {abilityName}
            </h2>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <p className="font-serif text-xs italic text-muted-foreground">
            Solo se permite declarar especialidad cuando la habilidad alcanza 4
            o más puntos. Describe en qué área te especializas (ej. "Multitudes"
            para Esquiva) y agrega los matices que aplican: contextos, ventajas
            narrativas, recuerdos, etc.
          </p>

          <MarkdownEditor
            value={body}
            onChange={setBody}
            disabled={readOnly}
            maxLength={MAX_LEN}
            placeholder="Ej. **Multitudes** — años huyendo por callejones llenos de gente."
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/40 px-5 py-3">
          <div>
            {!readOnly && initialValue.trim().length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" /> Quitar especialidad
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {!readOnly ? (
              <Button
                type="button"
                onClick={handleSave}
                className="bg-blood text-blood-foreground hover:bg-blood/90"
              >
                <Star className="size-4" />
                Guardar
              </Button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
