import { FileUp, Loader2, Plus, Skull, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { Button } from "~/components/ui/button";
import {
  listArchetypes,
  listArmors,
  listClans,
  listDisciplines,
  listMeritsFlaws,
  listWeapons,
} from "~/lib/api/catalog/catalog.api";
import { createCharacter } from "~/lib/api/characters/characters.api";
import type { Character } from "~/lib/api/characters/characters.types";
import {
  PortableParseError,
  parsePortableJson,
  resolvePortableToInput,
  type ImportWarning,
  type PortableCatalogs,
} from "~/lib/character-portable/import";
import { cn } from "~/lib/utils";

/**
 * FAB en la esquina inferior derecha de `/characters`.
 *
 *   - Cerrado: muestra un solo botón "+" sangriento.
 *   - Abierto: despliega dos botones:
 *       · "Crear vástago" → navega a /characters/new.
 *       · "Importar JSON" → abre dialog de importación con file picker.
 *
 * Importar valida el JSON con Zod, resuelve catálogos por nombre y crea
 * el personaje como PC propio del usuario (siempre).
 */
export function CharacterFab({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cierra el FAB al hacer click fuera (sin cerrar el dialog si está abierto).
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <>
      <div
        ref={wrapperRef}
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2"
      >
        {open ? (
          <>
            <FabOption
              icon={<FileUp className="size-4" />}
              label="Importar JSON"
              onClick={() => {
                setImporterOpen(true);
                setOpen(false);
              }}
            />
            <FabOption
              icon={<Skull className="size-4" />}
              label="Crear vástago"
              onClick={() => {
                setOpen(false);
                navigate("/characters/new");
              }}
            />
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Nuevo personaje"
          className={cn(
            "flex size-14 items-center justify-center rounded-full bg-blood text-blood-foreground shadow-lg shadow-blood/40 transition-transform hover:scale-105",
            open && "rotate-45",
          )}
        >
          <Plus className="size-6" />
        </button>
      </div>

      <ImporterDialog
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        onImported={() => {
          setImporterOpen(false);
          onCreated();
        }}
      />
    </>
  );
}

function FabOption({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-blood/40 bg-card px-4 py-2 text-sm font-medium text-foreground shadow shadow-black/40 transition hover:border-blood hover:bg-blood/10"
    >
      {icon}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog de importación
// ─────────────────────────────────────────────────────────────────────────────

function ImporterDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (c: Character) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    warnings: ImportWarning[];
    hasBlockingErrors: boolean;
  } | null>(null);
  // Si el parser tira PortableParseError (errores bloqueantes), mostramos
  // los warnings acumulados aunque no haya preview armado.
  const [parseErrors, setParseErrors] = useState<ImportWarning[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<PortableCatalogs | null>(null);
  // Cache del input parseado para reutilizar al crear.
  const inputRef = useRef<ReturnType<typeof resolvePortableToInput> | null>(null);

  // Lock scroll + cierre con Escape.
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

  // Carga los catálogos cuando se abre.
  useEffect(() => {
    if (!open || catalogs) return;
    let cancelled = false;
    Promise.all([
      listClans(),
      listArchetypes(),
      listDisciplines(),
      listMeritsFlaws(),
      listWeapons(),
      listArmors(),
    ])
      .then(([clans, archetypes, disciplines, meritsFlaws, weapons, armors]) => {
        if (cancelled) return;
        setCatalogs({ clans, archetypes, disciplines, meritsFlaws, weapons, armors });
      })
      .catch((err) => {
        if (!cancelled)
          setError(extractAuthError(err, "No se pudo cargar el catálogo."));
      });
    return () => {
      cancelled = true;
    };
  }, [open, catalogs]);

  // Reset cuando se cierra.
  useEffect(() => {
    if (open) return;
    setFile(null);
    setPreview(null);
    setParseErrors(null);
    setError(null);
    setSubmitting(false);
    inputRef.current = null;
  }, [open]);

  async function handleFile(f: File) {
    setFile(f);
    setError(null);
    setPreview(null);
    setParseErrors(null);
    inputRef.current = null;
    if (!catalogs) {
      setError("Catálogo no cargado todavía. Reintenta en un instante.");
      return;
    }
    try {
      const text = await f.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setError("El archivo no es un JSON válido.");
        return;
      }
      const { portable, warnings: parseWarnings } = parsePortableJson(json);
      const resolved = resolvePortableToInput(portable, catalogs, parseWarnings);
      inputRef.current = resolved;
      setPreview({
        name: portable.name,
        warnings: resolved.warnings,
        hasBlockingErrors: resolved.hasBlockingErrors,
      });
    } catch (err) {
      if (err instanceof PortableParseError) {
        // El archivo no es un export válido. Mostramos al usuario qué
        // exactamente está mal para que pueda corregirlo.
        setParseErrors(err.warnings);
        setError(err.message);
      } else {
        const msg =
          err instanceof Error ? err.message : "JSON inválido o corrupto.";
        setError(`No se pudo procesar el archivo: ${msg}`);
      }
    }
  }

  async function handleCreate() {
    if (!inputRef.current) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createCharacter(inputRef.current.input);
      onImported(created);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo crear el personaje."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importar personaje desde JSON"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileUp className="size-4 text-blood" />
            <h2 className="font-heading text-lg uppercase tracking-wider text-foreground">
              Importar personaje
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
            Selecciona un archivo <code>.json</code> exportado desde Distop-IA
            VTT. El personaje se creará como tuyo (PC) y los catálogos (clan,
            disciplinas, armas...) se resolverán contra los de esta
            instalación.
          </p>

          {error ? <FormAlert message={error} /> : null}

          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition",
              file
                ? "border-blood bg-blood/5"
                : "border-border/60 hover:border-blood/60 hover:bg-blood/5",
            )}
          >
            <FileUp className="size-6 text-blood" />
            <span className="text-sm">
              {file ? file.name : "Click para elegir un .json"}
            </span>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>

          {parseErrors ? (
            <WarningsList
              title="Errores que impiden la importación"
              warnings={parseErrors}
              defaultSeverity="error"
            />
          ) : null}

          {preview ? (
            <div className="rounded-md border border-border/60 bg-background/40 p-3 text-sm space-y-3">
              <p>
                Vas a crear a{" "}
                <strong className="text-blood">{preview.name}</strong>.
              </p>
              {preview.warnings.length > 0 ? (
                <WarningsList
                  title="Irregularidades detectadas"
                  warnings={preview.warnings}
                />
              ) : (
                <p className="text-xs text-emerald-300">
                  El JSON pasó todas las validaciones.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/60 bg-background/40 px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!preview || preview.hasBlockingErrors || submitting}
            className="bg-blood text-blood-foreground hover:bg-blood/90"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Crear personaje
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Lista visual de warnings agrupados por severidad. Cada grupo (errores,
 * warnings, infos) tiene un encabezado con su color correspondiente y se
 * trunca a 20 items para no hacer un wall of text.
 */
function WarningsList({
  title,
  warnings,
  defaultSeverity,
}: {
  title: string;
  warnings: ImportWarning[];
  defaultSeverity?: ImportWarning["severity"];
}) {
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");
  const infos = warnings.filter((w) => w.severity === "info");
  return (
    <div className="space-y-2">
      <p className="font-heading text-[0.6rem] uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {errors.length > 0 || defaultSeverity === "error" ? (
        <WarningGroup
          label={`Errores (${errors.length})`}
          color="text-destructive"
          items={errors}
        />
      ) : null}
      {warns.length > 0 ? (
        <WarningGroup
          label={`Avisos (${warns.length})`}
          color="text-amber-300"
          items={warns}
        />
      ) : null}
      {infos.length > 0 ? (
        <WarningGroup
          label={`Información (${infos.length})`}
          color="text-muted-foreground"
          items={infos}
        />
      ) : null}
    </div>
  );
}

function WarningGroup({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: ImportWarning[];
}) {
  if (items.length === 0) return null;
  const MAX = 20;
  const shown = items.slice(0, MAX);
  const rest = items.length - shown.length;
  return (
    <div>
      <p className={cn("font-heading text-[0.55rem] uppercase tracking-widest", color)}>
        {label}
      </p>
      <ul className={cn("space-y-0.5 text-[11px] leading-tight", color)}>
        {shown.map((w, i) => (
          <li key={i}>
            <code className="font-mono text-[10px] opacity-70">{w.field}</code>{" "}
            · {w.message}
          </li>
        ))}
        {rest > 0 ? (
          <li className="italic opacity-70">(+{rest} más)</li>
        ) : null}
      </ul>
    </div>
  );
}
