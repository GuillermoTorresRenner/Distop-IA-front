import { ArrowLeft, Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router";
import roadmap from "../../roadmap.json";

type RoadmapStatus = "planned" | "in-progress" | "done";

interface RoadmapItem {
  title: string;
  description: string;
  status?: RoadmapStatus | string;
  tags?: string[];
}

interface RoadmapGroup {
  id: string;
  title: string;
  description?: string;
  items: RoadmapItem[];
}

interface RoadmapData {
  updatedAt: string;
  intro: string;
  groups: RoadmapGroup[];
}

const data = roadmap as RoadmapData;

export function meta() {
  return [
    { title: "Próximos features · Distop-IA VTT" },
    {
      name: "description",
      content:
        "Lo que viene en Distop-IA: integraciones con otras líneas del Mundo de Tinieblas y mejoras a la mesa virtual.",
    },
  ];
}

export default function RoadmapRoute() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver al santuario
        </Link>
        <p className="font-heading text-[0.65rem] uppercase tracking-[0.3em] text-blood sm:text-xs sm:tracking-[0.4em]">
          Próximos features
        </p>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">
          Lo que viene en Distop-IA
        </h1>
        <p className="max-w-3xl font-serif text-base italic text-muted-foreground sm:text-lg">
          {data.intro}
        </p>
        <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/80">
          <Calendar className="size-3" />
          Actualizado: {data.updatedAt}
        </p>
      </header>

      <div className="space-y-10">
        {data.groups.map((group) => (
          <section key={group.id} className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-heading text-xl uppercase tracking-wider text-blood sm:text-2xl">
                {group.title}
              </h2>
              {group.description ? (
                <p className="max-w-3xl font-serif text-sm italic text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/70 p-4 shadow-sm shadow-black/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
                      {item.title}
                    </h3>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="font-serif text-sm italic text-muted-foreground">
                    {item.description}
                  </p>
                  {item.tags && item.tags.length > 0 ? (
                    <ul className="mt-auto flex flex-wrap gap-1 pt-2">
                      {item.tags.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-blood/30 bg-blood/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-blood"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="rounded-lg border border-blood/30 bg-blood/5 p-5">
        <p className="flex items-center gap-2 font-heading text-sm uppercase tracking-wider text-blood">
          <Sparkles className="size-4" />
          ¿Quieres ayudar a que llegue antes?
        </p>
        <p className="mt-2 max-w-2xl font-serif text-sm italic text-muted-foreground">
          Tu aporte —ya sea un café, código o feedback— acorta los tiempos.
          Vuelve al inicio para encontrar las opciones de apoyo.
        </p>
      </footer>
    </section>
  );
}

function StatusPill({ status }: { status?: string }) {
  const label =
    status === "in-progress"
      ? "En curso"
      : status === "done"
        ? "Listo"
        : "Planeado";
  const className =
    status === "in-progress"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : status === "done"
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-border bg-background/40 text-muted-foreground";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}
