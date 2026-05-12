import { ArrowRight, BookOpenText, Dice5, Mail, Skull } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [
    { title: "Inicio · Distop-IA VTT" },
    { name: "description", content: "Mesa de juego para Vampiro la Mascarada." },
  ];
}

interface Tile {
  to: string;
  title: string;
  description: string;
  icon: typeof BookOpenText;
}

const tiles: Tile[] = [
  {
    to: "/chronicles",
    title: "Crónicas",
    description: "Historias activas donde participas como Narrador o vástago.",
    icon: BookOpenText,
  },
  {
    to: "/characters",
    title: "Mis personajes",
    description: "Fichas de Vampiro: la Mascarada — clanes, disciplinas, Humanidad.",
    icon: Skull,
  },
  {
    to: "/invitations",
    title: "Invitaciones",
    description: "Convocatorias pendientes a otras mesas de juego.",
    icon: Mail,
  },
  {
    to: "/table",
    title: "Mesa Virtual",
    description: "Tirada de dados, iniciativa y mapas en tiempo real.",
    icon: Dice5,
  },
];

export default function Home() {
  const user = useUserStore((s) => s.user);
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="font-heading text-xs uppercase tracking-[0.4em] text-blood">
          Cónclave abierto
        </p>
        <h1 className="font-heading text-4xl text-foreground sm:text-5xl">
          Bienvenido, {user?.nickname ?? "vástago"}
        </h1>
        <p className="font-serif text-lg italic text-muted-foreground">
          La noche es larga. Elige por dónde comienza la cacería.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border/60 bg-card/70 p-5 shadow-sm shadow-black/40 transition hover:border-blood/60 hover:shadow-blood/20"
          >
            <tile.icon className="size-6 text-blood" />
            <h2 className="font-heading text-lg uppercase tracking-widest text-foreground">
              {tile.title}
            </h2>
            <p className="font-serif text-sm italic text-muted-foreground">
              {tile.description}
            </p>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground transition group-hover:text-blood">
              Entrar <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-border/60 bg-card/40 p-6">
        <h2 className="font-heading text-sm uppercase tracking-[0.3em] text-blood">
          Crear una nueva crónica
        </h2>
        <p className="mt-2 font-serif italic text-muted-foreground">
          Funda tu propia historia y convoca a los vástagos que te acompañarán.
        </p>
        <Link to="/chronicles/new" className="mt-4 inline-block">
          <Button className="bg-blood text-blood-foreground hover:bg-blood/90">
            Fundar crónica
          </Button>
        </Link>
      </div>
    </section>
  );
}
