import { BookOpenText, Crown, Users } from "lucide-react";
import { Link } from "react-router";
import type { ChronicleListItem } from "~/lib/api/chronicles/chronicles.types";

interface ChronicleCardProps {
  chronicle: ChronicleListItem;
  currentUserId: string;
}

export function ChronicleCard({ chronicle, currentUserId }: ChronicleCardProps) {
  const isNarrator = chronicle.narratorId === currentUserId;
  return (
    <Link
      to={`/chronicles/${chronicle.id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border/60 bg-card/70 p-5 shadow-sm shadow-black/40 transition hover:border-blood/60 hover:shadow-blood/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-heading text-xs uppercase tracking-[0.3em] text-blood">
            {chronicle.setting || "Crónica"}
          </p>
          <h3 className="font-heading text-xl uppercase tracking-wide text-foreground">
            {chronicle.name}
          </h3>
        </div>
        {isNarrator ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-blood/40 bg-blood/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blood">
            <Crown className="size-3" />
            Narrador
          </span>
        ) : null}
      </div>
      <p className="line-clamp-3 font-serif text-sm italic text-muted-foreground">
        {chronicle.description || "Sin descripción aún. La noche aguarda."}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {chronicle._count.members} miembros
        </span>
        <span className="inline-flex items-center gap-1">
          <BookOpenText className="size-3.5" />
          {chronicle._count.invitations} invitaciones
        </span>
      </div>
    </Link>
  );
}
