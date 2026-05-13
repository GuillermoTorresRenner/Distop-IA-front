import { Loader2, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CharacterSheetForm } from "~/components/character/character-sheet-form";
import { CustomArmorDialog } from "~/components/character/custom-armor-dialog";
import { CustomWeaponDialog } from "~/components/character/custom-weapon-dialog";
import { QuickGuideButton } from "~/components/character/quick-guide-button";
import { ReferenceTablesButton } from "~/components/character/reference-tables-button";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import {
  listArchetypes,
  listArmors,
  listClans,
  listDisciplines,
  listMeritsFlaws,
  listWeaponCategories,
  listWeapons,
} from "~/lib/api/catalog/catalog.api";
import type {
  Archetype,
  Armor,
  Clan,
  Discipline,
  MeritFlaw,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";
import {
  createCharacter,
  createChronicleCharacter,
} from "~/lib/api/characters/characters.api";
import { getChronicle } from "~/lib/api/chronicles/chronicles.api";
import type {
  CharacterInput,
  CharacterKind,
} from "~/lib/api/characters/characters.types";
import { findTemplate } from "~/lib/antagonist-templates";
import { emptyCharacterInput } from "~/lib/character-sheet";

export function meta() {
  return [{ title: "Forjar vástago · Distop-IA VTT" }];
}

export default function NewCharacterRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chronicleId = searchParams.get("chronicleId") ?? undefined;
  const kindParam = searchParams.get("kind") as CharacterKind | null;
  const nameParam = searchParams.get("name") ?? "";
  const templateParam = searchParams.get("template") ?? "";

  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [meritsFlaws, setMeritsFlaws] = useState<MeritFlaw[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [weaponCategories, setWeaponCategories] = useState<WeaponCategory[]>([]);
  const [armors, setArmors] = useState<Armor[]>([]);
  const [chronicleName, setChronicleName] = useState<string | null>(null);
  const [value, setValue] = useState<CharacterInput>(emptyCharacterInput());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [armorDialogOpen, setArmorDialogOpen] = useState(false);

  useEffect(() => {
    const tasks: Promise<unknown>[] = [
      listArchetypes(),
      listClans(),
      listDisciplines(),
      listMeritsFlaws(),
      listWeapons(),
      listWeaponCategories(),
      listArmors(),
    ];
    if (chronicleId) tasks.push(getChronicle(chronicleId));

    Promise.all(tasks)
      .then((results) => {
        const [a, c, d, m, w, wc, ar, ch] = results as [
          Archetype[],
          Clan[],
          Discipline[],
          MeritFlaw[],
          Weapon[],
          WeaponCategory[],
          Armor[],
          { name: string }?,
        ];
        setArchetypes(a);
        setClans(c);
        setDisciplines(d);
        setMeritsFlaws(m);
        setWeapons(w);
        setWeaponCategories(wc);
        setArmors(ar);
        // Aplica datos vinientes desde el dialog "Crear PNJ":
        // kind, name y plantilla opcional.
        setValue((prev) => {
          let next: CharacterInput = { ...prev };
          if (kindParam) next.kind = kindParam;
          if (nameParam) next.name = nameParam;
          if (templateParam) {
            const tpl = findTemplate(templateParam);
            if (tpl) next = tpl.apply(next);
          }
          if (ch) next.chronicleName = ch.name;
          return next;
        });
        if (ch) setChronicleName(ch.name);
      })
      .catch((err) => setError(extractAuthError(err, "No se pudieron cargar los catálogos")))
      .finally(() => setLoading(false));
  }, [chronicleId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!value.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      // Filtra abilities con value 0 para no enviar 30 filas vacías
      const payload: CharacterInput = {
        ...value,
        abilities: (value.abilities ?? []).filter((a) => a.value > 0),
      };
      const created = chronicleId
        ? await createChronicleCharacter(chronicleId, payload)
        : await createCharacter(payload);
      navigate(
        chronicleId ? `/chronicles/${chronicleId}` : `/characters/${created.id}`,
        { replace: true },
      );
    } catch (err) {
      setError(extractAuthError(err, "No se pudo crear el personaje"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="font-serif italic text-muted-foreground">Cargando catálogos...</p>;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={
          value.kind === "ANTAGONIST"
            ? "Antagonista"
            : value.kind === "NPC"
              ? "PNJ"
              : chronicleName
                ? `Forja · ${chronicleName}`
                : "Forja"
        }
        title={
          value.kind === "ANTAGONIST"
            ? "Nuevo antagonista"
            : value.kind === "NPC"
              ? "Nuevo PNJ"
              : "Nuevo vástago"
        }
        description={
          chronicleName
            ? `Este personaje quedará asociado a la crónica «${chronicleName}» al guardarlo.`
            : "Completa la hoja del personaje. Más adelante podrás asociarlo a una crónica."
        }
        actions={
          <div className="flex items-center gap-2">
            <ReferenceTablesButton />
            <QuickGuideButton />
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? <FormAlert message={error} /> : null}
        <CharacterSheetForm
          value={value}
          onChange={setValue}
          archetypes={archetypes}
          clans={clans}
          disciplines={disciplines}
          meritsFlaws={meritsFlaws}
          weapons={weapons}
          weaponCategories={weaponCategories}
          armors={armors}
          onCreateWeapon={() => setWeaponDialogOpen(true)}
          onCreateArmor={() => setArmorDialogOpen(true)}
        />
        <div className="flex items-center gap-3 border-t border-border/60 pt-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-blood text-blood-foreground hover:bg-blood/90"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Crear personaje
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate(chronicleId ? `/chronicles/${chronicleId}` : "/characters")
            }
          >
            Cancelar
          </Button>
        </div>
      </form>

      <CustomWeaponDialog
        open={weaponDialogOpen}
        categories={weaponCategories}
        onClose={() => setWeaponDialogOpen(false)}
        onCreated={(w) => {
          setWeapons((prev) => [...prev, w]);
          setValue((prev) => ({
            ...prev,
            weapons: [...(prev.weapons ?? []), { weaponId: w.id }],
          }));
          setWeaponDialogOpen(false);
        }}
      />
      <CustomArmorDialog
        open={armorDialogOpen}
        onClose={() => setArmorDialogOpen(false)}
        onCreated={(a) => {
          setArmors((prev) => [...prev, a]);
          setValue((prev) => ({
            ...prev,
            armors: [...(prev.armors ?? []), { armorId: a.id }],
          }));
          setArmorDialogOpen(false);
        }}
      />
    </section>
  );
}
