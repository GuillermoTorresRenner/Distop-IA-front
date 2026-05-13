import { Library, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Tabs } from "~/components/common/tabs";
import { Button } from "~/components/ui/button";

/**
 * Botón "Tablas de referencia" — abre un modal con tablas de consulta rápida del
 * manual (Experiencia, Combate CC, Combate a distancia, Armaduras…). Pensado
 * para crecer: agregar más tablas significa añadir una entrada en TAB_ITEMS.
 */
export function ReferenceTablesButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="border border-blood/40 text-blood hover:bg-blood/10"
        title="Tablas de referencia (combate, experiencia, etc.)"
      >
        <Library className="size-4" /> Tablas
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reference-tables-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-10 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
              <div>
                <p className="font-heading text-[0.65rem] uppercase tracking-[0.4em] text-blood">
                  Consulta rápida · V20
                </p>
                <h2
                  id="reference-tables-title"
                  className="font-heading text-xl uppercase tracking-wider text-foreground"
                >
                  Tablas de referencia
                </h2>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
              <Tabs
                items={[
                  { id: "exp", label: "Experiencia" },
                  { id: "melee", label: "Maniobras CC" },
                  { id: "ranged", label: "Maniobras distancia" },
                  { id: "armor", label: "Armaduras" },
                ]}
                defaultValue="exp"
              >
                {(active) => (
                  <>
                    {active === "exp" ? <ExperienceTable /> : null}
                    {active === "melee" ? <MeleeManeuversTable /> : null}
                    {active === "ranged" ? <RangedManeuversTable /> : null}
                    {active === "armor" ? <ArmorTable /> : null}
                  </>
                )}
              </Tabs>
            </div>

            <footer className="border-t border-border/60 bg-background/40 px-5 py-3">
              <p className="font-serif text-xs italic text-muted-foreground">
                Fuente: Vampiro: la Mascarada V20.
              </p>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Tablas
// ──────────────────────────────────────────────────────────────────

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border/50">
      <table className="w-full text-sm">
        <thead className="bg-background/40 font-heading text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-serif">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExperienceTable() {
  return (
    <section className="space-y-4">
      <h3 className="font-heading text-base uppercase tracking-wider text-blood">
        Costes de Experiencia
      </h3>
      <Table
        headers={["Rasgo", "Coste"]}
        rows={[
          ["Nueva Habilidad", "3"],
          ["Nueva Senda (Nigromancia o Taumaturgia)", "7"],
          ["Nueva Disciplina", "10"],
          ["Atributo", "valor actual × 4"],
          ["Habilidad", "valor actual × 2"],
          ["Disciplina de clan", "valor actual × 5 *"],
          ["Otra Disciplina", "valor actual × 7 *"],
          [
            "Senda Secundaria (Nigromancia o Taumaturgia)",
            "valor actual × 4",
          ],
          ["Virtud", "valor actual × 2 **"],
          ["Humanidad", "valor actual × 2"],
          ["Fuerza de voluntad", "valor actual"],
        ]}
      />
      <p className="font-serif text-xs italic text-muted-foreground">
        * Los Caitiff no tienen Disciplinas de clan; el coste para todas sus
        Disciplinas es valor actual × 6.
      </p>
      <p className="font-serif text-xs italic text-muted-foreground">
        ** Aumentar una Virtud con experiencia NO sube automáticamente los
        rasgos que dependen de ella (Humanidad, Fuerza de voluntad).
      </p>
    </section>
  );
}

function MeleeManeuversTable() {
  return (
    <section className="space-y-4">
      <h3 className="font-heading text-base uppercase tracking-wider text-blood">
        Maniobras de combate cuerpo a cuerpo
      </h3>
      <Table
        headers={["Maniobra", "Rasgos", "Precisión", "Dificultad", "Daño"]}
        rows={[
          ["Agarrón", "Fue + Pelea", "Normal", "Normal", "Fue (S)"],
          ["Arma", "Des + Armas CC", "Normal", "Normal", "Arma"],
          ["Barrido", "Des + Pelea/Armas CC", "Normal", "+1", "Fue (D)"],
          ["Bloqueo", "Des + Pelea", "Especial", "Normal", "(R)"],
          ["Desarmar", "Des + Armas CC", "Normal", "+1", "Especial"],
          ["Esquivar", "Des + Esquivar", "Normal", "Normal", "—"],
          ["Garra", "Fue + Pelea", "Normal", "Normal", "Fue +1 (A)"],
          ["Mordisco", "Fue + Pelea", "+1", "Normal", "Fue +1 (A)"],
          ["Parada", "Des + Armas CC", "Especial", "Normal", "(R)"],
          ["Patada", "Des + Pelea", "Normal", "+1", "Fue +1"],
          ["Placaje", "Fue + Pelea", "Normal", "+1", "Fue +1 (D)"],
          ["Presa", "Fue + Pelea", "Normal", "Normal", "(S)"],
          ["Puñetazo", "Des + Pelea", "Normal", "Normal", "Fue"],
        ]}
      />
      <ul className="font-serif text-xs italic text-muted-foreground space-y-0.5">
        <li>(A) Inflige daño agravado.</li>
        <li>(D) La maniobra provoca un derribo.</li>
        <li>(R) Reduce los dados del ataque del oponente.</li>
        <li>(S) Se extiende a turnos sucesivos.</li>
      </ul>
    </section>
  );
}

function RangedManeuversTable() {
  return (
    <section className="space-y-4">
      <h3 className="font-heading text-base uppercase tracking-wider text-blood">
        Maniobras de combate a distancia
      </h3>
      <Table
        headers={["Maniobra", "Rasgos", "Precisión", "Dificultad", "Daño"]}
        rows={[
          [
            "Disparos múltiples",
            "Des + Armas de fuego",
            "Especial",
            "Normal",
            "Arma",
          ],
          [
            "Fuego automático",
            "Des + Armas de fuego",
            "+10",
            "+2",
            "Arma",
          ],
          [
            "Fuego de cobertura",
            "Des + Armas de fuego",
            "Especial",
            "+1/munición nula",
            "Arma",
          ],
          ["Ráfaga", "Des + Armas de fuego", "+10", "+1", "Arma"],
          ["Ráfaga de 3 balas", "Des + Armas de fuego", "+2", "+1", "Arma"],
        ]}
      />
    </section>
  );
}

function ArmorTable() {
  return (
    <section className="space-y-4">
      <h3 className="font-heading text-base uppercase tracking-wider text-blood">
        Tabla de armadura
      </h3>
      <Table
        headers={["Clase", "Puntuación", "Penalización"]}
        rows={[
          ["Clase Uno (ropa reforzada)", 1, 0],
          ["Clase Dos (chaleco)", 2, 1],
          ["Clase Tres (Kevlar)", 3, 1],
          ["Clase Cuatro (antibalas)", 4, 2],
          ["Clase Cinco (antidisturbios)", 5, 3],
        ]}
      />
      <p className="font-serif text-xs italic text-muted-foreground">
        La armadura añade su puntuación a la reserva de absorción contra daño
        contundente y letal, y también contra el agravado de colmillos y
        garras. No protege contra el fuego ni la luz del sol. La penalización
        se resta de las reservas de coordinación y agilidad (casi todas las de
        Destreza). Apuntar a una zona no protegida (Narrador asigna +1 o +2 a
        la dificultad) ignora la armadura.
      </p>
    </section>
  );
}
