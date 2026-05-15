import {
  Bold,
  Eye,
  Heading,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  PencilLine,
  Quote,
} from "lucide-react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "~/components/ui/button";
import { Tooltip } from "~/components/common/tooltip";
import { cn } from "~/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  /**
   * Si está definido, se muestra el botón "Imagen" en la toolbar y se
   * usa este handler para subir el archivo. Debe devolver la URL pública.
   */
  onUploadImage?: (file: File) => Promise<string>;
}

type Mode = "edit" | "preview";

/**
 * Editor markdown con toolbar de atajos y vista previa.
 *
 * No es WYSIWYG: el usuario escribe markdown en un textarea, y la toolbar
 * inserta sintaxis en la posición del cursor. La pestaña "Vista previa"
 * renderiza con react-markdown + remark-gfm (tablas, listas con checks,
 * strikethrough, etc.).
 */
export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  placeholder,
  maxLength = 8000,
  onUploadImage,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>("edit");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function insertAround(prefix: string, suffix: string = prefix): void {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const next = before + prefix + (selected || "") + suffix + after;
    if (next.length > maxLength) return;
    onChange(next);
    // Reposicionar el cursor dentro del wrap insertado.
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function insertLinePrefix(prefix: string): void {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = value.slice(0, start);
    const lineStart = before.lastIndexOf("\n") + 1;
    const next =
      value.slice(0, lineStart) + prefix + value.slice(lineStart);
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + prefix.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  /**
   * Inserta texto en la posición del cursor.
   *   - `cursorOffset`: posición del cursor relativa al snippet (ignorada si
   *     `selectionRange` está presente).
   *   - `selectionRange`: si está presente, se selecciona ese rango del
   *     snippet (útil para placeholders editables como el alt de una imagen).
   */
  function insertSnippet(
    snippet: string,
    cursorOffset: number,
    selectionRange?: { start: number; end: number }
  ): void {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const next = value.slice(0, start) + snippet + value.slice(start);
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      if (selectionRange) {
        el.setSelectionRange(
          start + selectionRange.start,
          start + selectionRange.end
        );
      } else {
        const cursor = start + cursorOffset;
        el.setSelectionRange(cursor, cursor);
      }
    });
  }

  async function handleImageFile(file: File) {
    if (!onUploadImage) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      // Inserta `![imagen](url)` con "imagen" seleccionado como placeholder
      // del alt, para que el usuario pueda renombrarlo de inmediato.
      const altPlaceholder = "imagen";
      const snippet = `![${altPlaceholder}](${url})`;
      insertSnippet(snippet, snippet.length, {
        start: 2, // después de `![`
        end: 2 + altPlaceholder.length,
      });
      // Auto-cambia a vista previa por unos segundos para confirmar visualmente
      // que la imagen carga; luego vuelve al modo "edit".
      setMode("preview");
      setTimeout(() => setMode("edit"), 1800);
    } catch (err) {
      // El padre maneja errores via toast/alert; acá solo logueamos.
      // eslint-disable-next-line no-console
      console.error("uploadImage failed", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-background/30 p-1">
        <ToolbarButton
          tooltip="Negrita (Cmd/Ctrl+B)"
          onClick={() => insertAround("**")}
          disabled={disabled || mode !== "edit"}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Cursiva (Cmd/Ctrl+I)"
          onClick={() => insertAround("_")}
          disabled={disabled || mode !== "edit"}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Encabezado"
          onClick={() => insertLinePrefix("## ")}
          disabled={disabled || mode !== "edit"}
        >
          <Heading className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Cita"
          onClick={() => insertLinePrefix("> ")}
          disabled={disabled || mode !== "edit"}
        >
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Lista con viñetas"
          onClick={() => insertLinePrefix("- ")}
          disabled={disabled || mode !== "edit"}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Lista numerada"
          onClick={() => insertLinePrefix("1. ")}
          disabled={disabled || mode !== "edit"}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Enlace"
          onClick={() => insertSnippet("[texto](https://)", 1)}
          disabled={disabled || mode !== "edit"}
        >
          <LinkIcon className="size-3.5" />
        </ToolbarButton>
        {onUploadImage ? (
          <ToolbarButton
            tooltip={uploading ? "Subiendo..." : "Imagen (sube y se inserta)"}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || mode !== "edit"}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImageIcon className="size-3.5" />
            )}
          </ToolbarButton>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImageFile(f);
            e.currentTarget.value = "";
          }}
        />

        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton
            tooltip="Editar"
            onClick={() => setMode("edit")}
            active={mode === "edit"}
          >
            <PencilLine className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            tooltip="Vista previa"
            onClick={() => setMode("preview")}
            active={mode === "preview"}
          >
            <Eye className="size-3.5" />
          </ToolbarButton>
        </div>
      </div>

      {/* Cuerpo */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-0 flex-1 resize-none bg-transparent p-3 text-sm leading-relaxed placeholder:italic placeholder:text-muted-foreground focus:outline-none"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {value.trim() ? (
            <article className="markdown-content text-sm leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                // Permitir cualquier URL (incluyendo paths relativos como
                // `/images/journal/...`). react-markdown v9+ filtra por
                // defecto schemes desconocidos; con esto cualquier path es ok.
                urlTransform={(url) => url}
                // Custom render para imágenes: loading lazy + alt accesible
                // + manejo de error visible (si el path queda mal, no se
                // queda en silencio).
                components={{
                  img: ({ src, alt, ...rest }) => (
                    <img
                      {...rest}
                      src={typeof src === "string" ? src : undefined}
                      alt={alt ?? ""}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity =
                          "0.4";
                        (e.currentTarget as HTMLImageElement).title =
                          "No se pudo cargar la imagen";
                      }}
                    />
                  ),
                }}
              >
                {value}
              </ReactMarkdown>
            </article>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Aún no hay contenido para previsualizar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  tooltip,
  onClick,
  disabled,
  active,
  children,
}: {
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={tooltip} side="bottom">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
        className={cn("h-7 w-7", active && "bg-blood/20 text-blood")}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
