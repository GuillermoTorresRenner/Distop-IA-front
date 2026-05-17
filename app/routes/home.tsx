import {
  ArrowRight,
  BookOpenText,
  Code2,
  Coffee,
  Dice5,
  Globe,
  Heart,
  Mail,
  Map,
  Receipt,
  Server,
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
          Una carta a quienes alguna vez fotocopiaron manuales prestados
        </h2>
        <div className="mt-4 max-w-3xl space-y-3 font-serif text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p className="italic">
            Recuerdo la primera vez que jugué juegos de rol{" "}
            <span className="not-italic text-foreground/80">(AD&amp;D)</span>;
            los manuales estaban fotocopiados del amigo del amigo del amigo que
            los había conseguido en el extranjero…
          </p>
          <p className="italic">
            Cuántas veces fotocopié ansiosamente manuales de distintos juegos
            sólo para dar rienda suelta a la imaginación.
          </p>
          <p className="italic text-foreground/90">
            Ya es hora de retribuir algo de todo eso que me ha llegado.
          </p>
          <p>
            Estoy feliz de iniciar{" "}
            <strong className="font-semibold text-blood">Distop-IA</strong>,
            mi primer proyecto open source: una plataforma VTT para jugar{" "}
            <em>Vampiro: la Mascarada</em> en esta primera instancia, a la que
            irán sumándose más manuales y lore del{" "}
            <em>Mundo de Tinieblas</em>.
          </p>
          <p>
            Espero que todas las personas que todavía tienen tiempo de volver a
            la adolescencia con amigos a jugar —aunque sea a la distancia— la
            disfruten tanto como yo he disfrutado cada línea de código.
          </p>
          <p className="not-italic text-foreground/85">
            Toda colaboración para mejorar el proyecto es bienvenida.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {/* Cafecito */}
          <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-4">
            <Coffee className="size-5 text-blood" />
            <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Invítame un café
            </h3>
            <p className="font-serif text-sm italic text-muted-foreground">
              La forma más simple de empujar el proyecto. Va directo a horas de
              desarrollo y al hosting de la mesa.
            </p>
            <a
              href="https://www.flow.cl/btn.php?token=fcad54c1863fa475fbc2c46706beb2eb3f59bd99"
              rel="noopener"
              target="_blank"
              className="mt-auto inline-block"
            >
              <img
                src="https://www.flow.cl/img/botones/btn-pagar-negro.png"
                alt="Pagar con Flow"
              />
            </a>
          </article>

          {/* Desarrollo */}
          <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-4">
            <Code2 className="size-5 text-blood" />
            <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Súmate al desarrollo
            </h3>
            <p className="font-serif text-sm italic text-muted-foreground">
              ¿Programas? ¿Diseñas? ¿Pruebas mesas y encuentras bugs? Hay sitio
              para más manos. Escríbeme y vemos juntos cómo enfocar tu aporte.
            </p>
            <div className="mt-auto flex flex-col gap-2">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Colaborar%20en%20Distop-IA`}
                className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-blood hover:underline"
              >
                <Mail className="size-3.5" />
                {SUPPORT_EMAIL}
              </a>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/GuillermoTorresRenner/Distop-IA-front"
                  rel="noopener"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground transition hover:text-blood"
                  aria-label="Repositorio del frontend en GitHub"
                >
                  <GithubIcon className="size-4" />
                  Frontend
                </a>
                <a
                  href="https://github.com/GuillermoTorresRenner/Distop-IA-backend"
                  rel="noopener"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground transition hover:text-blood"
                  aria-label="Repositorio del backend en GitHub"
                >
                  <GithubIcon className="size-4" />
                  Backend
                </a>
              </div>
            </div>
          </article>

          {/* Roadmap */}
          <article className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-4">
            <Map className="size-5 text-blood" />
            <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Próximos features
            </h3>
            <p className="font-serif text-sm italic text-muted-foreground">
              Mira lo que se viene: integraciones con otras líneas del Mundo de
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

        {/* Costos transparentes que cubre la comunidad */}
        <div className="mt-6 rounded-lg border border-border/60 bg-card/60 p-4 sm:p-5">
          <header className="mb-3 flex items-center gap-2">
            <Receipt className="size-4 text-blood" />
            <h3 className="font-heading text-sm uppercase tracking-widest text-foreground">
              Costos que cubrir
            </h3>
          </header>
          <p className="mb-4 max-w-3xl font-serif text-xs italic text-muted-foreground sm:text-sm">
            Mantener la mesa abierta tiene un costo concreto. Acá está el
            desglose anual estimado, en USD, para que sepas exactamente a dónde
            va cualquier aporte.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            <CostItem
              icon={<Server className="size-4" />}
              label="VPS (Hostinger)"
              amount="100 USD / año"
              hint="Donde corre el back, la base de datos y los WebSockets de la mesa."
            />
            <CostItem
              icon={<Globe className="size-4" />}
              label="Dominio"
              amount="10 USD / año"
              hint="distop-ia.com: para que la mesa tenga una dirección estable."
            />
            <CostItem
              icon={<Mail className="size-4" />}
              label="Correo transaccional"
              amount="5 USD / año"
              hint="Invitaciones a crónicas, recuperación de contraseña, avisos."
            />
            <CostItem
              icon={<Heart className="size-4" />}
              label="Mantenedor"
              amount="incalculable"
              hint="Horas robadas al sueño, cafés a las 2am y un poquito de alma. Pagar con un mensaje lindo siempre alcanza ❤️"
            />
          </ul>
        </div>
      </section>
    </section>
  );
}

function CostItem({
  icon,
  label,
  amount,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  amount: string;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-border/40 bg-background/40 p-3">
      <span className="mt-0.5 shrink-0 text-blood">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-heading text-xs uppercase tracking-widest text-foreground">
            {label}
          </span>
          <span className="font-mono text-xs text-blood">{amount}</span>
        </div>
        <p className="mt-1 font-serif text-xs italic text-muted-foreground">
          {hint}
        </p>
      </div>
    </li>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297a12 12 0 0 0-3.793 23.39c.6.11.82-.26.82-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.42-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.933 0-1.31.468-2.382 1.236-3.222-.124-.303-.535-1.527.118-3.181 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 6.003 0c2.29-1.553 3.296-1.23 3.296-1.23.655 1.654.243 2.878.12 3.181.77.84 1.234 1.912 1.234 3.222 0 4.61-2.804 5.625-5.476 5.92.43.371.823 1.103.823 2.222 0 1.606-.015 2.9-.015 3.293 0 .32.216.694.825.576A12 12 0 0 0 12 .297Z" />
    </svg>
  );
}
