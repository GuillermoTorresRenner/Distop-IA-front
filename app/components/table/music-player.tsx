import {
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  SkipForward,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import type { MusicState } from "~/lib/socket/types";
import type { ChronicleMemberRole } from "~/lib/socket/types";
import {
  clearPlaylist,
  getMusicStreamUrl,
  pauseMusic,
  playAt,
  playMusic,
  queueMusic,
  removeFromPlaylist,
  resumeMusic,
  skipMusic,
  stopMusic,
} from "~/lib/api/music/music.api";
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
  currentTrack: null,
  currentIndex: -1,
  playlist: [],
  startedAt: null,
  pausedAt: null,
};

export function MusicPlayer({
  chronicleId,
  musicState,
  myRole,
  onStateChange,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNarrator = myRole === "NARRATOR";
  const { confirm, dialog: confirmDialog } = useConfirm();

  const state: MusicState = musicState ?? EMPTY_STATE;
  const { status, currentIndex, playlist } = state;
  const streamUrl = getMusicStreamUrl(chronicleId);

  // ── Sincronizar el <audio> con el estado del WS ──────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === "playing" && state.currentTrack) {
      const newSrc = `${streamUrl}?t=${state.startedAt ?? Date.now()}`;
      if (audio.src !== newSrc) {
        audio.src = newSrc;
        audio.load();
        audio.play().catch(() => {/* autoplay policy — el usuario interactuó */});
      }
    } else if (status === "paused") {
      audio.pause();
    } else if (status === "idle") {
      audio.pause();
      audio.src = "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, state.currentIndex, state.startedAt]);

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

  async function handleAdd(mode: "play" | "queue") {
    const url = urlInput.trim();
    if (!url) return;
    setUrlInput("");
    await call(() =>
      mode === "play"
        ? playMusic(chronicleId, url)
        : queueMusic(chronicleId, url)
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleAdd("queue");
  }

  async function handleClear() {
    const ok = await confirm({
      title: "¿Limpiar playlist?",
      description: "Se eliminarán todos los tracks y se detendrá la reproducción.",
      confirmLabel: "Limpiar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    await call(() => clearPlaylist(chronicleId));
  }

  return (
    <div className="w-full space-y-3">
      {/* Audio oculto */}
      <audio ref={audioRef} className="hidden" />

      {/* Header + estado */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Music className="size-4 text-blood" />
          <span className="font-heading text-xs uppercase tracking-wider text-foreground">
            Música
          </span>
          <StatusBadge status={status} />
        </div>

        {/* Controles del narrador */}
        {isNarrator && (
          <div className="flex items-center gap-1">
            {status === "playing" ? (
              <Tooltip title="Pausar" content="Pausa la reproducción para todos." side="bottom">
                <Button size="icon" variant="ghost" className="size-7"
                  disabled={loading} onClick={() => call(() => pauseMusic(chronicleId))}>
                  <Pause className="size-3.5" />
                </Button>
              </Tooltip>
            ) : status === "paused" ? (
              <Tooltip title="Reanudar" content="Reanuda desde donde se pausó." side="bottom">
                <Button size="icon" variant="ghost" className="size-7"
                  disabled={loading} onClick={() => call(() => resumeMusic(chronicleId))}>
                  <Play className="size-3.5" />
                </Button>
              </Tooltip>
            ) : null}

            {playlist.length > 0 && (
              <Tooltip title="Siguiente" content="Siguiente track en la playlist (en loop)." side="bottom">
                <Button size="icon" variant="ghost" className="size-7"
                  disabled={loading || playlist.length < 2}
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
          {state.currentTrack.thumbnail && (
            <img
              src={state.currentTrack.thumbnail}
              alt=""
              className="size-8 shrink-0 rounded object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {state.currentTrack.title}
            </p>
            {state.currentTrack.duration ? (
              <p className="text-[10px] text-muted-foreground">
                {formatDuration(state.currentTrack.duration)}
              </p>
            ) : null}
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

      {error ? (
        <p className="text-xs italic text-blood">{error}</p>
      ) : null}

      {/* Input URL */}
      <div className="flex gap-1.5">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="URL de YouTube..."
          disabled={loading}
          className="h-8 flex-1 rounded-md border border-input bg-input/30 px-2.5 text-xs placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
        />
        <Tooltip
          title="Reproducir"
          content="Agrega a la playlist y reproduce inmediatamente."
          side="bottom"
        >
          <Button
            size="sm"
            onClick={() => void handleAdd("play")}
            disabled={loading || !urlInput.trim()}
            className="h-8 bg-blood px-2.5 text-blood-foreground hover:bg-blood/90"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          </Button>
        </Tooltip>
        <Tooltip
          title="Agregar a playlist"
          content="Encola al final. Si el player está detenido, arranca."
          side="bottom"
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleAdd("queue")}
            disabled={loading || !urlInput.trim()}
            className="h-8 px-2.5"
          >
            <Plus className="size-3.5" />
          </Button>
        </Tooltip>
      </div>

      {/* Playlist */}
      {playlist.length > 0 && (
        <div className="rounded-md border border-border/50 bg-card/30">
          <div className="flex items-center justify-between border-b border-border/40 px-2 py-1">
            <span className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">
              Playlist · {playlist.length} {playlist.length === 1 ? "tema" : "temas"}
            </span>
            {isNarrator && playlist.length > 0 && (
              <Tooltip title="Limpiar playlist" content="Elimina todos los tracks." side="left">
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

          <ul className="max-h-48 overflow-y-auto themed-scrollbar">
            {playlist.map((track, idx) => {
              const isActive = idx === currentIndex;
              return (
                <li
                  key={`${track.videoId}-${idx}`}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-blood/15 text-foreground"
                      : "text-muted-foreground hover:bg-blood/5 hover:text-foreground"
                  )}
                >
                  {/* Número / botón play */}
                  <div className="shrink-0 w-5 text-center">
                    {isNarrator ? (
                      <button
                        type="button"
                        onClick={() => call(() => playAt(chronicleId, idx))}
                        disabled={loading || isActive && status === "playing"}
                        className={cn(
                          "rounded transition-colors",
                          isActive && status === "playing"
                            ? "text-blood cursor-default"
                            : "text-muted-foreground/40 hover:text-blood"
                        )}
                        title={isActive && status === "playing" ? "Reproduciendo" : "Reproducir este tema"}
                      >
                        {isActive && status === "playing" ? (
                          <span className="font-heading text-[10px] text-blood">▶</span>
                        ) : (
                          <Play className="size-3" />
                        )}
                      </button>
                    ) : (
                      <span className={cn(
                        "font-heading text-[10px]",
                        isActive ? "text-blood" : "text-muted-foreground/50"
                      )}>
                        {isActive ? "▶" : idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail pequeño */}
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="size-6 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="size-6 shrink-0 rounded bg-muted/30" />
                  )}

                  {/* Título */}
                  <span className={cn(
                    "flex-1 truncate",
                    isActive && "font-medium text-foreground"
                  )}>
                    {track.title}
                  </span>

                  {/* Duración */}
                  {track.duration ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground/60">
                      {formatDuration(track.duration)}
                    </span>
                  ) : null}

                  {/* Papelera (narrador) */}
                  {isNarrator && (
                    <button
                      type="button"
                      onClick={() => call(() => removeFromPlaylist(chronicleId, idx))}
                      disabled={loading}
                      className="shrink-0 rounded p-0.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-blood disabled:opacity-40"
                      title="Eliminar de la playlist"
                    >
                      <Trash2 className="size-3" />
                    </button>
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
    </div>
  );
}

function StatusBadge({ status }: { status: MusicState["status"] }) {
  if (status === "playing") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-widest text-emerald-400">
        ▶ Reproduciendo
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-widest text-amber-400">
        ⏸ Pausada
      </span>
    );
  }
  return (
    <span className="rounded-full bg-muted/30 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-widest text-muted-foreground">
      ⏹ Detenida
    </span>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
