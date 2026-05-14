import { ArrowLeft, Dice5, Send, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { useTable } from "~/hooks/use-table";
import type { ChatMessage } from "~/lib/socket/types";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Mesa · Distop-IA VTT" }];
}

export default function ChronicleTableRoute() {
  const { id: chronicleId } = useParams<{ id: string }>();
  const { status, error, members, myRole, messages, sendMessage } = useTable(
    chronicleId ?? null
  );

  return (
    <section className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/chronicles/${chronicleId}`}
            className="text-sm font-serif italic text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="size-4" />
              Volver a la crónica
            </span>
          </Link>
        </div>
        <ConnectionBadge status={status} error={error} />
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[16rem_1fr_18rem]">
        {/* Columna izquierda: Presencia */}
        <aside className="rounded-lg border border-border bg-card p-3 flex flex-col">
          <div className="mb-3 flex items-center gap-2 text-sm font-heading uppercase tracking-wider text-muted-foreground">
            <Users className="size-4" />
            Presentes ({members.length})
          </div>
          <ul className="flex-1 space-y-1 overflow-y-auto">
            {members.length === 0 ? (
              <li className="font-serif italic text-sm text-muted-foreground">
                Esperando a otros...
              </li>
            ) : (
              members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm"
                >
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="flex-1 truncate font-serif">{m.email}</span>
                  {m.role === "NARRATOR" ? (
                    <span className="rounded-sm bg-blood/20 px-1.5 py-0.5 font-heading text-[10px] uppercase tracking-wider text-blood">
                      Narrador
                    </span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* Columna central: Pizarra (placeholder fase 3) */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
          <Dice5 className="size-12 text-blood/60" />
          <h3 className="mt-3 font-heading text-lg uppercase tracking-widest">
            Pizarra
          </h3>
          <p className="mt-1 font-serif italic text-sm text-muted-foreground">
            Llegará pronto. Aquí podrás dibujar mapas y diagramas con el grupo.
          </p>
          {myRole === "NARRATOR" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Eres el narrador de esta mesa.
            </p>
          ) : null}
        </div>

        {/* Columna derecha: Chat + (futuro) tiradas */}
        <aside className="flex h-full flex-col rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-3 py-2 text-sm font-heading uppercase tracking-wider text-muted-foreground">
            Chat
          </div>
          <ChatPanel
            messages={messages}
            disabled={status !== "joined"}
            onSend={sendMessage}
          />
        </aside>
      </div>
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

function ChatPanel({
  messages,
  disabled,
  onSend,
}: {
  messages: ChatMessage[];
  disabled: boolean;
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    const ok = await onSend(text);
    if (ok) setText("");
  }

  return (
    <>
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
      >
        {messages.length === 0 ? (
          <p className="font-serif italic text-sm text-muted-foreground">
            La conversación aún no ha comenzado.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-xs uppercase tracking-wider text-blood">
                  {m.email}
                </span>
                <span className="font-serif text-[10px] italic text-muted-foreground">
                  {new Date(m.at).toLocaleTimeString()}
                </span>
              </div>
              <p className="font-serif whitespace-pre-wrap break-words">
                {m.text}
              </p>
            </div>
          ))
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
          className="h-9 flex-1 rounded-md border border-input bg-input/30 px-3 text-sm font-serif placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blood"
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
    </>
  );
}
