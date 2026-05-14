import { Eye, EyeOff, Loader2, Palette, Save, X } from "lucide-react";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import {
  getBoard,
  saveBoard,
  uploadBoardFile,
} from "~/lib/api/board/board.api";
import { cn } from "~/lib/utils";

// El módulo importa Excalidraw (toca `window`), así que solo lo cargamos
// vía React.lazy una vez el modal está abierto.
const WhiteboardCanvas = lazy(
  () => import("./whiteboard-canvas.client")
);

/**
 * Subset serializable del `appState` de Excalidraw.
 *
 * Excalidraw incluye en `appState` campos no-serializables (ej. `collaborators`
 * que es un Map). Si los persistimos crudo y los rehidratamos desde la DB,
 * llegan como objetos planos y rompen el render con "collaborators.forEach is
 * not a function". Acá sanitizamos antes de enviar al back / por WS.
 *
 * Mantener sincronizado con el mismo whitelist en `whiteboard-canvas.client.tsx`.
 */
const APP_STATE_SAFE_KEYS = [
  "viewBackgroundColor",
  "gridSize",
  "gridStep",
  "zoom",
  "scrollX",
  "scrollY",
  "theme",
  "name",
  "exportBackground",
  "exportEmbedScene",
  "exportWithDarkMode",
  "exportScale",
  "fileHandle",
  "currentItemFontFamily",
  "currentItemFontSize",
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemFillStyle",
  "currentItemStrokeWidth",
  "currentItemStrokeStyle",
  "currentItemRoughness",
  "currentItemOpacity",
  "currentItemTextAlign",
  "currentItemStartArrowhead",
  "currentItemEndArrowhead",
  "currentItemRoundness",
] as const;

function sanitizeAppStateForPersist(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of APP_STATE_SAFE_KEYS) {
    if (key in raw) out[key] = raw[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

interface WhiteboardModalProps {
  chronicleId: string;
  isNarrator: boolean;
  /** Snapshot remoto recibido cuando boardShared = true. */
  boardShared: boolean;
  remoteBoard: {
    elements: unknown[];
    appState: Record<string, unknown> | null;
    fileRefs: Record<string, { url: string; mimeType: string }>;
  } | null;
  remoteBoardVersion: number;
  onShareToggle: (
    isShared: boolean
  ) => Promise<{ ok: boolean; isShared?: boolean; error?: string }>;
  onPushUpdate: (input: {
    elements: unknown[];
    appState?: Record<string, unknown>;
  }) => Promise<{ ok: boolean; broadcasted?: boolean; error?: string }>;
  onClose: () => void;
}

const PUSH_DEBOUNCE_MS = 500;

export function WhiteboardModal({
  chronicleId,
  isNarrator,
  boardShared,
  remoteBoard,
  remoteBoardVersion,
  onShareToggle,
  onPushUpdate,
  onClose,
}: WhiteboardModalProps) {
  // Lock scroll + esc.
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

  // ── Hidratación inicial ─────────────────────────────────
  const [hydrated, setHydrated] = useState(false);
  const [initialElements, setInitialElements] = useState<unknown[]>([]);
  const [initialAppState, setInitialAppState] = useState<
    Record<string, unknown> | null
  >(null);
  const [initialFileRefs, setInitialFileRefs] = useState<
    Record<string, { url: string; mimeType: string }>
  >({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // El narrador trae su pizarra desde la DB. Los jugadores parten vacíos y
    // se llenan con remoteBoard si está compartida.
    if (isNarrator) {
      getBoard(chronicleId)
        .then((board) => {
          if (!mounted) return;
          setInitialElements(board.elements ?? []);
          setInitialAppState(board.appState);
          setInitialFileRefs(board.fileRefs ?? {});
          setHydrated(true);
        })
        .catch((err) => {
          if (!mounted) return;
          setLoadError(
            err instanceof Error ? err.message : "No se pudo cargar la pizarra"
          );
          setHydrated(true);
        });
    } else {
      // Jugador: si hay snapshot compartido, lo usamos; si no, vacío.
      if (boardShared && remoteBoard) {
        setInitialElements(remoteBoard.elements);
        setInitialAppState(remoteBoard.appState);
        setInitialFileRefs(remoteBoard.fileRefs ?? {});
      }
      setHydrated(true);
    }
    return () => {
      mounted = false;
    };
    // Solo al abrir (chronicleId no cambia durante la vida del modal).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chronicleId, isNarrator]);

  // ── Estado del narrador ─────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [sharing, setSharing] = useState(false);
  const lastElementsRef = useRef<readonly unknown[]>([]);
  const lastAppStateRef = useRef<Record<string, unknown> | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Set de fileIds que ya intentamos subir (resueltos o fallidos). Evita
   * subidas duplicadas: cada `onChange` puede re-emitir los mismos files
   * y la API es idempotente igual, pero no queremos pegarle al back en cada
   * trazo.
   */
  const uploadedFileIdsRef = useRef<Set<string>>(new Set());

  // Sembramos con los fileRefs iniciales: lo que ya está persistido no
  // necesita re-subirse.
  useEffect(() => {
    for (const id of Object.keys(initialFileRefs)) {
      uploadedFileIdsRef.current.add(id);
    }
  }, [initialFileRefs]);

  const handleNarratorChange = useCallback(
    (
      elements: readonly unknown[],
      appState: Record<string, unknown>,
      files: Record<string, { id: string; dataURL: string; mimeType: string }>
    ) => {
      lastElementsRef.current = elements;
      lastAppStateRef.current = appState;

      // Detectar files nuevos y subirlos en background.
      for (const [fileId, f] of Object.entries(files ?? {})) {
        if (uploadedFileIdsRef.current.has(fileId)) continue;
        if (!f?.dataURL?.startsWith("data:")) continue;
        // Marcamos antes de await para evitar dobles disparos en re-render.
        uploadedFileIdsRef.current.add(fileId);
        void uploadBoardFile(chronicleId, fileId, f.dataURL).catch(() => {
          // Si falla (ej. tamaño excedido), permitimos reintentar quitándolo
          // del set; Excalidraw lo va a re-emitir en el próximo onChange.
          uploadedFileIdsRef.current.delete(fileId);
        });
      }

      // Si está compartida, empujamos snapshots con debounce a la sala.
      if (!boardShared) return;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        void onPushUpdate({
          elements: Array.from(elements),
          appState: sanitizeAppStateForPersist(appState),
        });
      }, PUSH_DEBOUNCE_MS);
    },
    [boardShared, chronicleId, onPushUpdate]
  );

  useEffect(() => {
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, []);

  async function handleSave() {
    if (!isNarrator || saving) return;
    setSaving(true);
    try {
      await saveBoard(chronicleId, {
        elements: Array.from(lastElementsRef.current),
        appState: sanitizeAppStateForPersist(lastAppStateRef.current),
      });
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleShare() {
    if (!isNarrator || sharing) return;
    setSharing(true);
    try {
      // Antes de compartir, guardamos snapshot actual para que los jugadores
      // hidraten con lo último (el broadcast incluye `elements` del back, que
      // refleja DB).
      if (!boardShared) {
        await saveBoard(chronicleId, {
          elements: Array.from(lastElementsRef.current),
          appState: sanitizeAppStateForPersist(lastAppStateRef.current),
        });
      }
      await onShareToggle(!boardShared);
    } finally {
      setSharing(false);
    }
  }

  // ── Estado del jugador (sigue el remoteBoard si está compartido) ──
  // Pasamos remoteBoard + version al canvas para que él haga updateScene.
  const remoteSnapshot =
    !isNarrator && boardShared && remoteBoard
      ? {
          elements: remoteBoard.elements,
          appState: remoteBoard.appState,
          fileRefs: remoteBoard.fileRefs,
          version: remoteBoardVersion,
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4">
      <div className="relative flex h-[95dvh] w-full max-w-6xl flex-col rounded-lg border border-border bg-card sm:h-[90dvh]">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-blood" />
            <h3 className="font-heading text-base uppercase tracking-wider">
              Pizarra
            </h3>
            {isNarrator ? null : boardShared ? (
              <span className="rounded-sm bg-emerald-500/20 px-1.5 py-0.5 font-heading text-[10px] uppercase tracking-wider text-emerald-300">
                En vivo
              </span>
            ) : (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-heading text-[10px] uppercase tracking-wider text-muted-foreground">
                Privada del narrador
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isNarrator ? (
              <>
                {savedHint ? (
                  <span className="text-xs text-emerald-400">Guardado</span>
                ) : null}
                <Tooltip
                  title="Guardar"
                  content="Guarda la pizarra en la crónica. Los cambios sobreviven aunque cierres el modal."
                  side="bottom"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-8 gap-1 text-xs"
                  >
                    {saving ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Save className="size-3" />
                    )}
                    Guardar
                  </Button>
                </Tooltip>
                <Tooltip
                  title={boardShared ? "Detener compartición" : "Compartir"}
                  content={
                    boardShared
                      ? "Vuelve a hacer la pizarra privada para ti. Los jugadores dejan de verla."
                      : "Empuja tu pizarra a toda la mesa en modo solo lectura. Los cambios que hagas se propagan en vivo."
                  }
                  side="bottom"
                >
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleToggleShare}
                    disabled={sharing}
                    className={cn(
                      "h-8 gap-1 text-xs",
                      boardShared
                        ? "bg-emerald-600 text-emerald-50 hover:bg-emerald-700"
                        : "bg-blood text-blood-foreground hover:bg-blood/90"
                    )}
                  >
                    {sharing ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : boardShared ? (
                      <EyeOff className="size-3" />
                    ) : (
                      <Eye className="size-3" />
                    )}
                    {boardShared ? "Compartiendo" : "Compartir"}
                  </Button>
                </Tooltip>
              </>
            ) : null}

            <Button type="button" size="icon" variant="ghost" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {!hydrated ? (
            <CenterMessage>
              <Loader2 className="size-6 animate-spin text-blood" />
              <p className="text-sm text-muted-foreground">
                Cargando pizarra...
              </p>
            </CenterMessage>
          ) : loadError ? (
            <CenterMessage>
              <p className="text-sm italic text-blood">{loadError}</p>
            </CenterMessage>
          ) : !isNarrator && !boardShared ? (
            <CenterMessage>
              <Palette className="size-10 text-blood/40" />
              <p className="text-sm italic text-muted-foreground">
                El narrador aún no está compartiendo la pizarra.
              </p>
            </CenterMessage>
          ) : (
            <Suspense
              fallback={
                <CenterMessage>
                  <Loader2 className="size-6 animate-spin text-blood" />
                  <p className="text-sm text-muted-foreground">
                    Inicializando lienzo...
                  </p>
                </CenterMessage>
              }
            >
              <div className="h-full w-full">
                <WhiteboardCanvas
                  initialElements={initialElements}
                  initialAppState={initialAppState}
                  initialFileRefs={initialFileRefs}
                  viewOnly={!isNarrator}
                  remoteSnapshot={remoteSnapshot}
                  onChange={isNarrator ? handleNarratorChange : undefined}
                  theme="dark"
                />
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      {children}
    </div>
  );
}
