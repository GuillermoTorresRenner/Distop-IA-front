import {
  BookOpen,
  Loader2,
  PencilLine,
  Plus,
  ScrollText,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useParams } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { MarkdownEditor } from "~/components/common/markdown-editor";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/hooks/use-confirm";
import { listChronicleCharacters } from "~/lib/api/characters/characters.api";
import { getChronicle } from "~/lib/api/chronicles/chronicles.api";
import type { Chronicle } from "~/lib/api/chronicles/chronicles.types";
import {
  createCharacterEntry,
  createChronicleEntry,
  deleteCharacterEntry,
  deleteChronicleEntry,
  listCharacterJournal,
  listChronicleJournal,
  updateCharacterEntry,
  updateChronicleEntry,
  uploadJournalImage,
} from "~/lib/api/journal/journal.api";
import type {
  CharacterJournalEntryInput,
  JournalEntry,
  JournalEntryInput,
} from "~/lib/api/journal/journal.types";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import { cn } from "~/lib/utils";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Bitácora · Crónica · Distop-IA VTT" }];
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

interface EntryFormState extends JournalEntryInput {
  id?: string;
  /** Solo aplica en tab "character". Vacío hasta que el user elige o se auto-asigna. */
  characterId?: string;
}

const emptyForm: EntryFormState = {
  title: "",
  body: "",
  sessionDate: "",
  characterId: "",
};

interface CharacterRef {
  id: string;
  name: string;
  kind: "PC" | "NPC" | "ANTAGONIST";
}

export default function ChronicleJournalRoute() {
  const { confirm, dialog } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const user = useUserStore((s) => s.user);

  const [chronicle, setChronicle] = useState<Chronicle | null>(null);
  const [chronicleEntries, setChronicleEntries] = useState<JournalEntry[]>([]);
  const [characterEntries, setCharacterEntries] = useState<JournalEntry[]>([]);
  /** Personajes propios asociados a esta crónica. Vienen de
   * `/chronicles/:id/characters` filtrados por `user.id` en el cliente. */
  const [myCharacters, setMyCharacters] = useState<CharacterRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"chronicle" | "character">("chronicle");
  /** Filtro por personaje en la tab "character". `null` = mostrar todas. */
  const [characterFilter, setCharacterFilter] = useState<string | null>(null);
  const [form, setForm] = useState<EntryFormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    try {
      const [c, entries, mine, chronCharacters] = await Promise.all([
        getChronicle(id),
        listChronicleJournal(id),
        listCharacterJournal(id),
        listChronicleCharacters(id),
      ]);
      setChronicle(c);
      setChronicleEntries(entries);
      setCharacterEntries(mine);
      const ownId = useUserStore.getState().user?.id;
      setMyCharacters(
        chronCharacters
          .map((cc) => cc.character)
          .filter((ch) => ch.user.id === ownId)
          .map((ch) => ({ id: ch.id, name: ch.name, kind: ch.kind })),
      );
    } catch (err) {
      setError(extractAuthError(err, "No se pudo cargar la bitácora"));
    }
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ⚠️ Hooks SIEMPRE antes de cualquier return condicional para no romper
  // la regla de orden estable de React.
  const visibleEntries = useMemo(() => {
    if (tab === "chronicle") return chronicleEntries;
    if (!characterFilter) return characterEntries;
    if (characterFilter === "__unassigned__") {
      return characterEntries.filter((e) => !e.character);
    }
    return characterEntries.filter(
      (e) => e.character?.id === characterFilter,
    );
  }, [tab, chronicleEntries, characterEntries, characterFilter]);
  // Cuántas notas hay sin PJ asignado (legado). Si es 0, ocultamos esa opción
  // del filtro para no ensuciar el menú.
  const unassignedCount = useMemo(
    () => characterEntries.filter((e) => !e.character).length,
    [characterEntries],
  );

  if (loading) {
    return (
      <p className="text-muted-foreground">Cargando bitácora...</p>
    );
  }
  if (error || !chronicle || !id) {
    return <FormAlert message={error ?? "Bitácora no disponible"} />;
  }

  const isNarrator = chronicle.narratorId === user?.id;
  // Para escribir notas personales se necesita al menos un PJ propio en la
  // crónica. Sin PJs asociados, mostramos un aviso y bloqueamos el form.
  const canWriteCharacter = myCharacters.length > 0;
  const canEditCurrent =
    tab === "chronicle" ? isNarrator : canWriteCharacter;

  function resetForm() {
    setForm(emptyForm);
    setEditing(false);
    setFormError(null);
  }

  function startCreate() {
    // Si el user tiene un solo PJ, lo pre-seleccionamos (UX directa). Con
    // varios, queda vacío para forzar elección explícita.
    const autoCharacter =
      tab === "character" && myCharacters.length === 1
        ? myCharacters[0].id
        : "";
    setForm({ ...emptyForm, characterId: autoCharacter });
    setEditing(true);
    setFormError(null);
  }

  function startEdit(entry: JournalEntry) {
    setForm({
      id: entry.id,
      title: entry.title,
      body: entry.body,
      sessionDate: toDateInputValue(entry.sessionDate),
      characterId: entry.character?.id ?? "",
    });
    setEditing(true);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setFormError(null);

    const basePayload: JournalEntryInput = {
      title: form.title.trim(),
      body: form.body.trim(),
      ...(form.sessionDate
        ? { sessionDate: new Date(form.sessionDate).toISOString() }
        : {}),
    };

    // Validación previa para notas personales: characterId es obligatorio.
    if (tab === "character" && !form.characterId) {
      setFormError("Debes elegir a qué personaje pertenece esta nota.");
      return;
    }

    setSaving(true);
    try {
      if (tab === "chronicle") {
        if (form.id) {
          await updateChronicleEntry(id, form.id, basePayload);
        } else {
          await createChronicleEntry(id, basePayload);
        }
      } else {
        const characterPayload: CharacterJournalEntryInput = {
          ...basePayload,
          characterId: form.characterId!,
        };
        if (form.id) {
          await updateCharacterEntry(id, form.id, characterPayload);
        } else {
          await createCharacterEntry(id, characterPayload);
        }
      }
      await reload();
      resetForm();
    } catch (err) {
      setFormError(extractAuthError(err, "No se pudo guardar la entrada"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: JournalEntry) {
    if (!id) return;
    const ok = await confirm({
      title: "Borrar entrada",
      description: (
        <>
          ¿Borrar la entrada{" "}
          <strong className="text-foreground">«{entry.title}»</strong>? No
          podrás recuperarla.
        </>
      ),
      confirmLabel: "Borrar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      if (tab === "chronicle") {
        await deleteChronicleEntry(id, entry.id);
      } else {
        await deleteCharacterEntry(id, entry.id);
      }
      await reload();
    } catch (err) {
      setError(extractAuthError(err, "No se pudo eliminar la entrada"));
    }
  }

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow={chronicle.name}
        title="Bitácora"
        description="Memorias compartidas de la crónica y notas privadas de tu personaje."
        actions={
          <Link
            to={`/chronicles/${id}`}
            className="font-serif text-xs italic text-muted-foreground underline hover:text-foreground"
          >
            ← Volver a la crónica
          </Link>
        }
      />

      <nav className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        <TabBtn
          active={tab === "chronicle"}
          onClick={() => {
            setTab("chronicle");
            setCharacterFilter(null);
            resetForm();
          }}
        >
          <ScrollText className="size-4" /> Crónica · {chronicleEntries.length}
        </TabBtn>
        <TabBtn
          active={tab === "character"}
          onClick={() => {
            setTab("character");
            setCharacterFilter(null);
            resetForm();
          }}
        >
          <UserCircle className="size-4" /> Mi personaje · {characterEntries.length}
        </TabBtn>
      </nav>

      {tab === "character" && myCharacters.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="character-filter"
            className="font-heading text-xs uppercase tracking-widest text-muted-foreground"
          >
            Filtrar por personaje
          </label>
          <select
            id="character-filter"
            value={characterFilter ?? ""}
            onChange={(e) => setCharacterFilter(e.target.value || null)}
            className={cn(SELECT_DARK_CLASS, "h-8 max-w-xs")}
          >
            <option value="">Todos ({characterEntries.length})</option>
            {myCharacters.map((ch) => {
              const count = characterEntries.filter(
                (e) => e.character?.id === ch.id,
              ).length;
              return (
                <option key={ch.id} value={ch.id}>
                  {ch.name} ({count})
                </option>
              );
            })}
            {unassignedCount > 0 ? (
              <option value="__unassigned__">
                Sin personaje ({unassignedCount})
              </option>
            ) : null}
          </select>
        </div>
      ) : null}

      {canEditCurrent ? (
        editing ? (
          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              <PencilLine className="size-4" />
              {form.id ? "Editar entrada" : "Nueva entrada"}
            </h2>
            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              {formError ? <FormAlert message={formError} /> : null}
              <FormField
                label="Título"
                name="title"
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Sesión 3 — El despertar"
              />
              <FormField
                label="Fecha de sesión (opcional)"
                name="sessionDate"
                type="date"
                value={form.sessionDate ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sessionDate: e.target.value }))
                }
              />
              {tab === "character" ? (
                <div>
                  <label
                    htmlFor="characterId"
                    className="mb-1 block font-heading text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Personaje{" "}
                    <span className="text-blood">*</span>
                  </label>
                  <select
                    id="characterId"
                    required
                    value={form.characterId ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, characterId: e.target.value }))
                    }
                    className={cn(SELECT_DARK_CLASS, "h-9")}
                  >
                    <option value="" disabled>
                      — Elige un personaje —
                    </option>
                    {myCharacters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="body"
                  className="mb-1 block font-heading text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Cuerpo
                </label>
                <div className="h-128 overflow-hidden rounded-md border border-border bg-background/40">
                  <MarkdownEditor
                    value={form.body}
                    onChange={(value) =>
                      setForm((f) => ({ ...f, body: value }))
                    }
                    disabled={saving}
                    placeholder="Escribe los hechos de la noche..."
                    onUploadImage={async (file) => {
                      const { url } = await uploadJournalImage(id, file);
                      return url;
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blood text-blood-foreground hover:bg-blood/90"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
                  Guardar
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  <X className="size-4" /> Cancelar
                </Button>
              </div>
            </form>
          </article>
        ) : (
          <Button onClick={startCreate} className="bg-blood text-blood-foreground hover:bg-blood/90">
            <Plus className="size-4" /> Nueva entrada
          </Button>
        )
      ) : tab === "chronicle" ? (
        <p className="font-serif text-sm italic text-muted-foreground">
          Solo el narrador puede escribir en la bitácora de la crónica.
        </p>
      ) : (
        <p className="font-serif text-sm italic text-muted-foreground">
          Para escribir notas personales necesitas tener al menos un personaje
          asociado a esta crónica.
        </p>
      )}

      {visibleEntries.length === 0 ? (
        <p className="text-muted-foreground">
          {tab === "chronicle"
            ? "El narrador aún no ha escrito en la bitácora."
            : characterFilter
              ? "No hay notas para el filtro seleccionado."
              : "Aún no tienes memorias de tu personaje en esta crónica."}
        </p>
      ) : (
        <ul className="space-y-4">
          {visibleEntries.map((entry) => {
            const mine = entry.author.id === user?.id;
            const canManage = tab === "chronicle" ? isNarrator : mine;
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-border/60 bg-card/70 p-5"
              >
                <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-col">
                    <h3 className="font-heading text-lg text-foreground">{entry.title}</h3>
                    {tab === "character" ? (
                      <span className="font-serif text-xs italic text-blood/80">
                        {entry.character
                          ? entry.character.name
                          : "Sin personaje asignado"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {formatDate(entry.sessionDate ?? entry.createdAt)} · {entry.author.nickname}
                  </p>
                </header>
                <div className="markdown-content text-sm text-foreground/90">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    urlTransform={(url) => url}
                  >
                    {entry.body}
                  </ReactMarkdown>
                </div>
                {canManage ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(entry)}>
                      <PencilLine className="size-4" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" /> Borrar
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {dialog}
    </section>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-b-2 border-blood bg-card/70 text-foreground"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
