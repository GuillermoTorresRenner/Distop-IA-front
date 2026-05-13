import { Copy, Loader2, Plus, Skull, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/hooks/use-confirm";
import {
  cloneCharacter,
  deleteCharacter,
  listCharacters,
} from "~/lib/api/characters/characters.api";
import type { Character } from "~/lib/api/characters/characters.types";

export function meta() {
  return [{ title: "Mis personajes · Distop-IA VTT" }];
}

export default function CharactersListRoute() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setItems(await listCharacters());
    } catch (err) {
      setError(extractAuthError(err, "No se pudieron cargar tus personajes"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleClone(id: string, name: string) {
    setError(null);
    setCloningId(id);
    try {
      const cloned = await cloneCharacter(id);
      navigate(`/characters/${cloned.id}`);
    } catch (err) {
      setError(extractAuthError(err, `No se pudo clonar a ${name}`));
    } finally {
      setCloningId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: "Eliminar vástago",
      description: (
        <>
          ¿Seguro que quieres eliminar a{" "}
          <strong className="text-foreground">{name}</strong>? Esta acción es
          irreversible.
        </>
      ),
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteCharacter(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(extractAuthError(err, "No se pudo eliminar el personaje"));
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Vástagos"
        title="Mis personajes"
        description="Fichas de Vampiro: la Mascarada. Crea, edita y asocia a tus crónicas."
        actions={
          <Link to="/characters/new">
            <Button className="bg-blood text-blood-foreground hover:bg-blood/90">
              <Plus className="size-4" /> Nuevo personaje
            </Button>
          </Link>
        }
      />

      {error ? <FormAlert message={error} /> : null}
      {loading ? (
        <p className="font-serif italic text-muted-foreground">Cargando vástagos...</p>
      ) : items.length === 0 ? (
        <article className="rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
          <Skull className="mx-auto mb-3 size-10 text-blood" />
          <p className="font-heading text-lg uppercase tracking-widest text-muted-foreground">
            Aún no has forjado un vástago
          </p>
          <p className="mt-2 font-serif italic text-muted-foreground">
            Crea tu primer personaje para sumarlo a una crónica.
          </p>
          <Link to="/characters/new" className="mt-4 inline-block">
            <Button className="bg-blood text-blood-foreground hover:bg-blood/90">
              <Plus className="size-4" /> Forjar vástago
            </Button>
          </Link>
        </article>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-border/60 bg-card/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/characters/${c.id}`}
                      className="font-heading text-xl uppercase tracking-wide text-foreground hover:text-blood"
                    >
                      {c.name}
                    </Link>
                    {c.kind === "ANTAGONIST" ? (
                      <span className="rounded-full border border-destructive/60 bg-destructive/10 px-2 py-0.5 font-heading text-[0.55rem] uppercase tracking-widest text-destructive">
                        Antagonista
                      </span>
                    ) : c.kind === "NPC" ? (
                      <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-heading text-[0.55rem] uppercase tracking-widest text-amber-300">
                        PNJ
                      </span>
                    ) : null}
                  </div>
                  <p className="font-serif text-sm italic text-muted-foreground">
                    {c.clan?.name ?? "Sin clan"} · {c.concept ?? "Concepto sin definir"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    Generación {c.generation ?? "—"} ·{" "}
                    {c.nature?.name ?? "—"} / {c.demeanor?.name ?? "—"}
                  </p>
                  {c.chronicles.length > 0 && (
                    <p className="mt-1 font-serif text-xs italic text-muted-foreground">
                      Crónicas:{" "}
                      {c.chronicles.map((ch) => ch.chronicle.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleClone(c.id, c.name)}
                    disabled={cloningId === c.id}
                    aria-label={`Clonar ${c.name}`}
                    title="Clonar como base de otro"
                    className="text-foreground/70 hover:bg-blood/10 hover:text-blood"
                  >
                    {cloningId === c.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-destructive hover:bg-destructive/10"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </section>
  );
}
