import { BookOpen, ScrollText, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { getMyJournal } from "~/lib/api/journal/journal.api";
import type { MyJournalFeed } from "~/lib/api/journal/journal.types";

export function meta() {
  return [{ title: "Bitácora · Distop-IA VTT" }];
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function JournalRoute() {
  const [feed, setFeed] = useState<MyJournalFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMyJournal()
      .then(setFeed)
      .catch((err) => setError(extractAuthError(err, "No se pudo cargar la bitácora")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Memorias"
        title="Bitácora"
        description="Notas de sesión y secretos de cada noche."
      />

      {error ? <FormAlert message={error} /> : null}
      {loading ? (
        <p className="font-serif italic text-muted-foreground">Cargando memorias...</p>
      ) : null}

      {feed ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              <ScrollText className="size-4" /> Crónicas
            </h2>
            <FeedList items={feed.chronicle} emptyHint="Aún no hay entradas en tus crónicas." />
          </article>

          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              <UserCircle className="size-4" /> Mis personajes
            </h2>
            <FeedList items={feed.character} emptyHint="Aún no has escrito memorias de tu personaje." />
          </article>
        </div>
      ) : null}
    </section>
  );
}

function FeedList({
  items,
  emptyHint,
}: {
  items: MyJournalFeed["chronicle"];
  emptyHint: string;
}) {
  if (items.length === 0) {
    return <p className="font-serif italic text-muted-foreground">{emptyHint}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((entry) => (
        <li
          key={entry.id}
          className="rounded-md border border-border/40 bg-background/40 p-3"
        >
          <Link
            to={`/chronicles/${entry.chronicle.id}/journal`}
            className="block hover:opacity-80"
          >
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-blood">
              <BookOpen className="size-3" /> {entry.chronicle.name}
            </p>
            <p className="mt-1 font-heading text-base text-foreground">{entry.title}</p>
            <p className="mt-2 line-clamp-2 font-serif text-sm italic text-muted-foreground">
              {entry.body}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDate(entry.sessionDate ?? entry.createdAt)} · {entry.author.nickname}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
