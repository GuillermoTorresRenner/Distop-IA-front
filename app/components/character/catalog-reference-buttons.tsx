import { Crosshair, Shield, Sword, Swords, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import type {
  Armor,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";

type ModalKind = "maneuvers" | "melee" | "ranged" | "armor";

interface Props {
  weapons: Weapon[];
  weaponCategories: WeaponCategory[];
  armors: Armor[];
}

export function CatalogReferenceButtons({
  weapons,
  weaponCategories,
  armors,
}: Props) {
  const [open, setOpen] = useState<ModalKind | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const meleeWeapons = useMemo(
    () => weapons.filter((w) => w.kind === "MELEE" && w.system),
    [weapons],
  );
  const rangedWeapons = useMemo(
    () => weapons.filter((w) => w.kind === "RANGED" && w.system),
    [weapons],
  );
  const systemArmors = useMemo(
    () => armors.filter((a) => a.system),
    [armors],
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
      <Tooltip content="Tabla de maniobras de combate CC y a distancia (V20)">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen("maneuvers")}
          className="border-blood/40 text-blood hover:bg-blood/10"
        >
          <Swords className="size-4" />
          Maniobras
        </Button>
      </Tooltip>
      <Tooltip content="Catálogo de armas cuerpo a cuerpo (V20)">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen("melee")}
          className="border-blood/40 text-blood hover:bg-blood/10"
        >
          <Sword className="size-4" />
          Armas CC
        </Button>
      </Tooltip>
      <Tooltip content="Catálogo de armas de fuego (V20)">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen("ranged")}
          className="border-blood/40 text-blood hover:bg-blood/10"
        >
          <Crosshair className="size-4" />
          Armas de fuego
        </Button>
      </Tooltip>
      <Tooltip content="Catálogo de armaduras (V20)">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen("armor")}
          className="border-blood/40 text-blood hover:bg-blood/10"
        >
          <Shield className="size-4" />
          Armaduras
        </Button>
      </Tooltip>

      {open ? (
        <CatalogModal
          kind={open}
          onClose={() => setOpen(null)}
          meleeWeapons={meleeWeapons}
          rangedWeapons={rangedWeapons}
          armors={systemArmors}
          weaponCategories={weaponCategories}
        />
      ) : null}
    </div>
  );
}

function CatalogModal({
  kind,
  onClose,
  meleeWeapons,
  rangedWeapons,
  armors,
  weaponCategories,
}: {
  kind: ModalKind;
  onClose: () => void;
  meleeWeapons: Weapon[];
  rangedWeapons: Weapon[];
  armors: Armor[];
  weaponCategories: WeaponCategory[];
}) {
  const title =
    kind === "maneuvers"
      ? "Maniobras de combate"
      : kind === "melee"
        ? "Armas cuerpo a cuerpo"
        : kind === "ranged"
          ? "Armas de fuego"
          : "Armaduras";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-lg border border-blood/40 bg-card shadow-2xl shadow-blood/20"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-blood/10 px-5 py-3">
          <div>
            <p className="font-heading text-[0.65rem] uppercase tracking-[0.4em] text-blood">
              Catálogo · V20
            </p>
            <h2 className="font-heading text-xl uppercase tracking-wider text-foreground">
              {title}
            </h2>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {kind === "maneuvers" ? (
            <ManeuversCatalog />
          ) : kind === "melee" ? (
            <WeaponCatalog
              weapons={meleeWeapons}
              categories={weaponCategories.filter((c) => c.kind === "MELEE")}
              kind="MELEE"
            />
          ) : kind === "ranged" ? (
            <WeaponCatalog
              weapons={rangedWeapons}
              categories={weaponCategories.filter((c) => c.kind === "RANGED")}
              kind="RANGED"
            />
          ) : (
            <ArmorCatalog armors={armors} />
          )}
        </div>

        <footer className="border-t border-border/60 bg-background/40 px-5 py-3">
          <p className="font-serif text-xs italic text-muted-foreground">
            Fuente: Vampiro: la Mascarada V20.
          </p>
        </footer>
      </div>
    </div>
  );
}

function WeaponCatalog({
  weapons,
  categories,
  kind,
}: {
  weapons: Weapon[];
  categories: WeaponCategory[];
  kind: "MELEE" | "RANGED";
}) {
  const grouped = useMemo(() => {
    const byCat = new Map<string, Weapon[]>();
    for (const w of weapons) {
      const list = byCat.get(w.categoryId) ?? [];
      list.push(w);
      byCat.set(w.categoryId, list);
    }
    return categories
      .map((c) => ({ category: c, list: byCat.get(c.id) ?? [] }))
      .filter((g) => g.list.length > 0);
  }, [weapons, categories]);

  if (weapons.length === 0) {
    return (
      <p className="font-serif text-sm italic text-muted-foreground">
        Aún no hay armas en el catálogo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ category, list }) => (
        <section key={category.id} className="space-y-2">
          <h3 className="font-heading text-base uppercase tracking-wider text-blood">
            {category.name}
          </h3>
          <div className="overflow-x-auto rounded-md border border-border/50">
            <table className="w-full text-sm">
              <thead className="bg-background/40 font-heading text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Daño</th>
                  {kind === "RANGED" ? (
                    <>
                      <th className="px-3 py-2 text-left">Alcance</th>
                      <th className="px-3 py-2 text-left">Cadencia</th>
                      <th className="px-3 py-2 text-left">Cargador</th>
                      <th className="px-3 py-2 text-left">Ocultación</th>
                    </>
                  ) : (
                    <th className="px-3 py-2 text-left">Tipo</th>
                  )}
                  <th className="px-3 py-2 text-left">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-serif">
                {list.map((w) => (
                  <tr key={w.id}>
                    <td className="px-3 py-1.5 font-medium text-foreground">
                      {w.name}
                    </td>
                    <td className="px-3 py-1.5">{formatDamage(w)}</td>
                    {kind === "RANGED" ? (
                      <>
                        <td className="px-3 py-1.5">
                          {w.range != null ? `${w.range} m` : "—"}
                        </td>
                        <td className="px-3 py-1.5">{w.rate ?? "—"}</td>
                        <td className="px-3 py-1.5">
                          {w.magazine != null ? w.magazine : "—"}
                        </td>
                        <td className="px-3 py-1.5">{w.concealment ?? "—"}</td>
                      </>
                    ) : (
                      <td className="px-3 py-1.5">{formatDamageType(w)}</td>
                    )}
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {w.notes ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="font-serif text-xs italic text-muted-foreground">
        El daño se mide en dados. <strong>Fue</strong> = se suma la Fuerza del
        atacante. Tipo: <strong>C</strong> contundente, <strong>L</strong>{" "}
        letal, <strong>A</strong> agravado.
      </p>
    </div>
  );
}

function ArmorCatalog({ armors }: { armors: Armor[] }) {
  if (armors.length === 0) {
    return (
      <p className="font-serif text-sm italic text-muted-foreground">
        Aún no hay armaduras en el catálogo.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-background/40 font-heading text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Puntuación</th>
              <th className="px-3 py-2 text-left">Penalización</th>
              <th className="px-3 py-2 text-left">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-serif">
            {armors.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-1.5 font-medium text-foreground">
                  {a.name}
                </td>
                <td className="px-3 py-1.5">{a.rating}</td>
                <td className="px-3 py-1.5">{a.penalty}</td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {a.description ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-serif text-xs italic text-muted-foreground">
        La <strong>puntuación</strong> se añade a la reserva de absorción contra
        daño contundente y letal (también contra colmillos y garras). La{" "}
        <strong>penalización</strong> se resta de las reservas de coordinación
        y agilidad. No protege contra fuego ni luz del sol.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Maniobras de combate (datos fijos V20, cap. 6)
// ─────────────────────────────────────────────────────────────────────────────

interface Maneuver {
  name: string;
  traits: string;
  accuracy: string;
  difficulty: string;
  damage: string;
  /** true = negrita en el manual (maniobra con restricciones especiales) */
  bold?: boolean;
}

const MELEE_MANEUVERS: Maneuver[] = [
  { name: "Agarrón",       traits: "Fue + Pelea",            accuracy: "Normal",   difficulty: "Normal", damage: "Fue (S)" },
  { name: "Arma",          traits: "Des + Armas C.C.",       accuracy: "Normal",   difficulty: "Normal", damage: "Arma" },
  { name: "Barrido",       traits: "Des + Pelea/Armas C.C.", accuracy: "Normal",   difficulty: "+1",     damage: "Fue (D)",  bold: true },
  { name: "Bloqueo",       traits: "Des + Pelea",            accuracy: "Especial", difficulty: "Normal", damage: "(R)",      bold: true },
  { name: "Desarmar",      traits: "Des + Armas C.C.",       accuracy: "Normal",   difficulty: "+1",     damage: "Especial" },
  { name: "Esquivar",      traits: "Des + Esquivar",         accuracy: "Especial", difficulty: "Normal", damage: "(R)" },
  { name: "Garra",         traits: "Des + Pelea",            accuracy: "Normal",   difficulty: "Normal", damage: "Fue +1 (A)" },
  { name: "Mordisco",      traits: "Des + Pelea",            accuracy: "+1",       difficulty: "Normal", damage: "Fue +1 (A)", bold: true },
  { name: "Parada",        traits: "Des + Armas C.C.",       accuracy: "Especial", difficulty: "Normal", damage: "(R)" },
  { name: "Patada",        traits: "Des + Pelea",            accuracy: "Normal",   difficulty: "+1",     damage: "Fue +1" },
  { name: "Placaje",       traits: "Fue + Pelea",            accuracy: "Normal",   difficulty: "+1",     damage: "Fue +1 (D)", bold: true },
  { name: "Presa",         traits: "Fue + Pelea",            accuracy: "Normal",   difficulty: "Normal", damage: "(S)" },
  { name: "Puñetazo",      traits: "Des + Pelea",            accuracy: "Normal",   difficulty: "Normal", damage: "Fue" },
];

const RANGED_MANEUVERS: Maneuver[] = [
  { name: "Disparos múltiples", traits: "Des + Armas de Fuego", accuracy: "Especial", difficulty: "Normal",       damage: "Arma" },
  { name: "Dos armas",          traits: "Des + Armas de Fuego", accuracy: "Especial", difficulty: "+1/mano mala", damage: "Arma" },
  { name: "Fuego automático",   traits: "Des + Armas de Fuego", accuracy: "+10",      difficulty: "+2",           damage: "Arma", bold: true },
  { name: "Ráfaga",             traits: "Des + Armas de Fuego", accuracy: "+10",      difficulty: "+2",           damage: "Arma", bold: true },
  { name: "Ráfaga de 3 balas",  traits: "Des + Armas de Fuego", accuracy: "+2",       difficulty: "+1",           damage: "Arma" },
];

const MANEUVER_NOTES = [
  "(A): la maniobra inflige daño agravado.",
  "(D): la maniobra provoca un derribo.",
  "(R): la maniobra reduce los éxitos del ataque del oponente.",
  "(S): la maniobra se extiende a turnos sucesivos.",
];

function ManeuversTable({ title, maneuvers }: { title: string; maneuvers: Maneuver[] }) {
  return (
    <section className="space-y-2">
      <h3 className="font-heading text-base uppercase tracking-wider text-blood">
        {title}
      </h3>
      <div className="overflow-x-auto rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-background/40 font-heading text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Maniobra</th>
              <th className="px-3 py-2 text-left">Rasgos</th>
              <th className="px-3 py-2 text-left">Precisión</th>
              <th className="px-3 py-2 text-left">Dificultad</th>
              <th className="px-3 py-2 text-left">Daño</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-serif">
            {maneuvers.map((m) => (
              <tr key={m.name} className={m.bold ? "font-semibold" : ""}>
                <td className="px-3 py-1.5 text-foreground">{m.name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{m.traits}</td>
                <td className="px-3 py-1.5">{m.accuracy}</td>
                <td className="px-3 py-1.5">{m.difficulty}</td>
                <td className="px-3 py-1.5">{m.damage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManeuversCatalog() {
  return (
    <div className="space-y-8">
      <ManeuversTable title="Combate cuerpo a cuerpo" maneuvers={MELEE_MANEUVERS} />
      <ManeuversTable title="Combate a distancia"     maneuvers={RANGED_MANEUVERS} />
      <ul className="space-y-1 font-serif text-xs text-muted-foreground">
        {MANEUVER_NOTES.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

function formatDamage(w: Weapon): string {
  const base = w.damageBase === "STRENGTH" ? "Fue" : "";
  const bonus =
    w.damageBonus > 0
      ? `+${w.damageBonus}`
      : w.damageBonus < 0
        ? `${w.damageBonus}`
        : "";
  const num = base ? `${base}${bonus}` : `${w.damageBonus}`;
  const type = formatDamageType(w);
  return type ? `${num} (${type})` : num;
}

function formatDamageType(w: Weapon): string {
  if (w.aggravated) return "A";
  if (w.lethal) return "L";
  if (w.bluntPlus) return "C+";
  return "C";
}
