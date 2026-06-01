import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  FileAudio,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useContextMenu } from "~/components/common/context-menu";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/hooks/use-confirm";
import {
  addLibraryTrackToPlaylist,
  createFolder,
  deleteFolder,
  deleteLibraryTrack,
  getLibraryTrackUrl,
  listCommunityTracks,
  listFolders,
  listMyTracks,
  moveTrack,
  renameFolder,
  reorderFolders,
  uploadLibraryTrack,
  type UploadTrackMeta,
} from "~/lib/api/audio-library/audio-library.api";
import type { AudioFolder, AudioTrack } from "~/lib/api/audio-library/audio-library.types";
import { cn } from "~/lib/utils";

interface AudioLibraryModalProps {
  open: boolean;
  onClose: () => void;
  chronicleId: string;
  onPlaylistChanged?: () => void;
}

type Tab = "mine" | "community";
const ACCEPTED = ".mp3,.ogg,.opus,.mp4,.m4a,.aac,.wav,.flac,.webm";

const inputCls =
  "h-8 w-full rounded-md border border-input bg-input/30 px-2.5 text-xs placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood disabled:opacity-50";

// ─── Utilidades ──────────────────────────────────────────────────────────────

function formatBytes(b: number) {
  return b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;
}
function stripExt(n: string) { return n.replace(/\.[^/.]+$/, ""); }

// ─── Sub-componente: fila de track ───────────────────────────────────────────

function TrackRow({
  track,
  draggable,
  onDragStart,
  onAddToPlaylist,
  onDelete,
  addingId,
  onContextMenu: onCtxMenu,
}: {
  track: AudioTrack;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, track: AudioTrack) => void;
  onAddToPlaylist: (track: AudioTrack) => void;
  onDelete?: (track: AudioTrack) => void;
  addingId: string | null;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const isAdding = addingId === track.id;
  return (
    <div
      draggable={draggable}
      onDragStart={draggable && onDragStart ? (e) => onDragStart(e, track) : undefined}
      onContextMenu={onCtxMenu}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
        "hover:bg-blood/5",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <FileAudio className="size-3.5 shrink-0 text-muted-foreground/50" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{track.title}</p>
        {track.user && (
          <p className="truncate text-[10px] text-muted-foreground/50">
            {track.user.nickname}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground/50">
        {formatBytes(track.size)}
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(track)}
            className="rounded p-0.5 text-muted-foreground/30 hover:text-blood"
            title="Eliminar"
          >
            <Trash2 className="size-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onAddToPlaylist(track)}
          disabled={isAdding}
          className="flex items-center gap-1 rounded bg-blood/80 px-1.5 py-0.5 font-heading text-[9px] uppercase tracking-wider text-blood-foreground hover:bg-blood disabled:opacity-50"
        >
          {isAdding ? <Loader2 className="size-2.5 animate-spin" /> : <Plus className="size-2.5" />}
          Playlist
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function AudioLibraryModal({
  open,
  onClose,
  chronicleId,
  onPlaylistChanged,
}: AudioLibraryModalProps) {
  const [tab, setTab] = useState<Tab>("mine");

  // Estado "mine"
  const [folders, setFolders] = useState<AudioFolder[]>([]);
  const [looseTracks, setLooseTracks] = useState<AudioTrack[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchMine, setSearchMine] = useState("");

  // Estado "community"
  const [communityTracks, setCommunityTracks] = useState<AudioTrack[]>([]);
  const [searchCommunity, setSearchCommunity] = useState("");

  // Folder inline edit
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  // Nueva carpeta
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadTrackMeta>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>();

  // Drag & drop
  const [draggingTrack, setDraggingTrack] = useState<AudioTrack | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Loading / adding
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { confirm, dialog: confirmDialog } = useConfirm();
  const { onContextMenu, menu: contextMenu } = useContextMenu();

  // ── Cargar datos ────────────────────────────────────────
  const loadMine = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [foldersData, allTracks] = await Promise.all([
        listFolders(),
        listMyTracks(q),
      ]);
      setFolders(foldersData);
      const folderTrackIds = new Set(foldersData.flatMap(f => f.tracks.map(t => t.id)));
      setLooseTracks(allTracks.filter(t => !folderTrackIds.has(t.id)));
    } catch {
      setError("No se pudo cargar la biblioteca.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommunity = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      setCommunityTracks(await listCommunityTracks(q));
    } catch {
      setError("No se pudo cargar los tracks de la comunidad.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (tab === "mine") void loadMine(searchMine || undefined);
    else void loadCommunity(searchCommunity || undefined);
  }, [open, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Búsqueda con debounce
  useEffect(() => {
    if (!open || tab !== "mine") return;
    const t = setTimeout(() => void loadMine(searchMine || undefined), 300);
    return () => clearTimeout(t);
  }, [searchMine]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || tab !== "community") return;
    const t = setTimeout(() => void loadCommunity(searchCommunity || undefined), 300);
    return () => clearTimeout(t);
  }, [searchCommunity]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carpetas ────────────────────────────────────────────
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const folder = await createFolder(newFolderName.trim());
      setFolders(prev => [...prev, folder]);
      setNewFolderName("");
      setCreatingFolder(false);
      setExpandedFolders(prev => new Set([...prev, folder.id]));
    } catch { setError("No se pudo crear la carpeta."); }
  }

  async function handleRenameFolder(id: string) {
    if (!editingFolderName.trim()) return;
    try {
      const updated = await renameFolder(id, editingFolderName.trim());
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: updated.name } : f));
      setEditingFolderId(null);
    } catch { setError("No se pudo renombrar la carpeta."); }
  }

  async function handleDeleteFolder(folder: AudioFolder) {
    const ok = await confirm({
      title: `¿Eliminar carpeta "${folder.name}"?`,
      description: "Los audios quedarán sin carpeta. No se borran del servidor.",
      confirmLabel: "Eliminar carpeta",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteFolder(folder.id);
      setFolders(prev => prev.filter(f => f.id !== folder.id));
      setLooseTracks(prev => [
        ...prev,
        ...folder.tracks,
      ]);
    } catch { setError("No se pudo eliminar la carpeta."); }
  }

  // ── Drag & Drop ─────────────────────────────────────────
  function onDragStart(e: React.DragEvent, track: AudioTrack) {
    setDraggingTrack(track);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOverFolder(e: React.DragEvent, folderId: string | null) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId ?? "__loose__");
  }

  async function onDropOnFolder(folderId: string | null) {
    setDragOverFolderId(null);
    if (!draggingTrack || draggingTrack.folderId === folderId) {
      setDraggingTrack(null);
      return;
    }
    try {
      await moveTrack(draggingTrack.id, folderId);
      await loadMine(searchMine || undefined);
    } catch { setError("No se pudo mover el track."); }
    setDraggingTrack(null);
  }

  // ── Upload ───────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, folderId?: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingFile(file);
    setUploadMeta({ title: stripExt(file.name), folderId });
    setTargetFolderId(folderId);
    setShowUploadForm(true);
  }

  async function handleUploadConfirm() {
    if (!pendingFile) return;
    setShowUploadForm(false);
    const file = pendingFile;
    const meta = { ...uploadMeta, folderId: targetFolderId };
    setPendingFile(null);
    setUploadMeta({});
    setLoading(true);
    try {
      await uploadLibraryTrack(file, meta);
      await loadMine(searchMine || undefined);
    } catch { setError("No se pudo subir el archivo."); }
    finally { setLoading(false); }
  }

  // ── Eliminar track ───────────────────────────────────────
  async function handleDeleteTrack(track: AudioTrack) {
    const ok = await confirm({
      title: `¿Borrar "${track.title}"?`,
      description: "El archivo se eliminará permanentemente del servidor.",
      confirmLabel: "Borrar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteLibraryTrack(track.id);
      await loadMine(searchMine || undefined);
    } catch { setError("No se pudo eliminar el track."); }
  }

  // ── Agregar a playlist ───────────────────────────────────
  async function handleAddToPlaylist(track: AudioTrack) {
    setAddingId(track.id);
    try {
      await addLibraryTrackToPlaylist(chronicleId, track.id);
      onPlaylistChanged?.();
    } catch { setError("No se pudo agregar a la playlist."); }
    finally { setAddingId(null); }
  }

  function buildTrackCtxMenu(track: AudioTrack, canDelete: boolean) {
    return onContextMenu([
      {
        label: "Agregar a playlist",
        icon: <Plus />,
        onClick: () => void handleAddToPlaylist(track),
      },
      ...(canDelete ? [{
        label: "Eliminar del servidor",
        icon: <Trash2 />,
        danger: true,
        separator: true,
        onClick: () => void handleDeleteTrack(track),
      }] : []),
    ]);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative z-10 flex h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="font-heading text-sm uppercase tracking-widest text-foreground">
            Biblioteca de Audio
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/60">
          {(["mine", "community"] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 font-heading text-[10px] uppercase tracking-widest transition-colors",
                tab === t
                  ? "border-b-2 border-blood text-blood"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "community" && <Users className="size-3" />}
              {t === "mine" ? "Mis audios" : "Comunidad"}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {error && (
            <p className="border-b border-blood/20 bg-blood/5 px-4 py-2 text-xs italic text-blood">
              {error}
            </p>
          )}

          {/* ── Tab: Mis audios ── */}
          {tab === "mine" && (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    className={cn(inputCls, "pl-7")}
                    placeholder="Buscar en mis audios…"
                    value={searchMine}
                    onChange={e => setSearchMine(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCreatingFolder(true)}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-blood/50 hover:text-foreground"
                >
                  <Folder className="size-3" /> Nueva carpeta
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-blood px-2 py-1 text-[10px] text-blood-foreground hover:bg-blood/90 disabled:opacity-50"
                >
                  <Upload className="size-3" /> Subir
                </button>
                <input ref={fileInputRef} type="file" accept={ACCEPTED} className="hidden"
                  onChange={e => handleFileSelect(e)} />
              </div>

              {/* Form de nueva carpeta */}
              {creatingFolder && (
                <div className="flex items-center gap-2 border-b border-border/40 bg-card/60 px-3 py-2">
                  <Folder className="size-3.5 shrink-0 text-muted-foreground/50" />
                  <input
                    autoFocus
                    className={cn(inputCls, "flex-1")}
                    placeholder="Nombre de la carpeta…"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") void handleCreateFolder();
                      if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                    }}
                  />
                  <button type="button" onClick={() => void handleCreateFolder()}
                    className="rounded p-1 text-blood hover:text-blood/80"><Check className="size-3.5" /></button>
                  <button type="button" onClick={() => { setCreatingFolder(false); setNewFolderName(""); }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
                </div>
              )}

              {/* Form de upload */}
              {showUploadForm && pendingFile && (
                <div className="space-y-2 border-b border-blood/30 bg-blood/5 px-3 py-3">
                  <p className="font-heading text-[10px] uppercase tracking-widest text-blood">
                    Datos del audio — {pendingFile.name}
                  </p>
                  <input className={inputCls} placeholder="Nombre del track" value={uploadMeta.title ?? ""}
                    onChange={e => setUploadMeta(m => ({ ...m, title: e.target.value }))} />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 flex-1 gap-1.5 bg-blood text-blood-foreground hover:bg-blood/90"
                      onClick={() => void handleUploadConfirm()}>
                      <Upload className="size-3" /> Subir
                    </Button>
                    <Button size="sm" variant="outline" className="h-7"
                      onClick={() => { setShowUploadForm(false); setPendingFile(null); setUploadMeta({}); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de carpetas y tracks */}
              <div className="min-h-0 flex-1 overflow-y-auto themed-scrollbar px-2 py-2"
                onDragOver={e => onDragOverFolder(e, null)}
                onDrop={() => void onDropOnFolder(null)}
              >
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!loading && (
                  <>
                    {/* Carpetas */}
                    {folders.map(folder => (
                      <div key={folder.id} className="mb-1">
                        {/* Header carpeta */}
                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors",
                            dragOverFolderId === folder.id && "bg-blood/10 ring-1 ring-blood/30",
                          )}
                          onDragOver={e => onDragOverFolder(e, folder.id)}
                          onDragLeave={() => setDragOverFolderId(null)}
                          onDrop={() => void onDropOnFolder(folder.id)}
                        >
                          <button type="button"
                            onClick={() => setExpandedFolders(prev => {
                              const n = new Set(prev);
                              n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id);
                              return n;
                            })}
                            className="flex flex-1 items-center gap-1.5 text-left"
                          >
                            {expandedFolders.has(folder.id)
                              ? <ChevronDown className="size-3 shrink-0 text-muted-foreground/60" />
                              : <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />}
                            {expandedFolders.has(folder.id)
                              ? <FolderOpen className="size-3.5 shrink-0 text-blood/60" />
                              : <Folder className="size-3.5 shrink-0 text-muted-foreground/50" />}

                            {editingFolderId === folder.id ? (
                              <input autoFocus className={cn(inputCls, "h-6 flex-1 text-[11px]")}
                                value={editingFolderName}
                                onChange={e => setEditingFolderName(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                  if (e.key === "Enter") void handleRenameFolder(folder.id);
                                  if (e.key === "Escape") setEditingFolderId(null);
                                }} />
                            ) : (
                              <span className="flex-1 truncate text-xs font-medium text-foreground">
                                {folder.name}
                                <span className="ml-1 text-[10px] font-normal text-muted-foreground/50">
                                  ({folder.tracks.length})
                                </span>
                              </span>
                            )}
                          </button>

                          {/* Acciones carpeta */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 [div:hover>&]:opacity-100">
                            <button type="button" title="Subir audio a esta carpeta"
                              onClick={() => {
                                setTargetFolderId(folder.id);
                                fileInputRef.current?.click();
                              }}
                              className="rounded p-0.5 text-muted-foreground/40 hover:text-blood">
                              <Upload className="size-3" />
                            </button>
                            {editingFolderId === folder.id ? (
                              <button type="button" onClick={() => void handleRenameFolder(folder.id)}
                                className="rounded p-0.5 text-blood hover:text-blood/80">
                                <Check className="size-3" />
                              </button>
                            ) : (
                              <button type="button"
                                onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                                className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground">
                                <Edit2 className="size-3" />
                              </button>
                            )}
                            <button type="button" onClick={() => void handleDeleteFolder(folder)}
                              className="rounded p-0.5 text-muted-foreground/40 hover:text-blood">
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>

                        {/* Tracks de la carpeta */}
                        {expandedFolders.has(folder.id) && (
                          <div className="ml-5 border-l border-border/30 pl-2">
                            {folder.tracks.length === 0 && (
                              <p className="py-2 text-[10px] italic text-muted-foreground/40">
                                Arrastra audios aquí o usa el ícono de subida
                              </p>
                            )}
                            {folder.tracks.map(track => (
                              <TrackRow key={track.id} track={track} draggable
                                onDragStart={onDragStart}
                                onAddToPlaylist={handleAddToPlaylist}
                                onDelete={handleDeleteTrack}
                                addingId={addingId}
                                onContextMenu={buildTrackCtxMenu(track, true)} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Tracks sin carpeta */}
                    {looseTracks.length > 0 && (
                      <div
                        className={cn(
                          "mt-1 rounded-md p-1 transition-colors",
                          dragOverFolderId === "__loose__" && "bg-blood/5 ring-1 ring-blood/20",
                        )}
                        onDragOver={e => onDragOverFolder(e, null)}
                        onDragLeave={() => setDragOverFolderId(null)}
                        onDrop={() => void onDropOnFolder(null)}
                      >
                        <p className="mb-1 px-1 font-heading text-[9px] uppercase tracking-widest text-muted-foreground/50">
                          Sin carpeta
                        </p>
                        {looseTracks.map(track => (
                          <TrackRow key={track.id} track={track} draggable
                            onDragStart={onDragStart}
                            onAddToPlaylist={handleAddToPlaylist}
                            onDelete={handleDeleteTrack}
                            addingId={addingId}
                            onContextMenu={buildTrackCtxMenu(track, true)} />
                        ))}
                      </div>
                    )}

                    {folders.length === 0 && looseTracks.length === 0 && !loading && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileAudio className="mb-3 size-8 text-muted-foreground/20" />
                        <p className="text-xs text-muted-foreground/50">
                          Aún no tienes audios en tu biblioteca.
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/30">
                          Usa el botón «Subir» para agregar tu primer track.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Comunidad ── */}
          {tab === "community" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border/40 px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    className={cn(inputCls, "pl-7")}
                    placeholder="Buscar en la comunidad…"
                    value={searchCommunity}
                    onChange={e => setSearchCommunity(e.target.value)}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto themed-scrollbar px-2 py-2">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading && communityTracks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="mb-3 size-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground/50">
                      No hay tracks públicos {searchCommunity ? "que coincidan" : "todavía"}.
                    </p>
                  </div>
                )}
                {!loading && communityTracks.map(track => (
                  <TrackRow key={track.id} track={track}
                    onAddToPlaylist={handleAddToPlaylist}
                    addingId={addingId}
                    onContextMenu={buildTrackCtxMenu(track, false)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmDialog}
      {contextMenu}
    </div>
  );
}
