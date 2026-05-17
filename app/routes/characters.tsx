import { Copy, Loader2, Plus, Search, Skull, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CharacterFab } from "~/components/character/character-fab";
import { ExportCharacterButton } from "~/components/character/export-character-button";
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
import type {
  Character,
  CharacterKind,
} from "~/lib/api/characters/characters.types";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Mis personajes · Distop-IA VTT" }];
}

type Filter = "ALL" | CharacterKind;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PC", label: "PJ" },
  { value: "NPC", label: "PNJ" },
  { value: "ANTAGONIST", label: "Antagonistas" },
];

export default function CharactersListRoute() {
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

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
    void reload();
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

  // ── Cuentas por kind, calculadas una sola vez ─────────────
  const counts = useMemo(() => {
    const out: Record<Filter, number> = { ALL: items.length, PC: 0, NPC: 0, ANTAGONIST: 0 };
    for (const c of items) out[c.kind] = (out[c.kind] ?? 0) + 1;
    return out;
  }, [items]);

  // ── Items filtrados por tab + query (case/diacritics-insensitive) ──
  const visibleItems = useMemo(() => {
    const normalized = normalize(query);
    return items.filter((c) => {
      if (filter !== "ALL" && c.kind !== filter) return false;
      if (!normalized) return true;
      const haystack = [
        c.name,
        c.concept ?? "",
        c.clan?.name ?? "",
        c.nature?.name ?? "",
        c.demeanor?.name ?? "",
        ...c.chronicles.map((ch) => ch.chronicle?.name ?? ""),
      ]
        .map(normalize)
        .join(" ");
      return haystack.includes(normalized);
    });
  }, [items, filter, query]);

  const hasAnyCharacter = items.length > 0;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Vástagos"
        title="Mis personajes"
        description="Fichas de Vampiro: la Mascarada. Crea, edita y asocia a tus crónicas."
      />

      {error ? <FormAlert message={error} /> : null}

      {loading ? (
        <p className="text-muted-foreground">Cargando vástagos...</p>
      ) : !hasAnyCharacter ? (
        <EmptyAll />
      ) : (
        <>
          {/* Pestañas + buscador */}
          <div className="flex flex-col gap-3">
            <nav
              role="tablist"
              aria-label="Filtrar por tipo de personaje"
              className="flex flex-wrap gap-1 rounded-md border border-border/60 bg-card/40 p-1"
            >
              {FILTERS.map((f) => {
                const active = filter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs font-heading uppercase tracking-wider transition-colors",
                      active
                        ? "bg-blood/30 text-blood-foreground"
                        : "text-muted-foreground hover:bg-blood/10 hover:text-foreground"
                    )}
                  >
                    {f.label}
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] tabular-nums",
                        active
                          ? "bg-blood/40 text-blood-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {counts[f.value]}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, concepto, clan o crónica..."
                className="h-9 w-full rounded-md border border-input bg-input/30 pl-9 pr-9 text-sm placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
                aria-label="Buscar personaje"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-blood/10 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Resultados */}
          {visibleItems.length === 0 ? (
            <EmptyFiltered onReset={() => { setFilter("ALL"); setQuery(""); }} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleItems.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  cloning={cloningId === c.id}
                  onClone={() => handleClone(c.id, c.name)}
                  onDelete={() => handleDelete(c.id, c.name)}
                />
              ))}
            </ul>
          )}
        </>
      )}
      <CharacterFab onCreated={() => void reload()} />
      {dialog}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CharacterCard({
  character: c,
  cloning,
  onClone,
  onDelete,
}: {
  character: Character;
  cloning: boolean;
  onClone: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border border-border/60 bg-card/70 p-4">
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
          <p className="text-sm italic text-muted-foreground">
            {c.clan?.name ?? "Sin clan"} · {c.concept ?? "Concepto sin definir"}
          </p>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            Generación {c.generation ?? "—"} ·{" "}
            {c.nature?.name ?? "—"} / {c.demeanor?.name ?? "—"}
          </p>
          {c.chronicles.length > 0 && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              Crónicas:{" "}
              {c.chronicles.map((ch) => ch.chronicle.name).join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ExportCharacterButton character={c} compact />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClone}
            disabled={cloning}
            aria-label={`Clonar ${c.name}`}
            title="Clonar como base de otro"
            className="text-foreground/70 hover:bg-blood/10 hover:text-blood"
          >
            {cloning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10"
            aria-label="Eliminar"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function EmptyAll() {
  return (
    <article className="rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <Skull className="mx-auto mb-3 size-10 text-blood" />
      <p className="font-heading text-lg uppercase tracking-widest text-muted-foreground">
        Aún no has forjado un vástago
      </p>
      <p className="mt-2 text-muted-foreground">
        Crea tu primer personaje para sumarlo a una crónica.
      </p>
      <Link to="/characters/new" className="mt-4 inline-block">
        <Button className="bg-blood text-blood-foreground hover:bg-blood/90">
          <Plus className="size-4" /> Crear vástago
        </Button>
      </Link>
    </article>
  );
}

function EmptyFiltered({ onReset }: { onReset: () => void }) {
  return (
    <article className="rounded-lg border border-dashed border-border/60 bg-card/40 p-8 text-center">
      <p className="font-heading text-sm uppercase tracking-widest text-muted-foreground">
        Sin resultados
      </p>
      <p className="mt-2 text-sm italic text-muted-foreground">
        Ningún personaje coincide con la búsqueda o el filtro actual.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onReset}
        className="mt-3"
      >
        Limpiar filtros
      </Button>
    </article>
  );
}

/**
 * Normaliza un texto para búsqueda fuzzy:
 *   - lowercase
 *   - quita diacríticos (NFD + filtra combinings)
 *   - colapsa espacios
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
