import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownEditor } from "~/components/common/markdown-editor";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/hooks/use-confirm";
import { useMessages } from "~/hooks/use-messages";
import type {
  Conversation,
  DirectMessage,
} from "~/lib/api/messages/messages.types";
import type { UserSummary } from "~/lib/api/users/users.types";
import { resolveImageUrl } from "~/lib/image-url";
import { cn } from "~/lib/utils";

interface MessagesTabProps {
  /** Id del usuario logueado. Usado para alinear los mensajes propios a la derecha. */
  currentUserId: string;
}

function Avatar({ url, label, size = "size-9" }: { url: string | null; label: string; size?: string }) {
  return (
    <span
      className={cn(
        size,
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blood/20 text-sm font-semibold uppercase text-blood",
      )}
    >
      {url ? (
        <img
          src={resolveImageUrl(url) ?? undefined}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        (label || "?").charAt(0)
      )}
    </span>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function MessagesTab({ currentUserId }: MessagesTabProps) {
  const {
    conversations,
    loadConversation,
    send,
    remove,
    markRead,
    refreshConversations,
    socket,
  } = useMessages();
  const { confirm, dialog } = useConfirm();

  const [activePeer, setActivePeer] = useState<UserSummary | null>(null);
  const [thread, setThread] = useState<DirectMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  // Carga histórico al cambiar de peer + marca como leído.
  useEffect(() => {
    if (!activePeer) {
      setThread([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    loadConversation(activePeer.id)
      .then((msgs) => {
        if (!cancelled) {
          setThread(msgs);
          void markRead(activePeer.id);
        }
      })
      .catch(() => {
        if (!cancelled) setThread([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePeer, loadConversation, markRead]);

  // Live updates: cuando llega un mensaje del peer activo, lo apendamos
  // localmente (y marcamos read si está abierto). Mensajes para otros peers
  // se ignoran aquí — el hook ya refresca la lista de conversaciones.
  useEffect(() => {
    if (!activePeer || !socket) return;
    const onMessage = (msg: DirectMessage) => {
      const isThisThread =
        (msg.senderId === activePeer.id && msg.recipientId === currentUserId) ||
        (msg.recipientId === activePeer.id && msg.senderId === currentUserId);
      if (!isThisThread) return;
      setThread((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Si lo recibió el viewer y la conversación está abierta, marcar read.
      if (msg.recipientId === currentUserId) void markRead(activePeer.id);
    };
    const onDeleted = (msg: DirectMessage) => {
      setThread((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    };
    const onRead = (payload: { peerId: string; readIds: string[]; at: string }) => {
      // peerId = quien marcó como leído. Si soy el autor original, actualizo readAt.
      if (payload.peerId !== activePeer.id) return;
      setThread((prev) =>
        prev.map((m) =>
          payload.readIds.includes(m.id) ? { ...m, readAt: payload.at } : m,
        ),
      );
    };
    socket.on("dm:message", onMessage);
    socket.on("dm:deleted", onDeleted);
    socket.on("dm:read", onRead);
    return () => {
      socket.off("dm:message", onMessage);
      socket.off("dm:deleted", onDeleted);
      socket.off("dm:read", onRead);
    };
  }, [activePeer, currentUserId, markRead, socket]);

  // Autoscroll al fondo al cambiar el hilo o llegar mensajes nuevos.
  useEffect(() => {
    const el = threadScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length, activePeer?.id]);

  // Auto-selección: al entrar al tab sin conversación activa, pickeamos la
  // primera disponible (la más reciente con mensajes; si no, la primera amistad).
  useEffect(() => {
    if (activePeer || conversations.length === 0) return;
    const firstWithMessages =
      conversations.find((c) => c.lastMessage !== null) ?? conversations[0];
    setActivePeer(firstWithMessages.peer);
  }, [conversations, activePeer]);

  const handleSend = useCallback(async () => {
    if (!activePeer) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const msg = await send(activePeer.id, body);
    setSending(false);
    if (msg) {
      setDraft("");
      // El thread se completará via socket onMessage; no hace falta apender aquí.
    }
  }, [activePeer, draft, send]);

  const handleDelete = useCallback(
    async (messageId: string) => {
      const ok = await confirm({
        title: "Eliminar mensaje",
        description:
          "¿Eliminar este mensaje? Quedará visible como 'mensaje eliminado' para ambas partes.",
        confirmLabel: "Eliminar",
        tone: "danger",
      });
      if (!ok) return;
      await remove(messageId);
    },
    [confirm, remove],
  );

  const activeConversation = useMemo<Conversation | null>(() => {
    if (!activePeer) return null;
    return conversations.find((c) => c.peer.id === activePeer.id) ?? null;
  }, [activePeer, conversations]);

  return (
    <div className="grid min-h-[60vh] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Lista de conversaciones */}
      <aside className="rounded-lg border border-border/60 bg-card/50">
        <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
            Conversaciones
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => void refreshConversations()}
            aria-label="Refrescar conversaciones"
            className="text-muted-foreground hover:text-foreground"
          >
            <MessageSquare className="size-4" />
          </Button>
        </header>
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-xs italic text-muted-foreground">
            Aún no tienes amigos confirmados. Suma vástagos desde la pestaña
            Buscar para iniciar una conversación.
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto">
            {conversations.map((c) => {
              const isActive = activePeer?.id === c.peer.id;
              const previewText =
                c.lastMessage?.deleted
                  ? "(mensaje eliminado)"
                  : c.lastMessage
                    ? c.lastMessage.body.replace(/\s+/g, " ").slice(0, 48)
                    : "Sin mensajes aún";
              return (
                <li key={c.peer.id}>
                  <button
                    type="button"
                    onClick={() => setActivePeer(c.peer)}
                    className={cn(
                      "flex w-full items-start gap-2 border-b border-border/30 px-3 py-2 text-left transition hover:bg-blood/10",
                      isActive && "bg-blood/15",
                    )}
                  >
                    <Avatar
                      url={c.peer.avatar}
                      label={c.peer.nickname}
                      size="size-8"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {c.peer.nickname}
                        </span>
                        {c.unreadCount > 0 ? (
                          <span className="rounded-full bg-blood px-1.5 text-[10px] font-semibold leading-4 text-blood-foreground">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "truncate text-xs",
                          c.unreadCount > 0
                            ? "text-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.lastMessage?.fromMe ? "Tú: " : ""}
                        {previewText}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Panel de chat */}
      <section className="flex min-h-[60vh] flex-col rounded-lg border border-border/60 bg-card/40">
        {activePeer ? (
          <>
            <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
              <Avatar
                url={activePeer.avatar}
                label={activePeer.nickname}
                size="size-8"
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {activePeer.nickname}
                </p>
                <p className="truncate font-serif text-xs italic text-muted-foreground">
                  {activePeer.email}
                </p>
              </div>
              {activeConversation && activeConversation.unreadCount > 0 ? (
                <span className="ml-auto rounded-full bg-blood px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blood-foreground">
                  {activeConversation.unreadCount} nuevos
                </span>
              ) : null}
            </header>

            <div
              ref={threadScrollRef}
              className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2"
            >
              {loadingThread ? (
                <p className="text-center text-xs italic text-muted-foreground">
                  Cargando conversación...
                </p>
              ) : thread.length === 0 ? (
                <p className="text-center text-xs italic text-muted-foreground">
                  Sin mensajes todavía. Rompe el silencio.
                </p>
              ) : (
                thread.map((m) => {
                  const fromMe = m.senderId === currentUserId;
                  return (
                    <article
                      key={m.id}
                      className={cn(
                        "flex gap-2 text-sm",
                        fromMe ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <Avatar
                        url={fromMe ? null : activePeer.avatar}
                        label={fromMe ? "Tú" : activePeer.nickname}
                        size="size-7"
                      />
                      <div className="min-w-0 max-w-[80%] space-y-0.5">
                        <div
                          className={cn(
                            "rounded-lg border px-3 py-1.5",
                            fromMe
                              ? "border-blood/40 bg-blood/15 text-foreground"
                              : "border-border/60 bg-background/40 text-foreground",
                            m.deleted && "italic text-muted-foreground",
                          )}
                        >
                          {m.deleted ? (
                            <span>(mensaje eliminado)</span>
                          ) : (
                            <div className="markdown-content wrap-break-word text-sm">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                urlTransform={(url) => url}
                              >
                                {m.body}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-2 text-[10px] text-muted-foreground",
                            fromMe ? "justify-end" : "justify-start",
                          )}
                        >
                          <span>{formatTime(m.createdAt)}</span>
                          {fromMe && !m.deleted ? (
                            <>
                              {m.readAt ? (
                                <span className="text-emerald-400">leído</span>
                              ) : (
                                <span>enviado</span>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleDelete(m.id)}
                                aria-label="Eliminar mensaje"
                                className="rounded hover:text-destructive"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <footer className="border-t border-border/60 px-3 py-2 space-y-2">
              <MarkdownEditor
                value={draft}
                onChange={setDraft}
                maxLength={8000}
                placeholder="Escribe un mensaje... (soporta markdown)"
              />
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || draft.trim().length === 0}
                  className="bg-blood text-blood-foreground hover:bg-blood/90"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Enviar
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm italic text-muted-foreground">
            Selecciona una conversación a la izquierda para empezar a hablar.
          </div>
        )}
      </section>

      {dialog}
    </div>
  );
}
