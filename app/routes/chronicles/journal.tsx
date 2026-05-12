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
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
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
} from "~/lib/api/journal/journal.api";
import type { JournalEntry, JournalEntryInput } from "~/lib/api/journal/journal.types";
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
}

const emptyForm: EntryFormState = { title: "", body: "", sessionDate: "" };

export default function ChronicleJournalRoute() {
  const { id } = useParams<{ id: string }>();
  const user = useUserStore((s) => s.user);

  const [chronicle, setChronicle] = useState<Chronicle | null>(null);
  const [chronicleEntries, setChronicleEntries] = useState<JournalEntry[]>([]);
  const [characterEntries, setCharacterEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"chronicle" | "character">("chronicle");
  const [form, setForm] = useState<EntryFormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    try {
      const [c, entries, mine] = await Promise.all([
        getChronicle(id),
        listChronicleJournal(id),
        listCharacterJournal(id),
      ]);
      setChronicle(c);
      setChronicleEntries(entries);
      setCharacterEntries(mine);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo cargar la bitácora"));
    }
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <p className="font-serif italic text-muted-foreground">Cargando bitácora...</p>
    );
  }
  if (error || !chronicle || !id) {
    return <FormAlert message={error ?? "Bitácora no disponible"} />;
  }

  const isNarrator = chronicle.narratorId === user?.id;
  const canEditCurrent = tab === "chronicle" ? isNarrator : true;
  const entries = tab === "chronicle" ? chronicleEntries : characterEntries;

  function resetForm() {
    setForm(emptyForm);
    setEditing(false);
    setFormError(null);
  }

  function startCreate() {
    setForm(emptyForm);
    setEditing(true);
    setFormError(null);
  }

  function startEdit(entry: JournalEntry) {
    setForm({
      id: entry.id,
      title: entry.title,
      body: entry.body,
      sessionDate: toDateInputValue(entry.sessionDate),
    });
    setEditing(true);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setFormError(null);
    setSaving(true);
    const payload: JournalEntryInput = {
      title: form.title.trim(),
      body: form.body.trim(),
      ...(form.sessionDate ? { sessionDate: new Date(form.sessionDate).toISOString() } : {}),
    };
    try {
      if (tab === "chronicle") {
        if (form.id) {
          await updateChronicleEntry(id, form.id, payload);
        } else {
          await createChronicleEntry(id, payload);
        }
      } else {
        if (form.id) {
          await updateCharacterEntry(id, form.id, payload);
        } else {
          await createCharacterEntry(id, payload);
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
    if (!confirm("¿Borrar esta entrada de la bitácora?")) return;
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
            resetForm();
          }}
        >
          <ScrollText className="size-4" /> Crónica · {chronicleEntries.length}
        </TabBtn>
        <TabBtn
          active={tab === "character"}
          onClick={() => {
            setTab("character");
            resetForm();
          }}
        >
          <UserCircle className="size-4" /> Mi personaje · {characterEntries.length}
        </TabBtn>
      </nav>

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
              <div>
                <label
                  htmlFor="body"
                  className="mb-1 block font-heading text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Cuerpo
                </label>
                <Textarea
                  id="body"
                  name="body"
                  required
                  rows={10}
                  value={form.body}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, body: e.target.value }))
                  }
                  placeholder="Escribe los hechos de la noche..."
                />
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
      ) : (
        <p className="font-serif text-sm italic text-muted-foreground">
          Solo el narrador puede escribir en la bitácora de la crónica.
        </p>
      )}

      {entries.length === 0 ? (
        <p className="font-serif italic text-muted-foreground">
          {tab === "chronicle"
            ? "El narrador aún no ha escrito en la bitácora."
            : "Aún no tienes memorias de tu personaje en esta crónica."}
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => {
            const mine = entry.author.id === user?.id;
            const canManage = tab === "chronicle" ? isNarrator : mine;
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-border/60 bg-card/70 p-5"
              >
                <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-heading text-lg text-foreground">{entry.title}</h3>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {formatDate(entry.sessionDate ?? entry.createdAt)} · {entry.author.nickname}
                  </p>
                </header>
                <p className="whitespace-pre-wrap font-serif text-sm text-foreground/90">
                  {entry.body}
                </p>
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
