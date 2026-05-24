import {
  Dices,
  GripVertical,
  Play,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import {
  addCombatParticipant,
  advanceCombat,
  clearCombat,
  cloneAntagonist,
  removeCombatParticipant,
  reorderCombat,
  resetCombat,
  rollMookInitiative,
  updateCombatParticipant,
  updateMookHealth,
} from "~/lib/api/combat/combat.api";
import type {
  CombatParticipant,
  CombatState,
  MookHealth,
} from "~/lib/api/combat/combat.types";
import type { Character } from "~/lib/api/characters/characters.types";
import { useConfirm } from "~/hooks/use-confirm";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import { cn } from "~/lib/utils";
import { MookHealthTracker } from "./mook-health-tracker";

/**
 * Panel del tab "Turnos". Vista distinta para narrador y jugador:
 *
 *  - Narrador: lista completa con iniciativa editable, drag & drop para
 *    reordenar, botones de avanzar/reiniciar, formulario para agregar
 *    participantes (Characters de la mesa o entradas libres).
 *  - Jugador: solo PCs ordenados, sin iniciativas, sin controles. Indica
 *    el PC activo o "turno del narrador" cuando es un personaje oculto.
 */
interface Props {
  chronicleId: string;
  state: CombatState | null;
  isNarrator: boolean;
  myUserId: string | null;
  /** Lista de Characters asociados a la mesa, para que el master los agregue. */
  associableCharacters: Character[];
  /** Opcional: ya están en el tracker, para filtrar el selector. */
  onStateChange?: (next: CombatState) => void;
}

export function CombatPanel({
  chronicleId,
  state,
  isNarrator,
  myUserId,
  associableCharacters,
  onStateChange,
}: Props) {
  if (!state) {
    return (
      <div className="p-3 text-sm italic text-muted-foreground">
        Cargando turnos…
      </div>
    );
  }

  if (!isNarrator) {
    return (
      <PlayerCombatView state={state} myUserId={myUserId} />
    );
  }

  return (
    <NarratorCombatView
      chronicleId={chronicleId}
      state={state}
      associableCharacters={associableCharacters}
      onStateChange={onStateChange}
    />
  );
}

// ──────────────────────────────────────────────────────────
// Vista jugador (read-only, solo PCs)
// ──────────────────────────────────────────────────────────

function PlayerCombatView({
  state,
  myUserId,
}: {
  state: CombatState;
  myUserId: string | null;
}) {
  const { participants, cursor, round } = state;
  const narratorTurn = cursor === -1;
  const isEmpty = participants.length === 0;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-background/30 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-sm uppercase tracking-wider text-blood">
            Orden de turnos
          </h3>
          {!isEmpty ? (
            <span className="font-heading text-xs uppercase tracking-wider text-muted-foreground">
              Asalto {round}
            </span>
          ) : null}
        </div>
        {narratorTurn ? (
          <p className="mt-1 text-xs italic text-amber-400/90">
            Turno del narrador.
          </p>
        ) : null}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto themed-scrollbar p-1.5">
        {isEmpty ? (
          <p className="px-2 py-4 text-center text-sm italic text-muted-foreground">
            El narrador aún no inició el combate.
          </p>
        ) : (
          <ul className="space-y-1">
            {participants.map((p, i) => (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2",
                  i === cursor
                    ? "border-blood bg-blood/20"
                    : "border-border/40 bg-card/40"
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    i === cursor ? "bg-blood" : "bg-muted-foreground/40"
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    i === cursor
                      ? "font-medium text-blood"
                      : "text-foreground"
                  )}
                >
                  {p.name}
                </span>
                {p.ownerId && p.ownerId === myUserId ? (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                    Tú
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Vista narrador (control completo)
// ──────────────────────────────────────────────────────────

function NarratorCombatView({
  chronicleId,
  state,
  associableCharacters,
  onStateChange,
}: {
  chronicleId: string;
  state: CombatState;
  associableCharacters: Character[];
  onStateChange?: (next: CombatState) => void;
}) {
  const { participants, cursor, round, totalParticipants } = state;
  const { confirm, dialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showClone, setShowClone] = useState(false);

  // IDs ya en el tracker, para filtrar el selector de Character.
  const inTracker = useMemo(() => {
    const set = new Set<string>();
    for (const p of participants) {
      if (p.characterId) set.add(p.characterId);
    }
    return set;
  }, [participants]);

  const associableAvailable = useMemo(
    () => associableCharacters.filter((c) => !inTracker.has(c.id)),
    [associableCharacters, inTracker]
  );

  // Para clonar: cualquier NPC/Antagonista asociado a la mesa, esté o no
  // ya en el tracker (puedo querer 4 maleantes Y al jefe).
  const cloneable = useMemo(
    () =>
      associableCharacters.filter(
        (c) => c.kind === "NPC" || c.kind === "ANTAGONIST"
      ),
    [associableCharacters]
  );

  async function withBusy<T>(fn: () => Promise<T>): Promise<T | null> {
    if (busy) return null;
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo completar";
      setError(msg);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance() {
    const next = await withBusy(() => advanceCombat(chronicleId));
    if (next) onStateChange?.(next);
  }

  async function handleReset() {
    const ok = await confirm({
      title: "¿Reiniciar el combate?",
      description:
        "El cursor vuelve al primero y el contador de asaltos se pone en 1. Los participantes se conservan.",
      confirmLabel: "Reiniciar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    const next = await withBusy(() => resetCombat(chronicleId));
    if (next) onStateChange?.(next);
  }

  async function handleClear() {
    const ok = await confirm({
      title: "¿Limpiar el tracker?",
      description:
        "Se eliminarán todos los participantes y se reiniciará el contador de asaltos. Esta acción no se puede deshacer.",
      confirmLabel: "Limpiar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    const next = await withBusy(() => clearCombat(chronicleId));
    if (next) onStateChange?.(next);
  }

  async function handleRemove(id: string) {
    const ok = await confirm({
      title: "¿Quitar del orden?",
      description: "El participante saldrá del tracker.",
      confirmLabel: "Quitar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    const next = await withBusy(() => removeCombatParticipant(chronicleId, id));
    if (next) onStateChange?.(next);
  }

  async function handleAdd(input: {
    characterId?: string | null;
    displayName?: string | null;
    initiative?: number | null;
  }) {
    const next = await withBusy(() => addCombatParticipant(chronicleId, input));
    if (next) {
      onStateChange?.(next);
      setShowAdd(false);
    }
  }

  async function handleReorder(orderedIds: string[]) {
    // Optimistic: si onStateChange lo expone, podemos hacer optimistic update.
    const next = await withBusy(() => reorderCombat(chronicleId, orderedIds));
    if (next) onStateChange?.(next);
  }

  async function handleInitiativeChange(id: string, value: number | null) {
    const next = await withBusy(() =>
      updateCombatParticipant(chronicleId, id, { initiative: value })
    );
    if (next) onStateChange?.(next);
  }

  async function handleClone(input: {
    sourceCharacterId: string;
    count: number;
    baseName?: string;
  }) {
    const next = await withBusy(() => cloneAntagonist(chronicleId, input));
    if (next) {
      onStateChange?.(next);
      setShowClone(false);
    }
  }

  async function handleMookHealthChange(id: string, health: MookHealth) {
    const next = await withBusy(() =>
      updateMookHealth(chronicleId, id, health)
    );
    if (next) onStateChange?.(next);
  }

  async function handleMookRollInitiative(id: string) {
    const res = await withBusy(() => rollMookInitiative(chronicleId, id));
    if (res) onStateChange?.(res.state);
  }

  const isEmpty = participants.length === 0;
  const totalShown = totalParticipants ?? participants.length;

  return (
    <div className="flex h-full flex-col">
      {dialog}
      <header className="space-y-1.5 border-b border-border bg-background/30 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-blood">
              Orden de turnos
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Asalto {round} · {totalShown}{" "}
              {totalShown === 1 ? "participante" : "participantes"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip content="Avanza al siguiente turno (cicla y suma asalto al pasar el último).">
              <Button
                type="button"
                size="sm"
                onClick={handleAdvance}
                disabled={busy || isEmpty}
                className="bg-blood text-blood-foreground hover:bg-blood/90"
              >
                <Play className="size-4" />
                Avanzar
              </Button>
            </Tooltip>
            <Tooltip content="Reinicia cursor y asaltos sin quitar participantes.">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleReset}
                disabled={busy || isEmpty}
                aria-label="Reiniciar combate"
              >
                <RefreshCcw className="size-4" />
              </Button>
            </Tooltip>
            <Tooltip content="Borra todos los participantes del tracker.">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleClear}
                disabled={busy || isEmpty}
                aria-label="Limpiar tracker"
              >
                <Trash2 className="size-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
        {error ? (
          <p className="text-xs italic text-blood">{error}</p>
        ) : null}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto themed-scrollbar p-1.5">
        {isEmpty ? (
          <p className="px-2 py-4 text-center text-sm italic text-muted-foreground">
            Aún no hay participantes. Agrega jugadores, PNJs o antagonistas
            para iniciar el combate.
          </p>
        ) : (
          <NarratorList
            participants={participants}
            cursor={cursor}
            disabled={busy}
            onRemove={handleRemove}
            onReorder={handleReorder}
            onInitiative={handleInitiativeChange}
            onMookHealthChange={handleMookHealthChange}
            onMookRollInitiative={handleMookRollInitiative}
          />
        )}
      </div>

      <footer className="border-t border-border bg-background/30 p-1.5">
        {showAdd ? (
          <AddParticipantForm
            associable={associableAvailable}
            onCancel={() => setShowAdd(false)}
            onAdd={handleAdd}
            busy={busy}
          />
        ) : showClone ? (
          <CloneAntagonistForm
            cloneable={cloneable}
            onCancel={() => setShowClone(false)}
            onClone={handleClone}
            busy={busy}
          />
        ) : (
          <div className="space-y-1.5">
            <Button
              type="button"
              onClick={() => setShowAdd(true)}
              disabled={busy}
              variant="outline"
              className="w-full border-blood/40 text-blood hover:bg-blood/10"
            >
              <Plus className="size-4" />
              Agregar al orden
            </Button>
            <Button
              type="button"
              onClick={() => setShowClone(true)}
              disabled={busy || cloneable.length === 0}
              variant="outline"
              className="w-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              <Users className="size-4" />
              Clonar antagonista
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Lista del narrador con drag & drop nativo HTML5
// ──────────────────────────────────────────────────────────

function NarratorList({
  participants,
  cursor,
  disabled,
  onRemove,
  onReorder,
  onInitiative,
  onMookHealthChange,
  onMookRollInitiative,
}: {
  participants: CombatParticipant[];
  cursor: number;
  disabled: boolean;
  onRemove: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onInitiative: (id: string, value: number | null) => void;
  onMookHealthChange: (id: string, health: MookHealth) => void;
  onMookRollInitiative: (id: string) => void;
}) {
  // Optimistic local order para que el drag se sienta inmediato.
  const [localOrder, setLocalOrder] = useState<string[]>(
    () => participants.map((p) => p.id)
  );
  const dragIdRef = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Sincroniza con cambios externos (WS o REST).
  useEffect(() => {
    setLocalOrder(participants.map((p) => p.id));
  }, [participants.map((p) => p.id).join("|")]);

  const byId = useMemo(() => {
    const m = new Map<string, CombatParticipant>();
    for (const p of participants) m.set(p.id, p);
    return m;
  }, [participants]);

  function handleDragStart(id: string) {
    if (disabled) return;
    dragIdRef.current = id;
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    if (disabled) return;
    e.preventDefault();
    setDragOver(overId);
  }

  function handleDrop(e: React.DragEvent, dropId: string) {
    if (disabled) return;
    e.preventDefault();
    const dragId = dragIdRef.current;
    dragIdRef.current = null;
    setDragOver(null);
    if (!dragId || dragId === dropId) return;
    const next = [...localOrder];
    const from = next.indexOf(dragId);
    const to = next.indexOf(dropId);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    setLocalOrder(next);
    onReorder(next);
  }

  function handleDragEnd() {
    dragIdRef.current = null;
    setDragOver(null);
  }

  const activeId =
    cursor >= 0 && cursor < participants.length
      ? participants[cursor].id
      : null;

  return (
    <ul className="space-y-1">
      {localOrder.map((id) => {
        const p = byId.get(id);
        if (!p) return null;
        const isActive = id === activeId;
        const isDragOver = dragOver === id;
        const isMook = p.kind === "MOOK" && !!p.health;
        return (
          <li
            key={id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(id)}
            onDragOver={(e) => handleDragOver(e, id)}
            onDrop={(e) => handleDrop(e, id)}
            onDragEnd={handleDragEnd}
            onDragLeave={() => setDragOver(null)}
            className={cn(
              "rounded-md border px-2 py-2 transition-colors",
              isActive
                ? "border-blood bg-blood/20"
                : "border-border/40 bg-card/40 hover:border-border",
              isDragOver && "ring-1 ring-blood",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-grab"
            )}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 shrink-0 text-muted-foreground" />
              <ParticipantBadge kind={p.kind} />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  isActive ? "font-medium text-blood" : "text-foreground"
                )}
              >
                {p.name}
                {isMook && p.sourceCharacterName ? (
                  <span className="ml-1 text-[10px] italic text-muted-foreground">
                    (copia de {p.sourceCharacterName})
                  </span>
                ) : null}
              </span>
              {isMook ? (
                <Tooltip content="Tirar iniciativa (1d10 + Destreza + Astucia)">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onMookRollInitiative(p.id)}
                    disabled={disabled}
                    aria-label={`Tirar iniciativa para ${p.name}`}
                    className="size-7 text-amber-300 hover:text-amber-200"
                  >
                    <Dices className="size-3.5" />
                  </Button>
                </Tooltip>
              ) : null}
              <InitiativeInput
                value={p.initiative ?? null}
                disabled={disabled}
                onCommit={(v) => onInitiative(p.id, v)}
              />
              <Tooltip content="Quitar del orden" side="left">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => onRemove(p.id)}
                  disabled={disabled}
                  aria-label={`Quitar a ${p.name}`}
                  className="size-7"
                >
                  <X className="size-3.5" />
                </Button>
              </Tooltip>
            </div>
            {isMook && p.health ? (
              <div className="mt-1.5 flex items-center gap-2 pl-6">
                <span className="font-heading text-[9px] uppercase tracking-wider text-muted-foreground">
                  Salud
                </span>
                <MookHealthTracker
                  health={p.health}
                  disabled={disabled}
                  onChange={(next) => onMookHealthChange(p.id, next)}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ParticipantBadge({
  kind,
}: {
  kind: CombatParticipant["kind"];
}) {
  const label =
    kind === "PC"
      ? "PC"
      : kind === "NPC"
        ? "PNJ"
        : kind === "ANTAGONIST"
          ? "ANT"
          : kind === "MOOK"
            ? "x"
            : "PNJ";
  const cls =
    kind === "PC"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : kind === "ANTAGONIST"
        ? "border-blood/40 bg-blood/15 text-blood"
        : kind === "MOOK"
          ? "border-amber-500/60 bg-amber-500/20 text-amber-200"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-wider",
        cls
      )}
    >
      {label}
    </span>
  );
}

function InitiativeInput({
  value,
  disabled,
  onCommit,
}: {
  value: number | null;
  disabled: boolean;
  onCommit: (v: number | null) => void;
}) {
  const [draft, setDraft] = useState<string>(
    value == null ? "" : String(value)
  );
  // Sincroniza con cambios externos.
  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== null) onCommit(null);
      return;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    if (n !== value) onCommit(n);
  }

  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      disabled={disabled}
      placeholder="Ini"
      aria-label="Iniciativa"
      className="h-7 w-12 rounded border border-input bg-input/30 px-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blood"
    />
  );
}

// ──────────────────────────────────────────────────────────
// Formulario para agregar participante
// ──────────────────────────────────────────────────────────

function AddParticipantForm({
  associable,
  onCancel,
  onAdd,
  busy,
}: {
  associable: Character[];
  onCancel: () => void;
  onAdd: (input: {
    characterId?: string | null;
    displayName?: string | null;
    initiative?: number | null;
  }) => Promise<void>;
  busy: boolean;
}) {
  const [source, setSource] = useState<"character" | "free">(
    associable.length > 0 ? "character" : "free"
  );
  const [characterId, setCharacterId] = useState<string>(
    associable[0]?.id ?? ""
  );
  const [displayName, setDisplayName] = useState("");
  const [initiative, setInitiative] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ini = initiative.trim();
    const iniNum = ini === "" ? null : parseInt(ini, 10);
    if (source === "character") {
      if (!characterId) return;
      const override = displayName.trim();
      await onAdd({
        characterId,
        displayName: override || null,
        initiative: iniNum,
      });
    } else {
      const name = displayName.trim();
      if (!name) return;
      await onAdd({ displayName: name, initiative: iniNum });
    }
    setDisplayName("");
    setInitiative("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as "character" | "free")}
          disabled={busy}
          className={cn(SELECT_DARK_CLASS, "h-8 flex-1 text-xs")}
          aria-label="Tipo de participante"
        >
          <option value="character" disabled={associable.length === 0}>
            Personaje de la mesa
          </option>
          <option value="free">Entrada libre (improvisada)</option>
        </select>
        <Tooltip content="Cancelar" side="left">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancelar"
            className="size-7"
          >
            <X className="size-4" />
          </Button>
        </Tooltip>
      </div>

      {source === "character" ? (
        <select
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          disabled={busy || associable.length === 0}
          className={cn(SELECT_DARK_CLASS, "h-8 w-full text-xs")}
          aria-label="Personaje"
        >
          {associable.length === 0 ? (
            <option value="">Todos los personajes ya están en el orden</option>
          ) : (
            associable.map((c) => (
              <option key={c.id} value={c.id}>
                {labelForKind(c)}
              </option>
            ))
          )}
        </select>
      ) : null}

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={
          source === "character"
            ? "Nombre alternativo (opcional)"
            : "Nombre del PNJ"
        }
        disabled={busy}
        maxLength={120}
        className="h-8 w-full rounded border border-input bg-input/30 px-2 text-xs placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
      />

      <div className="flex items-center gap-2">
        <input
          type="number"
          value={initiative}
          onChange={(e) => setInitiative(e.target.value)}
          placeholder="Iniciativa"
          disabled={busy}
          className="h-8 w-24 rounded border border-input bg-input/30 px-2 text-xs placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
        />
        <Button
          type="submit"
          disabled={
            busy ||
            (source === "character" && !characterId) ||
            (source === "free" && !displayName.trim())
          }
          className="flex-1 bg-blood text-blood-foreground hover:bg-blood/90"
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
    </form>
  );
}

function labelForKind(c: Character): string {
  const tag =
    c.kind === "NPC" ? " · PNJ" : c.kind === "ANTAGONIST" ? " · Antagonista" : "";
  return `${c.name}${tag}`;
}

// ──────────────────────────────────────────────────────────
// Formulario para clonar antagonista (mooks)
// ──────────────────────────────────────────────────────────

function CloneAntagonistForm({
  cloneable,
  onCancel,
  onClone,
  busy,
}: {
  cloneable: Character[];
  onCancel: () => void;
  onClone: (input: {
    sourceCharacterId: string;
    count: number;
    baseName?: string;
  }) => Promise<void>;
  busy: boolean;
}) {
  const [sourceCharacterId, setSourceCharacterId] = useState<string>(
    cloneable[0]?.id ?? ""
  );
  const [count, setCount] = useState<string>("4");
  const [baseName, setBaseName] = useState<string>("");

  // Cuando cambia la plantilla, sugerimos su nombre como base.
  const selectedChar = useMemo(
    () => cloneable.find((c) => c.id === sourceCharacterId),
    [cloneable, sourceCharacterId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceCharacterId) return;
    const n = parseInt(count.trim(), 10);
    if (!Number.isFinite(n) || n < 1) return;
    const safeCount = Math.max(1, Math.min(20, n));
    const trimmedBase = baseName.trim();
    await onClone({
      sourceCharacterId,
      count: safeCount,
      baseName: trimmedBase || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-heading text-xs uppercase tracking-wider text-amber-300">
          Clonar antagonista
        </span>
        <Tooltip content="Cancelar" side="left">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancelar"
            className="size-7"
          >
            <X className="size-4" />
          </Button>
        </Tooltip>
      </div>

      <select
        value={sourceCharacterId}
        onChange={(e) => setSourceCharacterId(e.target.value)}
        disabled={busy || cloneable.length === 0}
        className={cn(SELECT_DARK_CLASS, "h-8 w-full text-xs")}
        aria-label="Plantilla"
      >
        {cloneable.length === 0 ? (
          <option value="">No hay PNJs o antagonistas asociados</option>
        ) : (
          cloneable.map((c) => (
            <option key={c.id} value={c.id}>
              {labelForKind(c)}
            </option>
          ))
        )}
      </select>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          disabled={busy}
          aria-label="Cantidad de copias"
          className="h-8 w-16 rounded border border-input bg-input/30 px-2 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blood"
        />
        <input
          type="text"
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          placeholder={
            selectedChar ? `Nombre base (default: ${selectedChar.name})` : "Nombre base"
          }
          disabled={busy}
          maxLength={100}
          className="h-8 flex-1 rounded border border-input bg-input/30 px-2 text-xs placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
        />
      </div>

      <p className="text-[10px] italic text-muted-foreground">
        Crea N copias con Destreza, Astucia y salud por casilla del antagonista
        plantilla. Las copias no tienen ficha completa: solo se trackea
        iniciativa y daño.
      </p>

      <Button
        type="submit"
        disabled={busy || !sourceCharacterId || cloneable.length === 0}
        className="w-full bg-amber-500/80 text-background hover:bg-amber-500"
      >
        <Users className="size-4" />
        Crear copias
      </Button>
    </form>
  );
}
