import {
  ChevronDown,
  Download,
  FileCode2,
  FileText,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import type { Character } from "~/lib/api/characters/characters.types";
import { downloadBlob } from "~/lib/character-portable/download";
import {
  characterToPortable,
  slugifyForFilename,
} from "~/lib/character-portable/serialize";
import { cn } from "~/lib/utils";

type Format = "json" | "md" | "pdf";

/**
 * Dropdown "Exportar" para la hoja de personaje. Genera el archivo en el
 * cliente y dispara la descarga. PDF se carga via `await import()` para
 * mantener fuera del bundle inicial los ~400KB de pdf-lib.
 *
 * `compact`: ícono solo (sin texto), pensado para usarse dentro de tarjetas.
 */
export function ExportCharacterButton({
  character,
  compact = false,
}: {
  character: Character;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cierra al click fuera.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function exportAs(format: Format) {
    setBusy(format);
    try {
      const baseName = slugifyForFilename(character.name);
      if (format === "json") {
        const data = characterToPortable(character);
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        downloadBlob(`${baseName}.character.json`, blob);
      } else if (format === "md") {
        const { characterToMarkdown } = await import(
          "~/lib/character-portable/markdown"
        );
        const md = characterToMarkdown(character);
        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        downloadBlob(`${baseName}.md`, blob);
      } else if (format === "pdf") {
        const { characterToPdf } = await import(
          "~/lib/character-portable/pdf"
        );
        const bytes = await characterToPdf(character);
        const blob = new Blob([new Uint8Array(bytes)], {
          type: "application/pdf",
        });
        downloadBlob(`${baseName}.pdf`, blob);
      }
      setOpen(false);
    } catch (err) {
      console.error("export failed", err);
      // Sin toast global por ahora; el dropdown se queda abierto para reintentar.
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      {compact ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Exportar ${character.name}`}
          title="Exportar"
          className="text-foreground/70 hover:bg-blood/10 hover:text-blood"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="border-border/60"
        >
          <Download className="size-4" />
          Exportar
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </Button>
      )}
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-blood/30 bg-popover text-popover-foreground shadow-lg"
        >
          <MenuItem
            icon={<FileText className="size-4" />}
            label="PDF (hoja oficial)"
            description="Formato cercano al manual V20."
            onClick={() => void exportAs("pdf")}
            busy={busy === "pdf"}
          />
          <MenuItem
            icon={<FileCode2 className="size-4" />}
            label="Markdown (.md)"
            description="Para Obsidian. Funciona sin plugins."
            onClick={() => void exportAs("md")}
            busy={busy === "md"}
          />
          <MenuItem
            icon={<FileCode2 className="size-4" />}
            label="JSON portable"
            description="Para importar en otra instalación."
            onClick={() => void exportAs("json")}
            busy={busy === "json"}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-blood/10",
        busy && "opacity-60",
      )}
    >
      <span className="mt-0.5 shrink-0 text-blood">
        {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
