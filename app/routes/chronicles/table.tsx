import {
  ArrowLeft,
  Dice5,
  GripVertical,
  MessageSquare,
  NotebookPen,
  Palette,
  Send,
  Swords,
  User as UserIcon,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Tooltip } from "~/components/common/tooltip";
import { CharacterSheetPanel } from "~/components/table/character-sheet-panel";
import { CombatPanel } from "~/components/table/combat-panel";
import { DiceRollerVtM, type RollerPrefill } from "~/components/table/dice-roller-vtm";
import { NotesModal } from "~/components/table/notes-modal";
import { RollHistory } from "~/components/table/roll-history";
import { WhiteboardModal } from "~/components/table/whiteboard-modal";
import { Button } from "~/components/ui/button";
import { useAudioMute } from "~/hooks/use-audio-mute";
import { useAudioUnlock } from "~/hooks/use-audio-unlock";
import { useTable, type FeedItem } from "~/hooks/use-table";
import {
  listChronicleCharacters,
  type ChronicleMemberRef,
} from "~/lib/api/characters/characters.api";
import {
  listArmors,
  listWeaponCategories,
  listWeapons,
} from "~/lib/api/catalog/catalog.api";
import { getCombat } from "~/lib/api/combat/combat.api";
import type { CombatState } from "~/lib/api/combat/combat.types";
import type {
  Armor,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";
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

type RightTab = "chat" | "dice" | "turns";

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
    setCombat,
    dismissLatestRoll,
    combat,
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

  // ── Tracker de turnos (carga inicial REST) ───────────────
  // El WS hidrata después con cualquier cambio en tiempo real.
  useEffect(() => {
    if (!chronicleId) return;
    let mounted = true;
    getCombat(chronicleId)
      .then((state) => {
        if (mounted) setCombat(state);
      })
      .catch(() => {
        /* Si falla, el tab muestra "Cargando…" hasta que llegue un broadcast. */
      });
    return () => {
      mounted = false;
    };
  }, [chronicleId, setCombat]);

  // ── Personajes accesibles ──────────────────────────────
  // - Jugador: solo sus PJs asociados a esta crónica.
  // - Narrador: todos los PJs de la crónica + sus PNJs + sus antagonistas.
  const [allCharacters, setAllCharacters] = useState<CharWithOwner[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  // Catálogos V20 para los botones de consulta rápida en la hoja embebida.
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [weaponCategories, setWeaponCategories] = useState<WeaponCategory[]>(
    [],
  );
  const [armors, setArmors] = useState<Armor[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([listWeapons(), listWeaponCategories(), listArmors()])
      .then(([w, c, a]) => {
        if (!mounted) return;
        setWeapons(w);
        setWeaponCategories(c);
        setArmors(a);
      })
      .catch(() => {
        // Silencioso: si el catálogo falla, los botones simplemente no
        // muestran datos. El resto de la mesa sigue funcionando.
      });
    return () => {
      mounted = false;
    };
  }, []);

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
    setMobileTab("chat");
    setMobileDiceOpen(true);
  }

  // ── Tabs y modal pizarra ─────────────────────────────────
  const [rightTab, setRightTab] = useState<RightTab>("chat");

  // Si un jugador estaba viendo Turnos y el tracker se vacía (el master
  // limpió el combate), lo regresamos al chat para no dejarlo en un tab
  // que dejó de mostrarse.
  useEffect(() => {
    if (rightTab !== "turns") return;
    if (myRole === "NARRATOR") return;
    if (!combat || combat.participants.length === 0) {
      setRightTab("chat");
    }
  }, [rightTab, myRole, combat]);
  // En mobile (<lg) las dos columnas se alternan por tabs para que el scroll
  // de la hoja no atrape el dedo y haga inaccesible el chat. En lg+ ambas
  // columnas se muestran a la vez con el splitter horizontal.
  const [mobileTab, setMobileTab] = useState<"sheet" | "chat">("sheet");
  // En mobile el DiceRoller se colapsa tras un botón para ganar alto de chat.
  const [mobileDiceOpen, setMobileDiceOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // ── Silenciar feedback sonoro ───────────────────────────
  const { muted, toggle: toggleMute } = useAudioMute();
  // Desbloquea el AudioContext en el primer gesto del usuario; sin esto
  // los browsers no permiten reproducir sonido en respuesta a eventos WS.
  useAudioUnlock();

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
    <section className="flex h-[calc(100dvh-7rem)] min-h-125 flex-col lg:h-[calc(100dvh-8rem)]">
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
          <Tooltip
            title={muted ? "Activar sonido" : "Silenciar sonido"}
            content={
              muted
                ? "Volverán los sonidos al recibir mensajes y tiradas."
                : "Silencia el feedback sonoro de mensajes y tiradas. La preferencia se recuerda al recargar."
            }
            side="bottom"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMute}
              aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
              aria-pressed={muted}
            >
              {muted ? (
                <VolumeX className="size-4 text-muted-foreground" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
          </Tooltip>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setNotesOpen(true)}
            aria-label="Notas"
          >
            <NotebookPen className="size-4" />
            <span className="hidden sm:inline">Notas</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWhiteboardOpen(true)}
            aria-label="Pizarra"
          >
            <Palette className="size-4" />
            <span className="hidden sm:inline">Pizarra</span>
          </Button>
          <ConnectionBadge status={status} error={error} />
        </div>
      </header>

      {/* ─── Tabs mobile (<lg): alterna entre hoja y chat ─── */}
      <nav className="mb-3 flex rounded-lg border border-border bg-card p-1 lg:hidden">
        <MobileTabButton
          active={mobileTab === "sheet"}
          onClick={() => setMobileTab("sheet")}
          icon={<UserIcon className="size-4" />}
          label="Hoja"
        />
        <MobileTabButton
          active={mobileTab === "chat"}
          onClick={() => setMobileTab("chat")}
          icon={<MessageSquare className="size-4" />}
          label={`Chat${rolls.length ? ` · ${rolls.length}` : ""}`}
        />
      </nav>

      <div
        ref={splitContainerRef}
        className="flex flex-1 flex-col overflow-hidden lg:flex-row lg:gap-0"
        style={
          {
            // Variables CSS consumidas por las columnas (solo se aplican en lg+).
            "--split-left": `${splitPct}%`,
            "--split-right": `${100 - splitPct}%`,
          } as React.CSSProperties
        }
      >
        {/* ─── Columna izquierda: hoja del personaje ───
            En mobile solo es visible cuando mobileTab === "sheet" y ocupa
            todo el alto disponible. En lg+, el splitter controla el ancho
            y ambas columnas se muestran a la vez. */}
        <aside
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card lg:flex lg:h-full lg:flex-[0_0_var(--split-left)]",
            mobileTab === "sheet" ? "flex" : "hidden"
          )}
        >
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
              weapons={weapons}
              weaponCategories={weaponCategories}
              armors={armors}
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

        {/* ─── Columna derecha: tabs Chat / Dados + roller ───
            En mobile solo es visible cuando mobileTab === "chat". */}
        <aside
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card lg:flex lg:h-full lg:flex-[0_0_var(--split-right)]",
            mobileTab === "chat" ? "flex" : "hidden"
          )}
        >
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
            {/* Turnos: siempre visible para el narrador; jugadores solo si
                hay un combate activo con al menos un participante PC. */}
            {myRole === "NARRATOR" ||
            (combat && combat.participants.length > 0) ? (
              <TabButton
                active={rightTab === "turns"}
                onClick={() => setRightTab("turns")}
                icon={<Swords className="size-3.5" />}
                label="Turnos"
              />
            ) : null}
          </nav>

          <div className="flex-1 overflow-hidden">
            {rightTab === "chat" ? (
              <ChatPanel
                feed={feed}
                disabled={status !== "joined"}
                onSend={sendMessage}
                members={members}
                currentUserId={userId}
                myRole={myRole}
                myCharacters={visibleCharacters
                  .filter((c) => c.userId === userId)
                  .map((c) => ({ id: c.id, name: c.name }))}
                initialSpeakerCharacterId={selectedCharId}
              />
            ) : rightTab === "dice" ? (
              <RollHistory
                rolls={rolls}
                latestRollId={latestRollId}
                onDismissLatest={dismissLatestRoll}
                canClear={myRole === "NARRATOR"}
                onClear={handleClearRolls}
                clearing={clearingRolls}
              />
            ) : (
              <CombatPanel
                chronicleId={chronicleId ?? ""}
                state={combat}
                isNarrator={myRole === "NARRATOR"}
                myUserId={userId}
                associableCharacters={allCharacters}
                onStateChange={(next: CombatState) => setCombat(next)}
              />
            )}
          </div>

          {/* DiceRoller anclado al tab "Tiradas". En lg+ va inline al pie
              de la columna; en mobile se accede por botón que abre un sheet
              para no robarle alto al historial. */}
          {rightTab === "dice" ? (
            <>
              <div className="hidden border-t border-border bg-background/30 lg:block">
                <DiceRollerVtM
                  canTryPrivate={myRole !== "NARRATOR"}
                  prefill={prefill}
                  onRoll={async (input) => {
                    const resp = await rollVtm(input);
                    return resp;
                  }}
                />
              </div>
              <div className="border-t border-border bg-background/30 p-2 lg:hidden">
                <Button
                  type="button"
                  onClick={() => setMobileDiceOpen(true)}
                  className="w-full bg-blood text-blood-foreground hover:bg-blood/90"
                >
                  <Dice5 className="size-4" />
                  Lanzar dados
                </Button>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {/* Sheet mobile con el DiceRoller. */}
      {mobileDiceOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lanzador de dados"
          className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Lanzar dados
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileDiceOpen(false)}
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto themed-scrollbar">
            <DiceRollerVtM
              canTryPrivate={myRole !== "NARRATOR"}
              prefill={prefill}
              onRoll={async (input) => {
                const resp = await rollVtm(input);
                if (resp.ok) {
                  setRightTab("dice");
                  setMobileDiceOpen(false);
                }
                return resp;
              }}
            />
          </div>
        </div>
      ) : null}

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
          currentCharacterId={selectedCharId}
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

function MobileTabButton({
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
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-heading uppercase tracking-wider transition-colors",
        active
          ? "bg-blood text-blood-foreground shadow-sm shadow-blood/40"
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
        const name = m.nickname?.trim() || m.email.split("@")[0];
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
  weapons,
  weaponCategories,
  armors,
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
  weapons: Weapon[];
  weaponCategories: WeaponCategory[];
  armors: Armor[];
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
          weapons={weapons}
          weaponCategories={weaponCategories}
          armors={armors}
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
  members,
  currentUserId,
  myRole,
  myCharacters,
  initialSpeakerCharacterId,
}: {
  feed: FeedItem[];
  disabled: boolean;
  onSend: (
    text: string,
    recipient?: import("~/lib/socket/types").ChatRecipient,
    as?: import("~/lib/socket/types").ChatSpeakerInput,
  ) => Promise<boolean>;
  members: ReturnType<typeof useTable>["members"];
  currentUserId: string | null;
  myRole: ReturnType<typeof useTable>["myRole"];
  /** PJs propios para el selector "Hablar como". */
  myCharacters: { id: string; name: string }[];
  /** Si hay un PJ activo, lo pre-seleccionamos en el selector. */
  initialSpeakerCharacterId: string | null;
}) {
  const [text, setText] = useState("");
  // recipientValue es el valor del <select>:
  //   "all"           → toda la sala
  //   "narrator"      → al narrador (oculto si yo soy narrador)
  //   "user:<userId>" → susurro a ese usuario
  const [recipientValue, setRecipientValue] = useState<string>("all");
  // speakerValue:
  //   "self"        → habla como usuario (nickname)
  //   "char:<id>"   → habla como ese PJ
  const [speakerValue, setSpeakerValue] = useState<string>(
    initialSpeakerCharacterId ? `char:${initialSpeakerCharacterId}` : "self",
  );
  // Si el PJ seleccionado deja de estar disponible, volvemos a "self".
  useEffect(() => {
    if (speakerValue === "self") return;
    const id = speakerValue.slice(5);
    if (!myCharacters.some((c) => c.id === id)) {
      setSpeakerValue("self");
    }
  }, [myCharacters, speakerValue]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed.length]);

  // Lista de destinatarios para el selector: presentes excepto yo.
  const otherMembers = members.filter((m) => m.id !== currentUserId);
  const narratorPresent = members.some(
    (m) => m.role === "NARRATOR" && m.id !== currentUserId
  );
  const iAmNarrator = myRole === "NARRATOR";

  function parseRecipient():
    | import("~/lib/socket/types").ChatRecipient
    | undefined {
    if (recipientValue === "all") return undefined; // default
    if (recipientValue === "narrator") {
      return { kind: "narrator", userId: null };
    }
    if (recipientValue.startsWith("user:")) {
      const uid = recipientValue.slice(5);
      return { kind: "user", userId: uid };
    }
    return undefined;
  }

  function parseSpeaker():
    | import("~/lib/socket/types").ChatSpeakerInput
    | undefined {
    if (speakerValue === "self") return undefined; // default
    if (speakerValue.startsWith("char:")) {
      return { kind: "character", characterId: speakerValue.slice(5) };
    }
    return undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    const ok = await onSend(text, parseRecipient(), parseSpeaker());
    if (ok) setText("");
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-gutter-stable themed-scrollbar px-3 py-2 space-y-2"
      >
        {feed.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            La conversación aún no ha comenzado.
          </p>
        ) : (
          feed.map((item, i) =>
            item._t === "chat" ? (
              <ChatMessageRow
                key={item.id ?? i}
                item={item}
                currentUserId={currentUserId}
                members={members}
              />
            ) : (
              <SheetAnnouncementRow key={item.id ?? i} item={item} />
            )
          )
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border-t border-border bg-background/30 p-2"
      >
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder={
              disabled
                ? "Conectando..."
                : recipientValue === "all"
                  ? "Escribe un mensaje..."
                  : recipientValue === "narrator"
                    ? "Mensaje privado al narrador..."
                    : "Susurro..."
            }
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
        </div>
        <div className="flex flex-wrap gap-1">
          <select
            value={speakerValue}
            onChange={(e) => setSpeakerValue(e.target.value)}
            disabled={disabled}
            aria-label="Hablar como"
            className={cn(SELECT_DARK_CLASS, "h-7 text-xs flex-1 min-w-0")}
          >
            <option value="self">Hablar como yo (nick)</option>
            {myCharacters.length > 0 ? (
              <optgroup label="Hablar como personaje">
                {myCharacters.map((c) => (
                  <option key={c.id} value={`char:${c.id}`}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <select
            value={recipientValue}
            onChange={(e) => setRecipientValue(e.target.value)}
            disabled={disabled}
            aria-label="Destinatario del mensaje"
            className={cn(SELECT_DARK_CLASS, "h-7 text-xs flex-1 min-w-0")}
          >
            <option value="all">A todos</option>
            {!iAmNarrator && narratorPresent ? (
              <option value="narrator">Al narrador (privado)</option>
            ) : null}
            {otherMembers.length > 0 ? (
              <optgroup label="Susurrar a">
                {otherMembers.map((m) => {
                  const display =
                    m.nickname?.trim() ||
                    m.email?.split("@")[0] ||
                    m.id;
                  const label =
                    display + (m.role === "NARRATOR" ? " · narrador" : "");
                  return (
                    <option key={m.id} value={`user:${m.id}`}>
                      {label}
                    </option>
                  );
                })}
              </optgroup>
            ) : null}
          </select>
        </div>
      </form>
    </div>
  );
}

function ChatMessageRow({
  item,
  currentUserId,
  members,
}: {
  item: Extract<FeedItem, { _t: "chat" }>;
  currentUserId: string | null;
  members: ReturnType<typeof useTable>["members"];
}) {
  const recipient = item.recipient;
  const isPrivate = recipient && recipient.kind !== "all";
  const isMine = item.userId === currentUserId;
  const isNarratorChannel = recipient?.kind === "narrator";

  // Identidad mostrada. Por defecto el server manda `speaker`. Si no
  // viene (compatibilidad con mensajes antiguos), caemos al nickname del
  // miembro presente o al local-part del email.
  const memberOfAuthor = members.find((m) => m.id === item.userId);
  const fallbackName =
    memberOfAuthor?.nickname?.trim() ||
    item.email?.split("@")[0] ||
    "Desconocido";
  const speakerName = item.speaker?.name ?? fallbackName;
  const speakingAsCharacter = item.speaker?.kind === "character";

  // Texto descriptivo del destinatario (visible solo en mensajes privados).
  let target: string | null = null;
  if (isNarratorChannel) {
    target = isMine ? "Al narrador" : "Del jugador al narrador";
  } else if (recipient?.kind === "user" && recipient.userId) {
    const otherId = isMine ? recipient.userId : item.userId;
    const other = members.find((m) => m.id === otherId);
    const label =
      other?.nickname?.trim() ||
      other?.email?.split("@")[0] ||
      "alguien";
    target = isMine ? `Susurro a ${label}` : `Susurro de ${label}`;
  }

  return (
    <div
      className={cn(
        "text-sm",
        isPrivate &&
          "rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5"
      )}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-heading text-xs uppercase tracking-wider",
            speakingAsCharacter ? "text-blood" : "text-foreground/90",
          )}
          title={speakingAsCharacter ? `Habla como personaje · usuario: ${fallbackName}` : undefined}
        >
          {speakerName}
        </span>
        {speakingAsCharacter ? (
          <span className="rounded-sm bg-blood/15 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-wider text-blood">
            PJ
          </span>
        ) : null}
        {target ? (
          <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-wider text-amber-300">
            {target}
          </span>
        ) : null}
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
