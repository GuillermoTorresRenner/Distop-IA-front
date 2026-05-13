import { BookOpen, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "~/components/ui/button";

export function QuickGuideButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="border border-blood/40 text-blood hover:bg-blood/10"
      >
        <BookOpen className="size-4" /> Guía rápida
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-guide-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-10 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
              <div>
                <p className="font-heading text-[0.65rem] uppercase tracking-[0.4em] text-blood">
                  Capítulo Tres · Personajes y Rasgos
                </p>
                <h2
                  id="quick-guide-title"
                  className="font-heading text-xl uppercase tracking-wider text-foreground"
                >
                  Proceso de creación de personajes
                </h2>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                aria-label="Cerrar guía"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="max-h-[75vh] space-y-6 overflow-y-auto px-5 py-5 font-serif text-sm leading-relaxed text-foreground/90">
              <Step
                number="Paso Uno"
                title="Concepto del Personaje"
                description="Elige concepto, clan, Naturaleza y Conducta. Apóyate en los arquetipos del manual (artista, criminal, intelectual, soldado…) para anclar la historia del vástago antes de mecanizarlo."
              />

              <Step
                number="Paso Dos"
                title="Selecciona Atributos"
                description="Ordena las tres categorías: Físicos, Sociales y Mentales con la prioridad 7 / 5 / 3. Cada Atributo arranca con un círculo gratuito; reparte los puntos restantes en Fuerza, Destreza, Resistencia · Carisma, Manipulación, Apariencia · Percepción, Inteligencia, Astucia."
              />

              <Step
                number="Paso Tres"
                title="Selecciona Habilidades"
                description="Ordena Talentos, Técnicas y Conocimientos con la prioridad 13 / 9 / 5. En este paso ninguna Habilidad puede ser mayor que 3."
              />

              <Step
                number="Paso Cuatro"
                title="Selecciona Ventajas"
                description="Reparte 3 puntos en Disciplinas, 5 en Trasfondos y 7 en Virtudes. Cada Virtud comienza con un círculo gratuito (Conciencia/Convicción, Autocontrol/Instintos, Coraje)."
              />

              <Step
                number="Paso Cinco"
                title="Toques Finales"
                description={
                  <>
                    <p>Calcula los rasgos derivados y gasta los 15 puntos gratuitos:</p>
                    <ul className="mt-1 list-disc pl-5 text-foreground/80">
                      <li>Humanidad = Conciencia + Autocontrol</li>
                      <li>Fuerza de Voluntad = Coraje</li>
                      <li>Reserva de Sangre según la generación</li>
                    </ul>
                  </>
                }
              />

              <section className="rounded-md border border-blood/40 bg-blood/5 p-4">
                <h3 className="font-heading text-xs uppercase tracking-[0.3em] text-blood">
                  Puntos gratuitos · Coste por círculo
                </h3>
                <p className="mt-1 text-xs italic text-muted-foreground">
                  Dispones de <strong className="not-italic text-foreground">15 puntos</strong>{" "}
                  para refinar tu vástago. Cada círculo extra cuesta:
                </p>
                <div className="mt-3 overflow-hidden rounded-md border border-border/50">
                  <table className="w-full text-sm">
                    <thead className="bg-background/40 font-heading text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Rasgo</th>
                        <th className="px-3 py-2 text-left">Coste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      <CostRow trait="Atributo" cost="5 por círculo" />
                      <CostRow trait="Habilidad" cost="2 por círculo" />
                      <CostRow trait="Disciplina" cost="7 por círculo" highlight />
                      <CostRow trait="Trasfondo" cost="1 por círculo" />
                      <CostRow trait="Virtud" cost="2 por círculo" />
                      <CostRow trait="Humanidad" cost="1 por círculo" />
                      <CostRow trait="Fuerza de Voluntad" cost="1 por círculo" />
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="font-heading text-xs uppercase tracking-[0.3em] text-blood">
                  Conceptos de ejemplo
                </h3>
                <p className="mt-2 text-foreground/80">
                  <strong className="text-foreground">Artista</strong> · músico, estrella de cine,
                  pintor, modelo. <strong className="text-foreground">Animal Social</strong> ·
                  diletante, anfitrión, playboy.{" "}
                  <strong className="text-foreground">Criatura de la noche</strong> · discotequero,
                  punk, raver. <strong className="text-foreground">Criminal</strong> · mafioso,
                  proxeneta, ratero. <strong className="text-foreground">Errante</strong> ·
                  mendigo, contrabandista, peregrino.{" "}
                  <strong className="text-foreground">Intelectual</strong> · escritor, científico,
                  filósofo. <strong className="text-foreground">Investigador</strong> · detective,
                  cazador de brujas. <strong className="text-foreground">Operario</strong> ·
                  granjero, albañil, asalariado.{" "}
                  <strong className="text-foreground">Político</strong> · juez, consejero, escritor
                  de discursos. <strong className="text-foreground">Profesional</strong> ·
                  ingeniero, doctor, abogado.{" "}
                  <strong className="text-foreground">Reportero</strong> · periodista, paparazzi.{" "}
                  <strong className="text-foreground">Soldado</strong> · mercenario, guardaespaldas.
                </p>
              </section>

              <section>
                <h3 className="font-heading text-xs uppercase tracking-[0.3em] text-blood">
                  Clanes
                </h3>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <ClanLine
                    name="Assamita"
                    sect="Independiente"
                    text="Los Asesinos, peligrosos diabolistas con una terrible búsqueda de vitae de Vástago, han perfeccionado el arte de matar en silencio."
                  />
                  <ClanLine
                    name="Brujah"
                    sect="Camarilla"
                    text="La Chusma se compone de rebeldes e insurrectos que luchan apasionadamente por sus causas. Sueñan con una sociedad perfecta… para los vampiros."
                  />
                  <ClanLine
                    name="Gangrel"
                    sect="Camarilla"
                    text="Los Extranjeros, nómadas, feroces y salvajes. Errantes solitarios, fuente de muchas leyendas que relacionan a los vampiros con bestias oscuras."
                  />
                  <ClanLine
                    name="Giovanni"
                    sect="Independiente"
                    text="Retirados e incestuosos, los Nigromantes se dedican al comercio de la sangre, el dinero y las almas de los muertos."
                  />
                  <ClanLine
                    name="Lasombra"
                    sect="Sabbat"
                    text="Misteriosos y perversos Guardianes que lideran oficialmente el Sabbat. Se sirven primero a sí mismos y a su oscuridad interior."
                  />
                  <ClanLine
                    name="Malkavian"
                    sect="Camarilla"
                    text="Peligrosamente dementes y totalmente psicóticos, los Chalados no dejan de poseer una sorprendente perspicacia."
                  />
                  <ClanLine
                    name="Nosferatu"
                    sect="Camarilla"
                    text="Las horribles Ratas de Cloaca, deformes y desfiguradas, condenadas al exilio de la sociedad humana, pero reúnen secretos en la oscuridad que las oculta."
                  />
                  <ClanLine
                    name="Ravnos"
                    sect="Independiente"
                    text="Los Embaucadores, siempre en movimiento, maestros de la ilusión y el engaño, obrando sus trucos de forma malévola al viajar de ciudad en ciudad."
                  />
                  <ClanLine
                    name="Seguidores de Set"
                    sect="Independiente"
                    text="Corruptoras y mortales, las Serpientes son temidas por su maldad y solicitadas por sus conocimientos arcanos y sus siniestros favores."
                  />
                  <ClanLine
                    name="Toreador"
                    sect="Camarilla"
                    text="Amantes del arte y la estética, los Degenerados están atrapados en el estancamiento de la no-vida, rodeándose de excesos para combatir su malestar."
                  />
                  <ClanLine
                    name="Tremere"
                    sect="Camarilla"
                    text="Los Brujos forman un clan de hechiceros de la sangre en los que nadie confía… y a los que todos temen."
                  />
                  <ClanLine
                    name="Tzimisce"
                    sect="Sabbat"
                    text="Brillantes pero monstruosos Demonios, un clan de nobles caídos del Viejo Continente. Suya es la temible Disciplina que permite esculpir la carne."
                  />
                  <ClanLine
                    name="Ventrue"
                    sect="Camarilla"
                    text="Los Sangre Azul, la reluctante aristocracia de los Vástagos, expían su condena haciendo cumplir las Tradiciones y la Mascarada."
                  />
                </div>
              </section>
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/40 px-5 py-3">
              <p className="font-serif text-xs italic text-muted-foreground">
                Fuente: Vampiro: la Mascarada · Capítulo Tres, pág. 103.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setOpen(false)}
                className="bg-blood text-blood-foreground hover:bg-blood/90"
              >
                Entendido
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <p className="font-heading text-[0.65rem] uppercase tracking-[0.35em] text-blood">
        {number}
      </p>
      <h3 className="font-heading text-base uppercase tracking-wide text-foreground">
        {title}
      </h3>
      <div className="text-foreground/85">{description}</div>
    </section>
  );
}

function CostRow({
  trait,
  cost,
  highlight,
}: {
  trait: string;
  cost: string;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-blood/10" : undefined}>
      <td className="px-3 py-1.5 font-serif">{trait}</td>
      <td className="px-3 py-1.5 font-mono text-xs text-foreground/80">{cost}</td>
    </tr>
  );
}

function ClanLine({
  name,
  sect,
  text,
}: {
  name: string;
  sect: string;
  text: string;
}) {
  return (
    <article className="rounded-md border border-border/40 bg-background/30 p-2">
      <header className="flex items-baseline justify-between gap-2">
        <h4 className="font-heading text-sm uppercase tracking-wide text-foreground">
          {name}
        </h4>
        <span className="font-heading text-[0.6rem] uppercase tracking-widest text-blood">
          {sect}
        </span>
      </header>
      <p className="mt-0.5 font-serif text-xs text-foreground/75">{text}</p>
    </article>
  );
}
