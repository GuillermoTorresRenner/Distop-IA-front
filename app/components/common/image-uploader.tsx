import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface ImageUploaderProps {
  currentUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  shape?: "circle" | "rectangle";
  maxSizeMb?: number;
  uploadLabel?: string;
  changeLabel?: string;
  removeLabel?: string;
  disabled?: boolean;
  emptyHint?: string;
  className?: string;
}

export function ImageUploader({
  currentUrl,
  onUpload,
  onRemove,
  shape = "rectangle",
  maxSizeMb = 5,
  uploadLabel = "Subir imagen",
  changeLabel = "Cambiar",
  removeLabel = "Quitar",
  disabled,
  emptyHint = "Sin imagen",
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Formato no permitido. Usa JPEG, PNG, WebP o GIF.");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`El archivo supera los ${maxSizeMb} MB.`);
      return;
    }

    setError(null);
    setBusy("upload");
    try {
      await onUpload(file);
    } catch (err) {
      setError(extractMessage(err, "No se pudo subir la imagen"));
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    if (!onRemove) return;
    if (!confirm("¿Eliminar la imagen actual?")) return;
    setError(null);
    setBusy("remove");
    try {
      await onRemove();
    } catch (err) {
      setError(extractMessage(err, "No se pudo eliminar la imagen"));
    } finally {
      setBusy(null);
    }
  }

  const preview = currentUrl;
  const isCircle = shape === "circle";

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden border border-border/60 bg-background/40 text-muted-foreground",
          isCircle
            ? "size-28 rounded-full"
            : "aspect-video w-full rounded-lg",
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="font-serif text-xs italic">{emptyHint}</span>
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="font-serif text-xs italic text-destructive">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pickFile}
          disabled={disabled || busy !== null}
        >
          <ImagePlus className="size-4" />
          {preview ? changeLabel : uploadLabel}
        </Button>
        {preview && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || busy !== null}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            {removeLabel}
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const e = err as { response?: { data?: { message?: unknown } }; message?: string };
    const msg = e.response?.data?.message;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg) && typeof msg[0] === "string") return msg[0];
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}
