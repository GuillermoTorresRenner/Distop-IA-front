import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import type {
  Armor,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";
import { MarkdownEditor } from "~/components/common/markdown-editor";
import { Button } from "~/components/ui/button";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import { WizardCard } from "../wizard-primitives";
import type { WizardState } from "../wizard-state";

interface StepEquipmentProps {
  state: WizardState;
  onChangeNotes: (equipmentNotes: string) => void;
  onChangeWeapons: (weapons: { weaponId: string }[]) => void;
  onChangeArmors: (armors: { armorId: string }[]) => void;
  weapons: Weapon[];
  weaponCategories: WeaponCategory[];
  armors: Armor[];
}



const HELP_TEXT = `
Aquí defines el equipo inicial: armas, armadura y todo lo que le da forma
tangible al personaje. Los selectores cargan el catálogo V20; el campo de
abajo es texto libre con markdown para lo que las casillas no pueden contar.

Si necesitas un arma o armadura **personalizada** (no aparece en el catálogo),
la añadirás más tarde desde la hoja (botón "Nueva arma" / "Nueva armadura").
`.trim();

export function StepEquipment({
  state,
  onChangeNotes,
  onChangeWeapons,
  onChangeArmors,
  weapons,
  weaponCategories,
  armors,
}: StepEquipmentProps) {
  const meleeWeapons = useMemo(
    () => weapons.filter((w) => w.kind === "MELEE"),
    [weapons],
  );
  const rangedWeapons = useMemo(
    () => weapons.filter((w) => w.kind === "RANGED"),
    [weapons],
  );
  const meleeCategoriesOrder = useMemo(
    () => weaponCategories.filter((c) => c.kind === "MELEE"),
    [weaponCategories],
  );
  const rangedCategoriesOrder = useMemo(
    () => weaponCategories.filter((c) => c.kind === "RANGED"),
    [weaponCategories],
  );
  const weaponsById = useMemo(() => {
    const m = new Map<string, Weapon>();
    for (const w of weapons) m.set(w.id, w);
    return m;
  }, [weapons]);
  const armorsById = useMemo(() => {
    const m = new Map<string, Armor>();
    for (const a of armors) m.set(a.id, a);
    return m;
  }, [armors]);

  const myMelee = state.weapons.filter(
    (w) => weaponsById.get(w.weaponId)?.kind === "MELEE",
  );
  const myRanged = state.weapons.filter(
    (w) => weaponsById.get(w.weaponId)?.kind === "RANGED",
  );

  function addWeapon(weaponId: string) {
    if (!weaponId) return;
    onChangeWeapons([...state.weapons, { weaponId }]);
  }

  function removeWeapon(weaponId: string, occurrence: number) {
    let seen = -1;
    const next = state.weapons.filter((w) => {
      if (w.weaponId !== weaponId) return true;
      seen += 1;
      return seen !== occurrence;
    });
    onChangeWeapons(next);
  }

  function addArmor(armorId: string) {
    if (!armorId) return;
    onChangeArmors([...state.armors, { armorId }]);
  }

  function removeArmor(armorId: string, occurrence: number) {
    let seen = -1;
    const next = state.armors.filter((a) => {
      if (a.armorId !== armorId) return true;
      seen += 1;
      return seen !== occurrence;
    });
    onChangeArmors(next);
  }

  return (
    <WizardCard
      title="Paso siete · Equipo y pertenencias"
      subtitle="Cuenta qué lleva tu vástago al iniciar la crónica."
      description={
        <>
          Selecciona armas y armadura del catálogo V20 y, abajo, describe el
          resto del equipo en lenguaje narrativo. Todo es opcional: podrás
          completarlo más adelante desde la hoja.
        </>
      }
    >
      <details className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[0.75rem] text-muted-foreground">
        <summary className="cursor-pointer font-heading uppercase tracking-widest text-blood">
          ¿Cómo escribirlo?
        </summary>
        <div className="markdown-content mt-2 font-serif text-foreground/85">
          {HELP_TEXT.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </details>

      <CatalogPickerSection
        title="Armas cuerpo a cuerpo"
        emptyHint="Sin armas cuerpo a cuerpo."
        selectLabel="Añadir arma cuerpo a cuerpo"
        items={myMelee.map((row, idx) => {
          const w = weaponsById.get(row.weaponId);
          // `occurrence` es el índice de aparición dentro del grupo (cc/ranged)
          // del mismo weaponId, para soportar duplicados al eliminar.
          const occurrence = myMelee
            .slice(0, idx)
            .filter((r) => r.weaponId === row.weaponId).length;
          return {
            key: `${row.weaponId}-${idx}`,
            id: row.weaponId,
            occurrence,
            primary: w?.name ?? "Arma desconocida",
            secondary: weaponSecondary(w),
          };
        })}
        onRemove={removeWeapon}
      >
        <WeaponSelect
          weapons={meleeWeapons}
          categoriesOrder={meleeCategoriesOrder}
          onPick={addWeapon}
        />
      </CatalogPickerSection>

      <CatalogPickerSection
        title="Armas a distancia"
        emptyHint="Sin armas a distancia."
        selectLabel="Añadir arma a distancia"
        items={myRanged.map((row, idx) => {
          const w = weaponsById.get(row.weaponId);
          const occurrence = myRanged
            .slice(0, idx)
            .filter((r) => r.weaponId === row.weaponId).length;
          return {
            key: `${row.weaponId}-${idx}`,
            id: row.weaponId,
            occurrence,
            primary: w?.name ?? "Arma desconocida",
            secondary: weaponSecondary(w),
          };
        })}
        onRemove={removeWeapon}
      >
        <WeaponSelect
          weapons={rangedWeapons}
          categoriesOrder={rangedCategoriesOrder}
          onPick={addWeapon}
        />
      </CatalogPickerSection>

      <CatalogPickerSection
        title="Armaduras"
        emptyHint="Sin armadura."
        selectLabel="Añadir armadura"
        items={state.armors.map((row, idx) => {
          const a = armorsById.get(row.armorId);
          const occurrence = state.armors
            .slice(0, idx)
            .filter((r) => r.armorId === row.armorId).length;
          return {
            key: `${row.armorId}-${idx}`,
            id: row.armorId,
            occurrence,
            primary: a?.name ?? "Armadura desconocida",
            secondary: armorSecondary(a),
          };
        })}
        onRemove={removeArmor}
      >
        <ArmorSelect armors={armors} onPick={addArmor} />
      </CatalogPickerSection>

      <div className="space-y-2 pt-2">
        <h3 className="font-heading text-sm uppercase tracking-[0.3em] text-blood">
          Pertenencias narrativas
        </h3>
        <p className="font-serif text-xs italic text-muted-foreground">
          Vestimenta, objetos cotidianos, recuerdos, vehículos, refugio. Texto
          libre con markdown — complementa los selectores de arriba.
        </p>
        <div className="h-96 overflow-hidden rounded-md border border-border bg-background/40">
          <MarkdownEditor
            value={state.equipmentNotes}
            onChange={onChangeNotes}
            maxLength={8000}
          />
        </div>
      </div>
    </WizardCard>
  );
}

interface CatalogPickerItem {
  key: string;
  id: string;
  occurrence: number;
  primary: string;
  secondary: string;
}

interface CatalogPickerSectionProps {
  title: string;
  emptyHint: string;
  selectLabel: string;
  items: CatalogPickerItem[];
  onRemove: (id: string, occurrence: number) => void;
  children: React.ReactNode;
}

function CatalogPickerSection({
  title,
  emptyHint,
  selectLabel,
  items,
  onRemove,
  children,
}: CatalogPickerSectionProps) {
  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <h3 className="font-heading text-sm uppercase tracking-[0.3em] text-blood">
          {title}
        </h3>
      </header>
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/40 bg-background/40 p-3">
        <div className="min-w-50 flex-1 space-y-1">
          <label className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            {selectLabel}
          </label>
          {children}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="font-serif text-xs italic text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-card/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-heading text-sm uppercase tracking-wide text-foreground">
                  {item.primary}
                </p>
                <p className="font-serif text-xs italic text-muted-foreground">
                  {item.secondary}
                </p>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => onRemove(item.id, item.occurrence)}
                aria-label="Quitar"
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface WeaponSelectProps {
  weapons: Weapon[];
  categoriesOrder: WeaponCategory[];
  onPick: (id: string) => void;
}

function WeaponSelect({
  weapons,
  categoriesOrder,
  onPick,
}: WeaponSelectProps) {
  const grouped = useMemo(() => {
    const byCategoryId = new Map<string, Weapon[]>();
    for (const w of weapons) {
      const list = byCategoryId.get(w.categoryId) ?? [];
      list.push(w);
      byCategoryId.set(w.categoryId, list);
    }
    return categoriesOrder
      .filter((c) => byCategoryId.has(c.id))
      .map((c) => ({ category: c, items: byCategoryId.get(c.id) ?? [] }));
  }, [weapons, categoriesOrder]);

  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) {
          onPick(e.target.value);
          e.target.value = "";
        }
      }}
      className={SELECT_DARK_CLASS}
    >
      <option value="">Selecciona un arma...</option>
      {grouped.map(({ category, items }) => (
        <optgroup key={category.id} label={category.name}>
          {[...items]
            .sort((a, b) =>
              a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
            )
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
                {w.system ? "" : " (custom)"}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

interface ArmorSelectProps {
  armors: Armor[];
  onPick: (id: string) => void;
}

function ArmorSelect({ armors, onPick }: ArmorSelectProps) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) {
          onPick(e.target.value);
          e.target.value = "";
        }
      }}
      className={SELECT_DARK_CLASS}
    >
      <option value="">Selecciona una armadura...</option>
      {[...armors]
        .sort((a, b) =>
          a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
        )
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.system ? "" : " (custom)"}
          </option>
        ))}
    </select>
  );
}

function weaponSecondary(w: Weapon | undefined): string {
  if (!w) return "—";
  const dmg = `Daño ${w.damageBase ?? "—"}${w.damageBonus ? ` +${w.damageBonus}` : ""}`;
  const tag = w.lethal ? "Letal" : w.aggravated ? "Agravado" : "Contundente";
  const cat = w.category?.name ?? "";
  return [cat, dmg, tag].filter(Boolean).join(" · ");
}

function armorSecondary(a: Armor | undefined): string {
  if (!a) return "—";
  return `Protección ${a.rating} · Penalización ${a.penalty}`;
}
