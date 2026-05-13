import { Skull, UserCog, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ANTAGONIST_TEMPLATES,
  findTemplate,
  groupTemplates,
} from "~/lib/antagonist-templates";
import type { CharacterKind } from "~/lib/api/characters/characters.types";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";

interface Props {
  open: boolean;
  chronicleId: string;
  onClose: () => void;
}

/**
 * Dialog del narrador para crear rápidamente un PNJ o Antagonista en una crónica.
 *
 * El usuario:
 * 1. Elige tipo (NPC / ANTAGONIST).
 * 2. Selecciona un template (opcional) — si lo pone, las stats canon se aplican
 *    al cargar la hoja.
 * 3. Escribe un nombre.
 * 4. Al "Crear y editar" se navega a /characters/new con los query params
 *    correspondientes; la hoja se pre-rellena y al guardar queda asociada
 *    a la crónica con el kind solicitado.
 */
export function CreateNpcDialog({ open, chronicleId, onClose }: Props) {
  const navigate = useNavigate();
  const [kind, setKind] = useState<Exclude<CharacterKind, "PC">>("ANTAGONIST");
  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setKind("ANTAGONIST");
    setTemplateId("");
    setName("");
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

  const template = templateId ? findTemplate(templateId) : null;
  const groups = groupTemplates();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    const qs = new URLSearchParams();
    qs.set("chronicleId", chronicleId);
    qs.set("kind", kind);
    qs.set("name", name.trim());
    if (templateId) qs.set("template", templateId);
    navigate(`/characters/new?${qs.toString()}`);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-npc-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-3xl rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <div>
            <p className="font-heading text-[0.65rem] uppercase tracking-[0.4em] text-blood">
              Mesa del narrador
            </p>
            <h2
              id="create-npc-title"
              className="font-heading text-xl uppercase tracking-wider text-foreground"
            >
              Crear PNJ o Antagonista
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

        <div className="space-y-5 px-5 py-5">
          {/* Selector PNJ / Antagonista */}
          <fieldset className="space-y-2">
            <legend className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Tipo de personaje
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <KindButton
                active={kind === "NPC"}
                onClick={() => setKind("NPC")}
                icon={<UserCog className="size-5" />}
                label="PNJ aliado / neutral"
                hint="Contactos, mentores, manada, sirvientes. No hostiles por defecto."
              />
              <KindButton
                active={kind === "ANTAGONIST"}
                onClick={() => setKind("ANTAGONIST")}
                icon={<Skull className="size-5" />}
                label="Antagonista"
                hint="Cazadores, lupinos, magos, criminales hostiles. Enemigos directos."
              />
            </div>
          </fieldset>

          {/* Selector de template */}
          <label className="block space-y-1">
            <span className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Plantilla rápida (opcional)
            </span>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={SELECT_DARK_CLASS}
            >
              <option value="">Sin plantilla (hoja en blanco)</option>
              {Object.entries(groups).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {/* Preview del template */}
          {template ? (
            <article className="rounded-md border border-blood/40 bg-blood/5 p-4 text-sm">
              <header className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-sm uppercase tracking-wider text-foreground">
                  {template.label}
                </h3>
                <span className="rounded-full border border-border/60 px-2 py-0.5 font-heading text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                  {template.group}
                </span>
              </header>
              <p className="mt-1 font-serif text-xs italic text-foreground/80">
                {template.description}
              </p>
              <p className="mt-2 font-serif text-xs italic text-muted-foreground">
                Concepto sugerido:{" "}
                <span className="text-foreground/85">{template.concept}</span>
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer font-heading text-[0.6rem] uppercase tracking-widest text-blood">
                  Ver notas que se aplican
                </summary>
                <pre className="mt-2 whitespace-pre-wrap rounded border border-border/40 bg-background/40 p-2 font-mono text-[0.7rem] text-foreground/80">
                  {template.notesTemplate}
                </pre>
              </details>
            </article>
          ) : null}

          {/* Nombre */}
          <label className="block space-y-1">
            <span className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Nombre del personaje
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                kind === "ANTAGONIST"
                  ? "Ej. Hermana Ingrid, Cazadora"
                  : "Ej. Toby el Errante"
              }
              required
              autoFocus
            />
          </label>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/40 px-5 py-3">
          <p className="font-serif text-xs italic text-muted-foreground">
            {ANTAGONIST_TEMPLATES.length} plantillas · fuente Capítulo Nueve.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="bg-blood text-blood-foreground hover:bg-blood/90"
            >
              {kind === "ANTAGONIST" ? (
                <Skull className="size-4" />
              ) : (
                <UserCog className="size-4" />
              )}
              Crear y editar
            </Button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function KindButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition ${
        active
          ? "border-blood bg-blood/10"
          : "border-border/60 hover:border-blood/40 hover:bg-blood/5"
      }`}
    >
      <span className="flex items-center gap-2 font-heading text-sm uppercase tracking-wide text-foreground">
        <span className={active ? "text-blood" : "text-muted-foreground"}>
          {icon}
        </span>
        {label}
      </span>
      <span className="font-serif text-xs italic text-muted-foreground">
        {hint}
      </span>
    </button>
  );
}

