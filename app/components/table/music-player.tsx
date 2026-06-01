import {
  FileAudio,
  Library,
  ListMinus,
  Loader2,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipForward,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { useContextMenu } from "~/components/common/context-menu";
import type { LoopMode, MusicState, TrackInfo } from "~/lib/socket/types";
import type { ChronicleMemberRole } from "~/lib/socket/types";
import {
  clearPlaylist,
  deleteTrackFile,
  getTrackStreamUrl,
  notifyTrackEnded,
  pauseMusic,
  playAt,
  removeFromPlaylist,
  resumeMusic,
  setLoopMode,
  skipMusic,
  stopMusic,
} from "~/lib/api/music/music.api";
import { AudioLibraryModal } from "~/components/table/audio-library-modal";
import { cn } from "~/lib/utils";
import { useConfirm } from "~/hooks/use-confirm";

interface MusicPlayerProps {
  chronicleId: string;
  musicState: MusicState | null;
  myRole: ChronicleMemberRole | string | null;
  onStateChange?: (state: MusicState) => void;
}

const EMPTY_STATE: MusicState = {
  chronicleId: "",
  status: "idle",
  loop: "none",
  currentTrack: null,
  currentIndex: -1,
  playlist: [],
  startedAt: null,
  pausedAt: null,
};

const LOOP_LABELS: Record<LoopMode, { label: string; desc: string }> = {
  none: { label: "Sin repetición", desc: "Click para repetir toda la playlist." },
  all:  { label: "Repetir lista",  desc: "Click para repetir solo el track actual." },
  one:  { label: "Repetir track",  desc: "Click para desactivar la repetición." },
};

export function MusicPlayer({
  chronicleId,
  musicState,
  myRole,
  onStateChange,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNarrator = myRole === "NARRATOR";
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { onContextMenu, menu: contextMenu } = useContextMenu();

  const state: MusicState = musicState ?? EMPTY_STATE;
  const { status, loop, currentIndex, playlist } = state;

  // ── Sincronizar el <audio> ────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (status === "playing" && state.currentTrack) {
      const newSrc = getTrackStreamUrl(chronicleId, state.currentTrack.filename);
      if (audio.src !== newSrc) {
        audio.src = newSrc;
        audio.load();
        audio.play().catch(() => {});
      } else if (audio.paused) {
        audio.play().catch(() => {});
      }
    } else if (status === "paused") {
      audio.pause();
    } else if (status === "idle") {
      audio.pause();
      audio.src = "";
    }

    // Cuando el track termina, notificar al servidor para que
    // decida qué reproducir según el modo loop.
    const handleEnded = () => {
      notifyTrackEnded(chronicleId)
        .then((next) => onStateChange?.(next))
        .catch(() => {});
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, state.currentIndex, state.currentTrack?.filename]);

  // ── Helpers ───────────────────────────────────────────────
  async function call(fn: () => Promise<MusicState>) {
    setLoading(true);
    setError(null);
    try {
      const next = await fn();
      onStateChange?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al controlar la música");
    } finally {
      setLoading(false);
    }
  }

  // ── Loop ─────────────────────────────────────────────────
  const LOOP_CYCLE: LoopMode[] = ["none", "all", "one"];
  function handleLoopCycle() {
    const next = LOOP_CYCLE[(LOOP_CYCLE.indexOf(loop) + 1) % LOOP_CYCLE.length];
    void call(() => setLoopMode(chronicleId, next));
  }

  // ── Playlist clear ────────────────────────────────────────
  async function handleClear() {
    const ok = await confirm({
      title: "¿Limpiar playlist?",
      description: "Los tracks se sacan de la sesión pero los archivos se conservan en el servidor.",
      confirmLabel: "Limpiar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    await call(() => clearPlaylist(chronicleId));
  }

  // ── Quitar de playlist (sin borrar archivo) ───────────────
  async function handleRemove(index: number) {
    await call(() => removeFromPlaylist(chronicleId, index));
  }

  // ── Borrar archivo del servidor ───────────────────────────
  async function handleDeleteFromServer(track: TrackInfo, index: number) {
    const ok = await confirm({
      title: `¿Borrar "${track.title}" del servidor?`,
      description: "El archivo se eliminará permanentemente. Esta acción no se puede deshacer.",
      confirmLabel: "Borrar archivo",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    // Primero sacar de playlist (para actualizar estado), luego borrar en servidor
    await call(() => deleteTrackFile(chronicleId, track.filename));
  }

  // ── Menú contextual de un track en la playlist ───────────
  function buildTrackMenu(track: TrackInfo, idx: number) {
    const isActive = idx === currentIndex;
    const items = [];

    if (isNarrator) {
      items.push({
        label: isActive && status === "playing" ? "Reproduciendo…" : "Reproducir ahora",
        icon: <Play />,
        onClick: () => { void call(() => playAt(chronicleId, idx)); },
        disabled: isActive && status === "playing",
      });
    }

    if (isNarrator && isActive) {
      if (status === "playing") {
        items.push({
          label: "Pausar",
          icon: <Pause />,
          onClick: () => { void call(() => pauseMusic(chronicleId)); },
        });
      } else if (status === "paused") {
        items.push({
          label: "Reanudar",
          icon: <Play />,
          onClick: () => { void call(() => resumeMusic(chronicleId)); },
        });
      }
      if (status !== "idle") {
        items.push({
          label: "Detener",
          icon: <Square />,
          onClick: () => { void call(() => stopMusic(chronicleId)); },
        });
      }
    }

    if (isNarrator) {
      const isLoopingThis = isActive && loop === "one";
      items.push({
        label: isLoopingThis ? "Quitar loop de este track" : "Loop solo este track",
        icon: <Repeat1 />,
        separator: items.length > 0,
        onClick: () => {
          void call(() => setLoopMode(chronicleId, isLoopingThis ? "none" : "one"));
          if (!isLoopingThis) void call(() => playAt(chronicleId, idx));
        },
      });

      items.push({
        label: "Quitar de playlist",
        icon: <ListMinus />,
        separator: true,
        onClick: () => { void handleRemove(idx); },
      });
      items.push({
        label: "Borrar del servidor",
        icon: <Trash2 />,
        danger: true,
        onClick: () => { void handleDeleteFromServer(track, idx); },
      });
    }

    return items;
  }

  return (
    <div className="w-full space-y-3">
      <audio ref={audioRef} className="hidden" preload="auto" />

      {/* Header + controles */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Music className="size-4 text-blood" />
          <span className="font-heading text-xs uppercase tracking-wider text-foreground">
            Música
          </span>
          <StatusBadge status={status} />
        </div>

        {isNarrator && (
          <div className="flex items-center gap-1">
            {/* Loop — siempre visible para el narrador */}
            <Tooltip
              title={LOOP_LABELS[loop].label}
              content={LOOP_LABELS[loop].desc}
              side="bottom"
            >
              <Button
                size="icon"
                variant="ghost"
                className={cn("size-7", loop !== "none" && "text-blood")}
                disabled={loading}
                onClick={handleLoopCycle}
              >
                {loop === "one"
                  ? <Repeat1 className="size-3.5" />
                  : <Repeat className="size-3.5" />}
              </Button>
            </Tooltip>

            {status === "playing" ? (
              <Tooltip title="Pausar" content="Pausa para todos." side="bottom">
                <Button size="icon" variant="ghost" className="size-7" disabled={loading}
                  onClick={() => call(() => pauseMusic(chronicleId))}>
                  <Pause className="size-3.5" />
                </Button>
              </Tooltip>
            ) : status === "paused" ? (
              <Tooltip title="Reanudar" content="Reanuda desde donde se pausó." side="bottom">
                <Button size="icon" variant="ghost" className="size-7" disabled={loading}
                  onClick={() => call(() => resumeMusic(chronicleId))}>
                  <Play className="size-3.5" />
                </Button>
              </Tooltip>
            ) : null}

            {playlist.length > 1 && (
              <Tooltip title="Siguiente" content="Salta al siguiente track." side="bottom">
                <Button size="icon" variant="ghost" className="size-7" disabled={loading}
                  onClick={() => call(() => skipMusic(chronicleId))}>
                  <SkipForward className="size-3.5" />
                </Button>
              </Tooltip>
            )}

            {status !== "idle" && (
              <Tooltip title="Detener" content="Detiene la música. La playlist se mantiene." side="bottom">
                <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-blood"
                  disabled={loading} onClick={() => call(() => stopMusic(chronicleId))}>
                  <Square className="size-3.5" />
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Track actual */}
      {state.currentTrack && (
        <div className="flex items-center gap-2 rounded-md border border-blood/30 bg-blood/5 px-2 py-1.5">
          <FileAudio className="size-6 shrink-0 text-blood/60" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {state.currentTrack.title}
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              {state.currentTrack.duration
                ? formatDuration(state.currentTrack.duration)
                : formatBytes(state.currentTrack.size)}
            </p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-widest",
            status === "playing" && "bg-emerald-500/20 text-emerald-400",
            status === "paused" && "bg-amber-500/20 text-amber-400",
          )}>
            {status === "playing" ? "▶" : "⏸"}
          </span>
        </div>
      )}

      {error && <p className="text-xs italic text-blood">{error}</p>}

      {/* Botón biblioteca */}
      <Button
        size="sm"
        onClick={() => setLibraryOpen(true)}
        disabled={loading}
        className="h-8 w-full gap-2 bg-blood px-3 text-blood-foreground hover:bg-blood/90"
      >
        {loading
          ? <><Loader2 className="size-3.5 animate-spin" />Procesando…</>
          : <><Library className="size-3.5" />Biblioteca de audio</>}
      </Button>

      {/* Modal biblioteca */}
      <AudioLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        chronicleId={chronicleId}
        onPlaylistChanged={() => {
          // El servidor emitirá music:state via WS — no hace falta fetch manual
        }}
      />

      {/* Playlist */}
      {playlist.length > 0 && (
        <div className="rounded-md border border-border/50 bg-card/30">
          <div className="flex items-center justify-between border-b border-border/40 px-2 py-1">
            <span className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">
              Playlist · {playlist.length} {playlist.length === 1 ? "tema" : "temas"}
            </span>
            {isNarrator && (
              <Tooltip title="Limpiar playlist" content="Quita todos los tracks de la sesión sin borrar archivos." side="left">
                <button
                  type="button"
                  onClick={() => void handleClear()}
                  disabled={loading}
                  className="rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-blood disabled:opacity-40"
                >
                  <X className="size-3" />
                </button>
              </Tooltip>
            )}
          </div>

          <ul className="max-h-52 overflow-y-auto themed-scrollbar">
            {playlist.map((track, idx) => {
              const isActive = idx === currentIndex;
              return (
                <li
                  key={`${track.id}-${idx}`}
                  onContextMenu={onContextMenu(buildTrackMenu(track, idx))}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-blood/15 text-foreground"
                      : "text-muted-foreground hover:bg-blood/5 hover:text-foreground",
                  )}
                >
                  {/* Play / número */}
                  <div className="w-5 shrink-0 text-center">
                    {isNarrator ? (
                      <button
                        type="button"
                        onClick={() => call(() => playAt(chronicleId, idx))}
                        disabled={loading || (isActive && status === "playing")}
                        className={cn(
                          "rounded transition-colors",
                          isActive && status === "playing"
                            ? "cursor-default text-blood"
                            : "text-muted-foreground/40 hover:text-blood",
                        )}
                      >
                        {isActive && status === "playing"
                          ? <span className="font-heading text-[10px] text-blood">▶</span>
                          : <Play className="size-3" />}
                      </button>
                    ) : (
                      <span className={cn(
                        "font-heading text-[10px]",
                        isActive ? "text-blood" : "text-muted-foreground/50",
                      )}>
                        {isActive ? "▶" : idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Ícono */}
                  <FileAudio className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-blood/70" : "text-muted-foreground/30",
                  )} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate", isActive && "font-medium text-foreground")}>
                      {track.title}
                    </p>
                  </div>

                  {/* Duración / tamaño */}
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">
                    {track.duration ? formatDuration(track.duration) : formatBytes(track.size)}
                  </span>

                  {/* Acciones narrador — visibles en hover */}
                  {isNarrator && (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip title="Quitar de playlist" content="El archivo se conserva en el servidor." side="left">
                        <button
                          type="button"
                          onClick={() => void handleRemove(idx)}
                          disabled={loading}
                          className="rounded p-0.5 text-muted-foreground/40 hover:text-amber-400 disabled:opacity-40"
                        >
                          <ListMinus className="size-3" />
                        </button>
                      </Tooltip>
                      <Tooltip title="Borrar del servidor" content="Elimina el archivo permanentemente." side="left">
                        <button
                          type="button"
                          onClick={() => void handleDeleteFromServer(track, idx)}
                          disabled={loading}
                          className="rounded p-0.5 text-muted-foreground/40 hover:text-blood disabled:opacity-40"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Volumen local */}
      <div className="space-y-1">
        <span className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">
          Volumen local
        </span>
        <input
          type="range"
          min="0"
          max="100"
          defaultValue="70"
          onChange={(e) => {
            const val = parseInt(e.currentTarget.value);
            if (audioRef.current) audioRef.current.volume = val / 100;
            e.currentTarget.style.background = `linear-gradient(to right, var(--blood) ${val}%, color-mix(in oklch, var(--blood) 30%, var(--border)) ${val}%)`;
          }}
          style={{
            background: "linear-gradient(to right, var(--blood) 70%, color-mix(in oklch, var(--blood) 30%, var(--border)) 70%)",
          }}
          className="blood-slider"
        />
      </div>

      {confirmDialog}
      {contextMenu}
    </div>
  );
}

function StatusBadge({ status }: { status: MusicState["status"] }) {
  if (status === "playing")
    return <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-widest text-emerald-400">▶ Reproduciendo</span>;
  if (status === "paused")
    return <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-widest text-amber-400">⏸ En pausa</span>;
  return <span className="rounded-full bg-muted/30 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-widest text-muted-foreground">⏹ Detenida</span>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

