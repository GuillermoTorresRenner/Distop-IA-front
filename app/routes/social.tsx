import {
  Check,
  Loader2,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  acceptFriendship,
  declineFriendship,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriendship,
  requestFriendship,
  searchUsers,
} from "~/lib/api/social/social.api";
import type {
  Friendship,
  SearchableUser,
} from "~/lib/api/social/social.types";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Social · Distop-IA VTT" }];
}

function Avatar({ url, label }: { url: string | null; label: string }) {
  return (
    <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-blood/20 text-sm font-semibold uppercase text-blood">
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        (label || "?").charAt(0)
      )}
    </span>
  );
}

function UserCell({
  nickname,
  email,
}: {
  nickname: string;
  email: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">{nickname}</p>
      <p className="truncate font-serif text-xs italic text-muted-foreground">
        {email}
      </p>
    </div>
  );
}

export default function SocialRoute() {
  const currentUser = useUserStore((s) => s.user);
  const [tab, setTab] = useState<"discover" | "friends" | "requests">(
    "discover",
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [friends, setFriends] = useState<Friendship[]>([]);
  const [incoming, setIncoming] = useState<Friendship[]>([]);
  const [outgoing, setOutgoing] = useState<Friendship[]>([]);

  async function refreshAll() {
    try {
      const [f, i, o] = await Promise.all([
        listFriends(),
        listIncomingRequests(),
        listOutgoingRequests(),
      ]);
      setFriends(f);
      setIncoming(i);
      setOutgoing(o);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo cargar tu manada"));
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (tab !== "discover") return;
      setSearchLoading(true);
      try {
        const res = await searchUsers({ q: query.trim() || undefined });
        if (!cancelled) setResults(res.data);
      } catch (err) {
        if (!cancelled)
          setError(extractAuthError(err, "No se pudo buscar usuarios"));
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, tab]);

  async function handleRequest(user: SearchableUser) {
    setError(null);
    try {
      await requestFriendship(user.id);
      await refreshAll();
      setResults((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, relation: u.relation === "INCOMING" ? "FRIENDS" : "OUTGOING" }
            : u,
        ),
      );
    } catch (err) {
      setError(extractAuthError(err, "No se pudo enviar la solicitud"));
    }
  }

  async function handleAccept(id: string) {
    setError(null);
    try {
      await acceptFriendship(id);
      await refreshAll();
    } catch (err) {
      setError(extractAuthError(err, "No se pudo aceptar la solicitud"));
    }
  }

  async function handleDecline(id: string) {
    setError(null);
    try {
      await declineFriendship(id);
      await refreshAll();
    } catch (err) {
      setError(extractAuthError(err, "No se pudo rechazar la solicitud"));
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("¿Eliminar este lazo de sangre?")) return;
    setError(null);
    try {
      await removeFriendship(id);
      await refreshAll();
    } catch (err) {
      setError(extractAuthError(err, "No se pudo eliminar la amistad"));
    }
  }

  const counts = useMemo(
    () => ({
      friends: friends.length,
      incoming: incoming.length,
      outgoing: outgoing.length,
    }),
    [friends, incoming, outgoing],
  );

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Manada"
        title="Social"
        description="Encuentra y une lazos con otros vástagos de la noche."
      />

      <nav className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        <TabBtn active={tab === "discover"} onClick={() => setTab("discover")}>
          <Search className="size-4" /> Buscar
        </TabBtn>
        <TabBtn active={tab === "friends"} onClick={() => setTab("friends")}>
          <Users className="size-4" /> Amigos · {counts.friends}
        </TabBtn>
        <TabBtn active={tab === "requests"} onClick={() => setTab("requests")}>
          <UserPlus className="size-4" /> Solicitudes · {counts.incoming + counts.outgoing}
        </TabBtn>
      </nav>

      {error ? <FormAlert message={error} /> : null}

      {tab === "discover" ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nickname o correo..."
              className="pl-9"
            />
            {searchLoading ? (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          {results.length === 0 && !searchLoading ? (
            <p className="font-serif italic text-muted-foreground">
              {query
                ? "Sin vástagos para esa búsqueda."
                : "Comienza a escribir para descubrir vástagos."}
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar url={u.avatar} label={u.nickname} />
                    <UserCell nickname={u.nickname} email={u.email} />
                  </div>
                  <RelationButton user={u} onRequest={handleRequest} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "friends" ? (
        friends.length === 0 ? (
          <p className="font-serif italic text-muted-foreground">
            Aún no tienes lazos confirmados. Busca otros vástagos para invitarlos.
          </p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => {
              const other =
                f.requester.id === currentUser?.id ? f.addressee : f.requester;
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar url={other.avatar} label={other.nickname} />
                    <UserCell nickname={other.nickname} email={other.email} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(f.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <UserMinus className="size-4" /> Romper lazo
                  </Button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {tab === "requests" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              Entrantes ({incoming.length})
            </h2>
            {incoming.length === 0 ? (
              <p className="font-serif italic text-muted-foreground">
                Sin solicitudes nuevas.
              </p>
            ) : (
              <ul className="space-y-2">
                {incoming.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar url={f.requester.avatar} label={f.requester.nickname} />
                      <UserCell nickname={f.requester.nickname} email={f.requester.email} />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(f.id)}
                        className="bg-blood text-blood-foreground hover:bg-blood/90"
                      >
                        <Check className="size-4" /> Aceptar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDecline(f.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              Enviadas ({outgoing.length})
            </h2>
            {outgoing.length === 0 ? (
              <p className="font-serif italic text-muted-foreground">
                Sin solicitudes pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar url={f.addressee.avatar} label={f.addressee.nickname} />
                      <UserCell nickname={f.addressee.nickname} email={f.addressee.email} />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(f.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="size-4" /> Retirar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ) : null}
    </section>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-b-2 border-blood bg-card/70 text-foreground"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function RelationButton({
  user,
  onRequest,
}: {
  user: SearchableUser;
  onRequest: (u: SearchableUser) => Promise<void>;
}) {
  if (user.relation === "FRIENDS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blood/40 bg-blood/10 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-blood">
        <Check className="size-3" /> Lazo
      </span>
    );
  }
  if (user.relation === "OUTGOING") {
    return (
      <span className="rounded-full border border-border/60 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Enviada
      </span>
    );
  }
  if (user.relation === "INCOMING") {
    return (
      <Button
        size="sm"
        onClick={() => onRequest(user)}
        className="bg-blood text-blood-foreground hover:bg-blood/90"
      >
        <Check className="size-4" /> Aceptar
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => onRequest(user)}>
      <Send className="size-4" /> Solicitar
    </Button>
  );
}
