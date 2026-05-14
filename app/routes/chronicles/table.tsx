import {
  ArrowLeft,
  Dice5,
  GripVertical,
  MessageSquare,
  NotebookPen,
  Palette,
  Send,
  User as UserIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Tooltip } from "~/components/common/tooltip";
import { CharacterSheetPanel } from "~/components/table/character-sheet-panel";
import { DiceRollerVtM, type RollerPrefill } from "~/components/table/dice-roller-vtm";
import { NotesModal } from "~/components/table/notes-modal";
import { RollHistory } from "~/components/table/roll-history";
import { WhiteboardModal } from "~/components/table/whiteboard-modal";
import { Button } from "~/components/ui/button";
import { useTable, type FeedItem } from "~/hooks/use-table";
import {
  listChronicleCharacters,
  type ChronicleMemberRef,
} from "~/lib/api/characters/characters.api";
import type { Character } from "~/lib/api/characters/characters.types";
import {
  clearChronicleRolls,
  listChronicleRolls,
} from "~/lib/api/dice/dice.api";
import { useConfirm } from "~/hooks/use-confirm";
import type { SheetAnnounce } from "~/lib/socket/types";
import { useUserStore } from "~/stores/user.store";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Mesa · Distop-IA VTT" }];
}

type RightTab = "chat" | "dice";

// ── Splitter (columna izquierda / derecha) ─────────────────
const SPLIT_MIN = 40; // % mínimo de la columna izquierda
const SPLIT_MAX = 85; // % máximo de la columna izquierda
const SPLIT_DEFAULT = 75;
const SPLIT_STORAGE_PREFIX = "distopia.table-split:";

type CharWithOwner = Character & { user?: ChronicleMemberRef };

export default function ChronicleTableRoute() {
  const { id: chronicleId } = useParams<{ id: string }>();
  const userId = useUserStore((s) => s.user?.id) ?? null;

  const {
    status,
    error,
    members,
    myRole,
    feed,
    rolls,
    latestRollId,
    boardShared,
    remoteBoard,
    remoteBoardVersion,
    sendMessage,
    rollVtm,
    announceSheet,
    shareBoard,
    pushBoardUpdate,
    setInitialRolls,
    dismissLatestRoll,
  } = useTable(chronicleId ?? null);

  // ── Historial REST ──────────────────────────────────────
  useEffect(() => {
    if (!chronicleId) return;
    let mounted = true;
    listChronicleRolls(chronicleId, 50)
      .then((data) => {
        if (!mounted) return;
        // El back devuelve `desc` (más reciente primero). En la UI mostramos
        // ascendente para que la última quede abajo, como el chat.
        setInitialRolls([...data].reverse());
      })
      .catch(() => {
        /* WS llena el feed igual */
      });
    return () => {
      mounted = false;
    };
  }, [chronicleId, setInitialRolls]);

  // ── Personajes accesibles ──────────────────────────────
  // - Jugador: solo sus PJs asociados a esta crónica.
  // - Narrador: todos los PJs de la crónica + sus PNJs + sus antagonistas.
  const [allCharacters, setAllCharacters] = useState<CharWithOwner[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const visibleCharacters = useMemo<CharWithOwner[]>(() => {
    if (!userId) return [];
    if (myRole === "NARRATOR") return allCharacters;
    return allCharacters.filter(
      (c) => c.userId === userId && c.kind === "PC"
    );
  }, [allCharacters, userId, myRole]);

  useEffect(() => {
    if (!chronicleId) return;
    let mounted = true;
    listChronicleCharacters(chronicleId)
      .then((entries) => {
        if (!mounted) return;
        setAllCharacters(entries.map((e) => e.character as CharWithOwner));
      })
      .catch((err) => {
        if (mounted)
          setSheetError(
            err instanceof Error ? err.message : "No se pudieron cargar las hojas"
          );
      });
    return () => {
      mounted = false;
    };
  }, [chronicleId]);

  // Reset/auto-select del personaje cuando cambia la lista visible.
  useEffect(() => {
    if (visibleCharacters.length === 0) {
      setSelectedCharId(null);
      return;
    }
    if (!visibleCharacters.find((c) => c.id === selectedCharId)) {
      setSelectedCharId(visibleCharacters[0].id);
    }
  }, [visibleCharacters, selectedCharId]);

  const selectedChar = useMemo(
    () => visibleCharacters.find((c) => c.id === selectedCharId) ?? null,
    [visibleCharacters, selectedCharId]
  );

  function handleCharacterUpdated(updated: Character) {
    setAllCharacters((cs) =>
      cs.map((c) => (c.id === updated.id ? ({ ...c, ...updated } as CharWithOwner) : c))
    );
  }

  // ── Sincronización en vivo: aplica deltas de sheet:announce ──
  //
  // Cuando el back emite un anuncio de hoja (por ejemplo, "Voluntad actual: 4 → 3"
  // tras gastar voluntad en una tirada), actualizamos el personaje en memoria
  // para que el saldo se vea inmediatamente en el panel.
  const lastAppliedAnnounceRef = useRef<string | null>(null);
  useEffect(() => {
    if (feed.length === 0) return;
    // Recorremos del final hacia atrás hasta encontrar el último ya aplicado.
    for (let i = feed.length - 1; i >= 0; i--) {
      const item = feed[i];
      if (item._t !== "sheet") continue;
      if (item.id === lastAppliedAnnounceRef.current) break;
      // Aplicar este item. Sólo nos interesa actualizar si tenemos el
      // personaje cargado y los labels son campos numéricos conocidos.
      setAllCharacters((cs) => {
        const target = cs.find((c) => c.id === item.characterId);
        if (!target) return cs;
        const patch = deltasToCharacterPatch(item);
        if (!patch) return cs;
        return cs.map((c) =>
          c.id === item.characterId ? ({ ...c, ...patch } as CharWithOwner) : c
        );
      });
    }
    // Marcamos el último announce visto para no reaplicar.
    for (let i = feed.length - 1; i >= 0; i--) {
      if (feed[i]._t === "sheet") {
        lastAppliedAnnounceRef.current = (feed[i] as SheetAnnounce).id;
        break;
      }
    }
  }, [feed]);

  // ── Prefill del roller desde la hoja ─────────────────────
  const [prefill, setPrefill] = useState<RollerPrefill | undefined>(undefined);
  const prefillSeqRef = useRef(0);

  function handlePrefillRoll(input: {
    pool: number;
    label: string;
    characterId: string;
    woundPenalty: number;
    willpowerAvailable: number;
  }) {
    prefillSeqRef.current += 1;
    setPrefill({
      pool: input.pool,
      label: input.label,
      characterId: input.characterId,
      woundPenalty: input.woundPenalty,
      willpowerAvailable: input.willpowerAvailable,
      signature: prefillSeqRef.current,
    });
    setRightTab("dice");
  }

  // ── Tabs y modal pizarra ─────────────────────────────────
  const [rightTab, setRightTab] = useState<RightTab>("chat");
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // ── Limpieza de tiradas (solo narrador) ─────────────────
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [clearingRolls, setClearingRolls] = useState(false);

  async function handleClearRolls() {
    if (!chronicleId || clearingRolls) return;
    const ok = await confirm({
      title: "¿Limpiar historial de tiradas?",
      description:
        "Se eliminarán permanentemente todas las tiradas registradas en esta crónica. Esta acción no se puede deshacer.",
      confirmLabel: "Limpiar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    setClearingRolls(true);
    try {
      await clearChronicleRolls(chronicleId);
      // El back emite `rolls:cleared` por WS; nuestro hook ya vacía el feed.
    } catch {
      // El back ya valida permisos; un error aquí es muy improbable, pero por
      // las dudas no rompemos la UI.
    } finally {
      setClearingRolls(false);
    }
  }

  // ── Splitter horizontal con persistencia por crónica ─────
  const splitStorageKey = chronicleId
    ? `${SPLIT_STORAGE_PREFIX}${chronicleId}`
    : null;

  const [splitPct, setSplitPct] = useState<number>(() => {
    if (typeof window === "undefined" || !splitStorageKey) return SPLIT_DEFAULT;
    const raw = window.localStorage.getItem(splitStorageKey);
    const parsed = raw ? parseFloat(raw) : NaN;
    if (Number.isFinite(parsed)) {
      return Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, parsed));
    }
    return SPLIT_DEFAULT;
  });

  // Persiste cambios de split.
  useEffect(() => {
    if (!splitStorageKey || typeof window === "undefined") return;
    window.localStorage.setItem(splitStorageKey, String(splitPct));
  }, [splitPct, splitStorageKey]);

  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const el = splitContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, pct)));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <section className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Link
            to={`/chronicles/${chronicleId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="size-4" />
              Volver a la crónica
            </span>
          </Link>
          <PresenceTags members={members} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNotesOpen(true)}
          >
            <NotebookPen className="size-4" />
            Notas
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWhiteboardOpen(true)}
          >
            <Palette className="size-4" />
            Pizarra
          </Button>
          <ConnectionBadge status={status} error={error} />
        </div>
      </header>

      <div
        ref={splitContainerRef}
        className="flex flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:gap-0"
        style={
          {
            // Variables CSS consumidas por las columnas (solo se aplican en lg+).
            "--split-left": `${splitPct}%`,
            "--split-right": `${100 - splitPct}%`,
          } as React.CSSProperties
        }
      >
        {/* ─── Columna izquierda: hoja del personaje ─── */}
        <aside className="flex h-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card lg:flex-[0_0_var(--split-left)]">
          <div className="flex-1 overflow-hidden">
            <SheetTab
              chronicleId={chronicleId ?? ""}
              characters={visibleCharacters}
              selectedChar={selectedChar}
              onSelectChar={setSelectedCharId}
              onPrefillRoll={handlePrefillRoll}
              onCharacterUpdated={handleCharacterUpdated}
              onAnnounceSheet={announceSheet}
              error={sheetError}
              isNarrator={myRole === "NARRATOR"}
            />
          </div>
        </aside>

        {/* ─── Splitter draggable (solo en lg+) ─── */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleSplitterMouseDown}
          className="hidden lg:flex w-2 cursor-col-resize items-center justify-center select-none group"
          title="Arrastra para ajustar el ancho"
        >
          <span className="flex h-12 w-1 items-center justify-center rounded-full bg-border transition-colors group-hover:bg-blood/50">
            <GripVertical className="size-3 text-muted-foreground" />
          </span>
        </div>

        {/* ─── Columna derecha: tabs Chat / Dados + roller ─── */}
        <aside className="flex h-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card lg:flex-[0_0_var(--split-right)]">
          <nav className="flex border-b border-border">
            <TabButton
              active={rightTab === "chat"}
              onClick={() => setRightTab("chat")}
              icon={<MessageSquare className="size-3.5" />}
              label="Chat"
            />
            <TabButton
              active={rightTab === "dice"}
              onClick={() => setRightTab("dice")}
              icon={<Dice5 className="size-3.5" />}
              label={`Tiradas${rolls.length ? ` (${rolls.length})` : ""}`}
            />
          </nav>

          <div className="flex-1 overflow-hidden">
            {rightTab === "chat" ? (
              <ChatPanel
                feed={feed}
                disabled={status !== "joined"}
                onSend={sendMessage}
              />
            ) : (
              <RollHistory
                rolls={rolls}
                latestRollId={latestRollId}
                onDismissLatest={dismissLatestRoll}
                canClear={myRole === "NARRATOR"}
                onClear={handleClearRolls}
                clearing={clearingRolls}
              />
            )}
          </div>

          <div className="border-t border-border bg-background/30">
            <DiceRollerVtM
              canTryPrivate={myRole !== "NARRATOR"}
              prefill={prefill}
              onRoll={async (input) => {
                const resp = await rollVtm(input);
                if (resp.ok) setRightTab("dice");
                return resp;
              }}
            />
          </div>
        </aside>
      </div>

      {whiteboardOpen && chronicleId ? (
        <WhiteboardModal
          chronicleId={chronicleId}
          isNarrator={myRole === "NARRATOR"}
          boardShared={boardShared}
          remoteBoard={remoteBoard}
          remoteBoardVersion={remoteBoardVersion}
          onShareToggle={shareBoard}
          onPushUpdate={pushBoardUpdate}
          onClose={() => setWhiteboardOpen(false)}
        />
      ) : null}
      {notesOpen && chronicleId ? (
        <NotesModal
          chronicleId={chronicleId}
          isNarrator={myRole === "NARRATOR"}
          onClose={() => setNotesOpen(false)}
        />
      ) : null}
      {confirmDialog}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ConnectionBadge({
  status,
  error,
}: {
  status: ReturnType<typeof useTable>["status"];
  error: string | null;
}) {
  const label = {
    idle: "Inactiva",
    connecting: "Conectando...",
    connected: "Uniéndose...",
    joined: "En la mesa",
    error: error ?? "Error",
    disconnected: "Desconectado",
  }[status];

  const tone = {
    idle: "bg-muted text-muted-foreground",
    connecting: "bg-amber-500/20 text-amber-400",
    connected: "bg-amber-500/20 text-amber-400",
    joined: "bg-emerald-500/20 text-emerald-400",
    error: "bg-blood/30 text-blood-foreground",
    disconnected: "bg-muted text-muted-foreground",
  }[status];

  return (
    <span
      className={cn(
        "rounded-sm px-2 py-1 font-heading text-[10px] uppercase tracking-widest",
        tone
      )}
    >
      {label}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-heading uppercase tracking-wider transition-colors",
        active
          ? "bg-blood/20 text-blood-foreground border-b-2 border-blood"
          : "text-muted-foreground hover:bg-blood/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PresenceTags({
  members,
}: {
  members: ReturnType<typeof useTable>["members"];
}) {
  if (members.length === 0) {
    return (
      <span className="text-xs italic text-muted-foreground">
        Esperando a otros...
      </span>
    );
  }
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {members.map((m) => {
        const name = m.email.split("@")[0];
        const isNarrator = m.role === "NARRATOR";
        return (
          <li key={m.id}>
            <Tooltip title={m.email} content={isNarrator ? "Narrador de la mesa" : "Jugador"}>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                  isNarrator
                    ? "border-blood/50 bg-blood/15 text-blood"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isNarrator ? "bg-blood" : "bg-emerald-400"
                  )}
                />
                <span className="max-w-[10rem] truncate">{name}</span>
              </span>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}

function SheetTab({
  chronicleId,
  characters,
  selectedChar,
  onSelectChar,
  onPrefillRoll,
  onCharacterUpdated,
  onAnnounceSheet,
  error,
  isNarrator,
}: {
  chronicleId: string;
  characters: CharWithOwner[];
  selectedChar: CharWithOwner | null;
  onSelectChar: (id: string) => void;
  onPrefillRoll: (input: {
    pool: number;
    label: string;
    characterId: string;
    woundPenalty: number;
    willpowerAvailable: number;
  }) => void;
  onCharacterUpdated: (c: Character) => void;
  onAnnounceSheet: ReturnType<typeof useTable>["announceSheet"];
  error: string | null;
  isNarrator: boolean;
}) {
  if (error) {
    return <div className="p-3 text-sm italic text-blood">{error}</div>;
  }
  if (characters.length === 0) {
    return (
      <div className="p-3 text-center">
        <UserIcon className="mx-auto mb-2 size-8 text-muted-foreground/60" />
        <p className="text-sm italic text-muted-foreground">
          {isNarrator
            ? "Aún no hay personajes asociados a esta crónica."
            : "Aún no tienes un personaje asociado a esta crónica."}
        </p>
        <Link to={`/chronicles/${chronicleId}`} className="mt-3 inline-block">
          <Button size="sm" variant="outline">
            {isNarrator ? "Gestionar personajes" : "Asociar uno"}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {characters.length > 1 ? (
        <div className="border-b border-border p-2">
          <select
            value={selectedChar?.id ?? ""}
            onChange={(e) => onSelectChar(e.target.value)}
            className={cn(SELECT_DARK_CLASS, "h-8")}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {labelForCharacter(c, isNarrator)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {selectedChar ? (
        <CharacterSheetPanel
          character={selectedChar}
          chronicleId={chronicleId}
          onPrefillRoll={onPrefillRoll}
          onCharacterUpdated={onCharacterUpdated}
          onAnnounceSheet={onAnnounceSheet}
          canEditWillpower={isNarrator}
        />
      ) : null}
    </div>
  );
}

function labelForCharacter(c: CharWithOwner, isNarrator: boolean): string {
  if (!isNarrator) return c.name;
  const kindLabel =
    c.kind === "NPC" ? "PNJ" : c.kind === "ANTAGONIST" ? "Antagonista" : null;
  const owner = c.kind === "PC" ? c.user?.nickname ?? c.user?.email ?? "" : "";
  const suffix = [kindLabel, owner].filter(Boolean).join(" · ");
  return suffix ? `${c.name} — ${suffix}` : c.name;
}

/**
 * Traduce un sheet:announce a un patch parcial del Character para que el
 * panel vea los cambios en vivo sin tener que pegarle al back.
 *
 * Soporta los labels que emite el back (ver `STATE_LABELS` en
 * character-sheet-panel y los anuncios automáticos del gateway).
 */
function deltasToCharacterPatch(
  announce: SheetAnnounce
): Partial<Character> | null {
  const patch: Partial<Character> = {};
  let touched = false;
  for (const d of announce.deltas) {
    const key = labelToCharacterKey(d.label);
    if (!key) continue;
    const numeric = Number.parseInt(d.after, 10);
    if (Number.isFinite(numeric)) {
      (patch as Record<string, number>)[key] = numeric;
      touched = true;
    }
  }
  return touched ? patch : null;
}

function labelToCharacterKey(label: string): keyof Character | null {
  switch (label) {
    case "Sangre":
    case "Reserva de sangre":
      return "bloodPool";
    case "Voluntad actual":
      return "willpowerCurrent";
    case "Voluntad permanente":
    case "Voluntad máxima":
      return "willpowerMax";
    case "Humanidad":
    case "Senda":
      return "humanity";
    case "Experiencia":
      return "experience";
    case "Contusionado":
      return "healthBruised";
    case "Magullado":
      return "healthHurt";
    case "Herido":
      return "healthInjured";
    case "Lesionado":
      return "healthWounded";
    case "Malherido":
      return "healthMauled";
    case "Tullido":
      return "healthCrippled";
    case "Incapacitado":
      return "healthIncapacitated";
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat con feed unificado (chat + anuncios de hoja)
// ─────────────────────────────────────────────────────────────────────────────

function ChatPanel({
  feed,
  disabled,
  onSend,
}: {
  feed: FeedItem[];
  disabled: boolean;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    const ok = await onSend(text);
    if (ok) setText("");
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
      >
        {feed.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            La conversación aún no ha comenzado.
          </p>
        ) : (
          feed.map((item, i) =>
            item._t === "chat" ? (
              <ChatMessageRow key={item.id ?? i} item={item} />
            ) : (
              <SheetAnnouncementRow key={item.id ?? i} item={item} />
            )
          )
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border bg-background/30 p-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Conectando..." : "Escribe un mensaje..."}
          maxLength={2000}
          className="h-9 flex-1 rounded-md border border-input bg-input/30 px-3 text-sm placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
        />
        <Button
          type="submit"
          disabled={disabled || !text.trim()}
          size="icon"
          className="bg-blood text-blood-foreground hover:bg-blood/90"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function ChatMessageRow({
  item,
}: {
  item: Extract<FeedItem, { _t: "chat" }>;
}) {
  return (
    <div className="text-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-heading text-xs uppercase tracking-wider text-blood">
          {item.email}
        </span>
        <span className="text-[10px] italic text-muted-foreground">
          {new Date(item.at).toLocaleTimeString()}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words">{item.text}</p>
    </div>
  );
}

function SheetAnnouncementRow({ item }: { item: SheetAnnounce }) {
  const isPrivate = item.kind !== "PC";
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs",
        isPrivate && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <div className="flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-wider">
        <span className="font-heading text-muted-foreground">
          {item.characterName}
          {isPrivate ? (
            <span className="ml-1 text-amber-400 normal-case tracking-normal">
              · {item.kind === "NPC" ? "PNJ" : "antagonista"}
            </span>
          ) : null}
        </span>
        <span className="italic text-muted-foreground">
          {new Date(item.at).toLocaleTimeString()}
        </span>
      </div>
      <ul className="mt-0.5 space-y-0.5">
        {item.deltas.map((d, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{d.label}:</span>
            <span className="tabular-nums text-muted-foreground/60 line-through">
              {d.before}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="tabular-nums text-foreground">{d.after}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Pizarra (real, vive en `whiteboard-modal.tsx`).
// ─────────────────────────────────────────────────────────────────────────────
