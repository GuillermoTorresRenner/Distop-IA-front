import {
  BookOpen,
  Globe2,
  Loader2,
  Lock,
  NotebookPen,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "~/components/common/markdown-editor";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import {
  createCharacterEntry,
  createChronicleEntry,
  deleteCharacterEntry,
  deleteChronicleEntry,
  listCharacterJournal,
  listChronicleJournal,
  shareCharacterEntry,
  updateCharacterEntry,
  updateChronicleEntry,
  uploadJournalImage,
} from "~/lib/api/journal/journal.api";
import type {
  JournalEntry,
  JournalEntryInput,
} from "~/lib/api/journal/journal.types";
import { useConfirm } from "~/hooks/use-confirm";
import { cn } from "~/lib/utils";

/**
 * Alcance de la nota:
 * - "character": entrada privada del autor (CharacterJournalEntry). Solo la ve quien la escribió.
 * - "chronicle": entrada de campaña (ChronicleJournalEntry). La ve toda la mesa.
 *   Solo el narrador puede crear / editar / borrar entradas de este tipo.
 */
type NoteScope = "character" | "chronicle";

interface NotesModalProps {
  chronicleId: string;
  isNarrator: boolean;
  /**
   * PJ activo del jugador en la mesa (el que está abierto en su panel de
   * hoja). Las notas privadas se vinculan automáticamente a este personaje.
   * Si es null, la creación de notas privadas queda bloqueada con un aviso.
   */
  currentCharacterId: string | null;
  onClose: () => void;
}

const MAX_TITLE = 120;
const MAX_BODY = 8000;

export function NotesModal({
  chronicleId,
  isNarrator,
  currentCharacterId,
  onClose,
}: NotesModalProps) {
  // El narrador entra a "Bitácora" por defecto; el jugador entra a "Privadas".
  const [scope, setScope] = useState<NoteScope>(
    isNarrator ? "chronicle" : "character"
  );

  // Lock body scroll + Esc.
  useEffect(() => {
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
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4">
      <div className="relative flex h-[95dvh] w-full max-w-4xl flex-col rounded-lg border border-border bg-card sm:h-[80dvh]">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-4 text-blood" />
            <h3 className="font-heading text-base uppercase tracking-wider">
              Notas
            </h3>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border bg-input/30 p-0.5">
            <ScopeButton
              active={scope === "chronicle"}
              onClick={() => setScope("chronicle")}
              icon={<BookOpen className="size-3.5" />}
              label="Bitácora"
              tooltip={
                isNarrator
                  ? "Notas de campaña. Aquí también aparecen las notas que los jugadores decidan compartir."
                  : "Bitácora de la crónica. Incluye notas del narrador y las notas que hayas compartido."
              }
            />
            <ScopeButton
              active={scope === "character"}
              onClick={() => setScope("character")}
              icon={<Lock className="size-3.5" />}
              label="Privadas"
              tooltip="Tus notas privadas. Puedes marcarlas como compartidas para que aparezcan en la bitácora."
            />
          </div>

          <Button type="button" size="icon" variant="ghost" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </header>

        <NotesScopeView
          chronicleId={chronicleId}
          scope={scope}
          canEdit={scope === "character" || isNarrator}
          isNarrator={isNarrator}
          currentCharacterId={currentCharacterId}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ScopeButton({
  active,
  onClick,
  icon,
  label,
  tooltip,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip title={label} content={tooltip} side="bottom">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-heading uppercase tracking-wider transition-colors",
          active
            ? "bg-blood/30 text-blood-foreground"
            : "text-muted-foreground hover:bg-blood/10"
        )}
      >
        {icon}
        {label}
      </button>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista por scope (chronicle / character)
// ─────────────────────────────────────────────────────────────────────────────

function NotesScopeView({
  chronicleId,
  scope,
  canEdit,
  isNarrator,
  currentCharacterId,
}: {
  chronicleId: string;
  scope: NoteScope;
  canEdit: boolean;
  isNarrator: boolean;
  /** PJ activo del jugador en la mesa. Solo aplica al scope "character". */
  currentCharacterId: string | null;
}) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        scope === "chronicle"
          ? await listChronicleJournal(chronicleId)
          : await listCharacterJournal(chronicleId);
      setEntries(data);
      // Selecciona la primera si hay alguna y no había selección válida.
      setSelectedId((cur) => {
        if (cur && data.some((e) => e.id === cur)) return cur;
        return data[0]?.id ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar las notas"
      );
    } finally {
      setLoading(false);
    }
  }, [chronicleId, scope]);

  // Recarga cuando cambia el scope.
  useEffect(() => {
    setDrafting(false);
    void fetchList();
  }, [fetchList]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  function handleStartDraft() {
    setSelectedId(null);
    setDrafting(true);
  }

  async function handleCreate(input: JournalEntryInput): Promise<JournalEntry> {
    let created: JournalEntry;
    if (scope === "chronicle") {
      created = await createChronicleEntry(chronicleId, input);
    } else {
      // En notas privadas necesitamos un PJ del autor asociado a la crónica.
      // En la Mesa Virtual asumimos el PJ activo del jugador (el seleccionado
      // en el panel de hoja).
      if (!currentCharacterId) {
        throw new Error(
          "No tienes un personaje activo en la mesa para asociar la nota.",
        );
      }
      created = await createCharacterEntry(chronicleId, {
        ...input,
        characterId: currentCharacterId,
      });
    }
    setEntries((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setDrafting(false);
    return created;
  }

  async function handleUpdate(
    id: string,
    input: Partial<JournalEntryInput>
  ): Promise<JournalEntry> {
    const updated =
      scope === "chronicle"
        ? await updateChronicleEntry(chronicleId, id, input)
        : await updateCharacterEntry(chronicleId, id, input);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }

  async function handleShare(id: string, isShared: boolean): Promise<JournalEntry> {
    const updated = await shareCharacterEntry(chronicleId, id, isShared);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }

  async function handleDelete(id: string) {
    if (scope === "chronicle") {
      await deleteChronicleEntry(chronicleId, id);
    } else {
      await deleteCharacterEntry(chronicleId, id);
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  return (
    <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[16rem_1fr]">
      {/* Lista */}
      <aside className="flex flex-col border-b border-border md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entrada" : "entradas"}
          </span>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={handleStartDraft}
            >
              <Plus className="size-3" />
              Nueva
            </Button>
          ) : null}
        </div>
        <ul className="flex-1 overflow-y-auto p-1">
          {loading ? (
            <li className="px-2 py-3 text-xs italic text-muted-foreground">
              Cargando...
            </li>
          ) : error ? (
            <li className="px-2 py-3 text-xs italic text-blood">{error}</li>
          ) : entries.length === 0 ? (
            <li className="px-2 py-3 text-xs italic text-muted-foreground">
              Aún no hay notas.
            </li>
          ) : (
            entries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(e.id);
                    setDrafting(false);
                  }}
                  className={cn(
                    "w-full rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                    selectedId === e.id && !drafting
                      ? "bg-blood/20 ring-1 ring-blood/40"
                      : "hover:bg-blood/10"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="flex-1 truncate text-sm font-heading uppercase tracking-wider">
                      {e.title || "Sin título"}
                    </p>
                    {/* Badge de compartida en scope "character" */}
                    {scope === "character" && e.isShared ? (
                      <Tooltip title="Compartida" content="Esta nota es visible en la bitácora de la crónica." side="right">
                        <Globe2 className="size-3 shrink-0 text-emerald-400" />
                      </Tooltip>
                    ) : null}
                    {/* Badge de autoría en scope "chronicle" cuando es de jugador */}
                    {scope === "chronicle" && e.entryKind === "CHARACTER" ? (
                      <Tooltip title="Nota de jugador" content={`Compartida por ${e.author.nickname ?? e.author.email}`} side="right">
                        <User className="size-3 shrink-0 text-sky-400" />
                      </Tooltip>
                    ) : null}
                  </div>
                  <p className="truncate text-[10px] italic text-muted-foreground">
                    {scope === "chronicle" && e.entryKind === "CHARACTER"
                      ? `${e.author.nickname ?? e.author.email} · `
                      : ""}
                    {new Date(e.updatedAt).toLocaleString()}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      {/* Editor */}
      <div className="flex flex-col overflow-hidden">
        {drafting ? (
          <NoteEditor
            key="draft"
            mode="create"
            chronicleId={chronicleId}
            canEdit={canEdit}
            onSubmit={handleCreate}
            onCancel={() => setDrafting(false)}
          />
        ) : selected ? (
          <NoteEditor
            key={selected.id}
            mode="edit"
            chronicleId={chronicleId}
            entry={selected}
            canEdit={canEdit && !(scope === "chronicle" && selected.entryKind === "CHARACTER")}
            onSubmit={(input) => handleUpdate(selected.id, input)}
            onDelete={
              // No se permite borrar entradas de jugadores desde la vista de
              // crónica (el autor sí puede hacerlo desde su vista "Privadas").
              scope === "chronicle" && selected.entryKind === "CHARACTER"
                ? undefined
                : () => handleDelete(selected.id)
            }
            onShare={
              scope === "character"
                ? (isShared) => handleShare(selected.id, isShared)
                : undefined
            }
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <NotebookPen className="mx-auto mb-2 size-10 text-blood/60" />
              <p className="text-sm italic text-muted-foreground">
                {canEdit
                  ? "Selecciona una entrada o crea una nueva."
                  : "Aún no hay entradas para mostrar."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor de una nota
// ─────────────────────────────────────────────────────────────────────────────

function NoteEditor({
  mode,
  chronicleId,
  entry,
  canEdit,
  onSubmit,
  onCancel,
  onDelete,
  onShare,
}: {
  mode: "create" | "edit";
  chronicleId: string;
  entry?: JournalEntry;
  canEdit: boolean;
  onSubmit: (input: JournalEntryInput) => Promise<JournalEntry>;
  onCancel?: () => void;
  onDelete?: () => Promise<void>;
  /** Solo para notas de personaje: activa/desactiva la visibilidad pública. */
  onShare?: (isShared: boolean) => Promise<JournalEntry>;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [sessionDate, setSessionDate] = useState(
    entry?.sessionDate ? entry.sessionDate.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState(false);
  const { confirm, dialog } = useConfirm();

  const dirty =
    (title ?? "") !== (entry?.title ?? "") ||
    (body ?? "") !== (entry?.body ?? "") ||
    (sessionDate ?? "") !==
      (entry?.sessionDate ? entry.sessionDate.slice(0, 10) : "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !canEdit) return;
    const cleanTitle = title.trim().slice(0, MAX_TITLE);
    if (!cleanTitle) {
      setError("Pon un título para la nota.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: JournalEntryInput = {
        title: cleanTitle,
        body: body.slice(0, MAX_BODY),
        sessionDate: sessionDate || undefined,
      };
      await onSubmit(payload);
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    const ok = await confirm({
      title: "¿Eliminar esta nota?",
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
      setDeleting(false);
    }
  }

  async function handleShare() {
    if (!onShare || sharing) return;
    const newValue = !(entry?.isShared ?? false);
    setSharing(true);
    setError(null);
    try {
      await onShare(newValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la visibilidad");
    } finally {
      setSharing(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="border-b border-border p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          placeholder="Título"
          disabled={!canEdit}
          className="w-full bg-transparent font-heading text-lg uppercase tracking-wider placeholder:italic placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <span>Fecha de sesión</span>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              disabled={!canEdit}
              className="h-7 rounded border border-input bg-input/30 px-1.5 text-xs"
            />
          </label>
          {entry ? (
            <span className="italic">
              Última edición:{" "}
              {new Date(entry.updatedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
      </div>

      {/* Banner informativo cuando es nota compartida de un jugador */}
      {!canEdit && entry?.entryKind === "CHARACTER" ? (
        <div className="flex items-center gap-2 border-b border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          <User className="size-3.5 shrink-0" />
          <span>
            Nota compartida por{" "}
            <strong>{entry.author.nickname ?? entry.author.email}</strong>
            {entry.character ? ` (${entry.character.name})` : ""}
            {" · "}solo el autor puede editarla.
          </span>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MarkdownEditor
          value={body}
          onChange={setBody}
          maxLength={MAX_BODY}
          disabled={!canEdit}
          placeholder="Escribe lo que pasó esta sesión, una pista, un descubrimiento... (soporta markdown)"
          onUploadImage={
            canEdit
              ? async (file) => {
                  const { url } = await uploadJournalImage(chronicleId, file);
                  return url;
                }
              : undefined
          }
        />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/30 px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{body.length.toLocaleString()} / {MAX_BODY.toLocaleString()}</span>
          {error ? <span className="text-blood">· {error}</span> : null}
          {savedHint ? (
            <span className="text-emerald-400">· Guardado</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle de visibilidad: solo notas de personaje existentes */}
          {mode === "edit" && onShare ? (
            <Tooltip
              title={entry?.isShared ? "Dejar de compartir" : "Compartir con la bitácora"}
              content={
                entry?.isShared
                  ? "Al desactivar, esta nota dejará de aparecer en la bitácora compartida de la crónica. Solo tú podrás verla."
                  : "Al activar, esta nota será visible para todos los miembros en la bitácora de la crónica."
              }
              side="top"
            >
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-heading uppercase tracking-wider transition-colors",
                  entry?.isShared
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    : "border-border bg-input/30 text-muted-foreground hover:border-sky-500/60 hover:bg-sky-500/10 hover:text-sky-300"
                )}
              >
                {sharing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : entry?.isShared ? (
                  <Globe2 className="size-3" />
                ) : (
                  <Lock className="size-3" />
                )}
                {entry?.isShared ? "Compartida" : "Compartir"}
              </button>
            </Tooltip>
          ) : null}

          {mode === "edit" && onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={!canEdit || deleting}
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-blood"
            >
              {deleting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Trash2 className="size-3" />
              )}
              Eliminar
            </Button>
          ) : null}
          {mode === "create" && onCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              type="submit"
              size="sm"
              disabled={saving || (!dirty && mode === "edit")}
              className="h-8 bg-blood text-blood-foreground hover:bg-blood/90"
            >
              {saving ? <Loader2 className="size-3 animate-spin" /> : null}
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          ) : null}
        </div>
      </footer>
      {dialog}
    </form>
  );
}
