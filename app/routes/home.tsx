import {
  ArrowRight,
  BookOpenText,
  Code2,
  Dice5,
  Mail,
  Map,
  Skull,
} from "lucide-react";
import { Link } from "react-router";
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
    description: "Fichas de Vampiro: la Mascarada.",
    icon: Skull,
  },
  {
    to: "/invitations",
    title: "Invitaciones",
    description: "Convocatorias pendientes a otras mesas.",
    icon: Mail,
  },
  {
    to: "/table",
    title: "Mesa Virtual",
    description: "Dados, iniciativa y mapas en tiempo real.",
    icon: Dice5,
  },
];

const SUPPORT_EMAIL = "contacto@guillermotorresdev.com";

export default function Home() {
  const user = useUserStore((s) => s.user);
  return (
    <section className="space-y-6 sm:space-y-8">
      <header className="space-y-2">
        <p className="font-heading text-[0.65rem] uppercase tracking-[0.3em] text-blood sm:text-xs sm:tracking-[0.4em]">
          Cónclave abierto
        </p>
        <h1 className="font-heading text-3xl text-foreground sm:text-5xl">
          Bienvenido, {user?.nickname ?? "vástago"}
        </h1>
        <p className="text-base italic text-muted-foreground sm:text-lg">
          La noche es larga. Elige por dónde comienza la cacería.
        </p>
      </header>

      {/* Cards más compactas: 2 columnas en mobile, 4 en sm+. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className="group relative flex flex-col gap-1.5 overflow-hidden rounded-lg border border-border/60 bg-card/70 p-3 shadow-sm shadow-black/40 transition hover:border-blood/60 hover:shadow-blood/20"
          >
            <tile.icon className="size-5 text-blood" />
            <h2 className="font-heading text-sm uppercase tracking-widest text-foreground">
              {tile.title}
            </h2>
            <p className="font-serif text-xs italic leading-snug text-muted-foreground">
              {tile.description}
            </p>
            <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground transition group-hover:text-blood">
              Entrar <ArrowRight className="size-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* Sección de soporte y colaboración */}
      <section className="rounded-lg border border-blood/30 bg-blood/5 p-5 sm:p-6">
        <p className="font-heading text-[0.65rem] uppercase tracking-[0.3em] text-blood sm:text-xs sm:tracking-[0.4em]">
          Apoyo y colaboración
        </p>
        <h2 className="mt-2 font-heading text-2xl text-foreground sm:text-3xl">
          Distop-IA crece gracias a la sangre que la mesa le ofrenda
        </h2>
        <p className="mt-3 max-w-3xl font-serif text-sm italic text-muted-foreground sm:text-base">
          Este VTT se mantiene de forma independiente. Si te resulta útil para
          tus mesas y querés colaborar, hay tres formas igual de valiosas:
          invitarme un café, sumarte al desarrollo o escribirme con feedback.
          Cualquier aporte se nota.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {/* Cafecito */}
          <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-4">
            <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Invitame un café
            </h3>
            <p className="font-serif text-sm italic text-muted-foreground">
              La forma más simple de empujar el proyecto. Va directo a horas de
              desarrollo y al hosting de la mesa.
            </p>
            <a
              href="https://cafecito.app/distop-ia"
              rel="noopener"
              target="_blank"
              className="mt-auto inline-block"
            >
              <img
                srcSet="https://cdn.cafecito.app/imgs/buttons/button_2.png 1x, https://cdn.cafecito.app/imgs/buttons/button_2_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_2_3.75x.png 3.75x"
                src="https://cdn.cafecito.app/imgs/buttons/button_2.png"
                alt="Invitame un café en cafecito.app"
              />
            </a>
          </article>

          {/* Desarrollo */}
          <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-4">
            <Code2 className="size-5 text-blood" />
            <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Sumate al desarrollo
            </h3>
            <p className="font-serif text-sm italic text-muted-foreground">
              ¿Programás? ¿Diseñás? ¿Probás mesas y encontrás bugs? Hay sitio
              para más manos. Escribime y armamos juntos cómo encarar tu aporte.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Colaborar%20en%20Distop-IA`}
              className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-blood hover:underline"
            >
              <Mail className="size-3.5" />
              {SUPPORT_EMAIL}
            </a>
          </article>

          {/* Roadmap */}
          <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-4">
            <Map className="size-5 text-blood" />
            <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Próximos features
            </h3>
            <p className="font-serif text-sm italic text-muted-foreground">
              Mirá lo que se viene: integraciones con otras líneas del Mundo de
              Tinieblas y mejoras a la mesa. Tu aporte agiliza cada hito.
            </p>
            <Link
              to="/roadmap"
              className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground transition hover:text-blood"
            >
              Ver el roadmap <ArrowRight className="size-3.5" />
            </Link>
          </article>
        </div>
      </section>
    </section>
  );
}
