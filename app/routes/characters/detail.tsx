import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CharacterSheetForm } from "~/components/character/character-sheet-form";
import { CustomArmorDialog } from "~/components/character/custom-armor-dialog";
import { CustomWeaponDialog } from "~/components/character/custom-weapon-dialog";
import { QuickGuideButton } from "~/components/character/quick-guide-button";
import { ReferenceTablesButton } from "~/components/character/reference-tables-button";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/hooks/use-confirm";
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
  deleteCharacter,
  getCharacter,
  updateCharacter,
} from "~/lib/api/characters/characters.api";
import type {
  Character,
  CharacterInput,
} from "~/lib/api/characters/characters.types";

export function meta() {
  return [{ title: "Vástago · Distop-IA VTT" }];
}

function toInput(c: Character): CharacterInput {
  return {
    kind: c.kind,
    name: c.name,
    concept: c.concept ?? undefined,
    chronicleName: c.chronicleName ?? undefined,
    generation: c.generation ?? undefined,
    haven: c.haven ?? undefined,
    clanId: c.clanId ?? undefined,
    natureId: c.natureId ?? undefined,
    demeanorId: c.demeanorId ?? undefined,
    strength: c.strength,
    dexterity: c.dexterity,
    stamina: c.stamina,
    charisma: c.charisma,
    manipulation: c.manipulation,
    appearance: c.appearance,
    perception: c.perception,
    intelligence: c.intelligence,
    wits: c.wits,
    virtueScheme: c.virtueScheme,
    conscience: c.conscience,
    selfControl: c.selfControl,
    courage: c.courage,
    humanity: c.humanity,
    willpowerMax: c.willpowerMax,
    willpowerCurrent: c.willpowerCurrent,
    bloodPool: c.bloodPool,
    healthBruised: c.healthBruised,
    healthHurt: c.healthHurt,
    healthInjured: c.healthInjured,
    healthWounded: c.healthWounded,
    healthMauled: c.healthMauled,
    healthCrippled: c.healthCrippled,
    healthIncapacitated: c.healthIncapacitated,
    experience: c.experience,
    abilities: c.abilities.map((a) => ({
      category: a.category,
      name: a.name,
      value: a.value,
      specialty: a.specialty,
    })),
    backgrounds: c.backgrounds.map((b) => ({
      name: b.name,
      level: b.level,
      notes: b.notes,
    })),
    disciplines: c.disciplines.map((d) => ({
      disciplineId: d.disciplineId,
      level: d.level,
    })),
    meritsFlaws: c.meritsFlaws.map((m) => ({
      meritFlawId: m.meritFlawId,
      notes: m.notes,
    })),
    weapons: c.weapons.map((w) => ({
      weaponId: w.weaponId,
      notes: w.notes,
      order: w.order,
    })),
    armors: c.armors.map((a) => ({
      armorId: a.armorId,
      notes: a.notes,
      order: a.order,
    })),
    notes: c.notes ?? undefined,
  };
}

export default function CharacterDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();

  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [meritsFlaws, setMeritsFlaws] = useState<MeritFlaw[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [weaponCategories, setWeaponCategories] = useState<WeaponCategory[]>([]);
  const [armors, setArmors] = useState<Armor[]>([]);

  const [character, setCharacter] = useState<Character | null>(null);
  const [value, setValue] = useState<CharacterInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [armorDialogOpen, setArmorDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getCharacter(id),
      listArchetypes(),
      listClans(),
      listDisciplines(),
      listMeritsFlaws(),
      listWeapons(),
      listWeaponCategories(),
      listArmors(),
    ])
      .then(([c, a, cl, d, m, w, wc, ar]) => {
        setCharacter(c);
        setValue(toInput(c));
        setArchetypes(a);
        setClans(cl);
        setDisciplines(d);
        setMeritsFlaws(m);
        setWeapons(w);
        setWeaponCategories(wc);
        setArmors(ar);
      })
      .catch((err) => setError(extractAuthError(err, "No se pudo cargar el personaje")))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !value) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload: Partial<CharacterInput> = {
        ...value,
        abilities: (value.abilities ?? []).filter((a) => a.value > 0),
      };
      const updated = await updateCharacter(id, payload);
      setCharacter(updated);
      setValue(toInput(updated));
      setSuccess("Cambios guardados.");
    } catch (err) {
      setError(extractAuthError(err, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !character) return;
    const ok = await confirm({
      title: "Eliminar vástago",
      description: (
        <>
          ¿Seguro que quieres eliminar a{" "}
          <strong className="text-foreground">{character.name}</strong>? Esta
          acción no se puede deshacer y también eliminará sus vínculos a
          crónicas.
        </>
      ),
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteCharacter(id);
      navigate("/characters", { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo eliminar"));
    }
  }

  if (loading || !value || !character) {
    return (
      <p className="text-muted-foreground">
        {error ?? "Cargando vástago..."}
      </p>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={
          character.kind === "ANTAGONIST"
            ? `Antagonista${character.clan?.name ? ` · ${character.clan.name}` : ""}`
            : character.kind === "NPC"
              ? `PNJ${character.clan?.name ? ` · ${character.clan.name}` : ""}`
              : (character.clan?.name ?? "Vástago")
        }
        title={character.name}
        description={character.concept ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <ReferenceTablesButton />
            <QuickGuideButton />
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Eliminar
            </Button>
          </div>
        }
      />

      {error ? <FormAlert message={error} /> : null}
      {success ? <FormAlert kind="success" message={success} /> : null}

      {character.chronicles.length > 0 ? (
        <article className="rounded-lg border border-border/60 bg-card/70 p-4">
          <h2 className="mb-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
            Crónicas en las que participa
          </h2>
          <p className="mb-3 font-serif text-xs italic text-muted-foreground">
            Para vincular o quitar al vástago de una mesa, ve al detalle de la
            crónica correspondiente.
          </p>
          <ul className="flex flex-wrap gap-2">
            {character.chronicles.map((link) => (
              <li key={link.id}>
                <Link
                  to={`/chronicles/${link.chronicleId}`}
                  className="inline-flex items-center rounded-full border border-blood/40 bg-blood/10 px-3 py-1 font-serif text-xs text-foreground hover:bg-blood/20"
                >
                  {link.chronicle.name}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
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
            Guardar cambios
          </Button>
        </div>
      </form>

      <CustomWeaponDialog
        open={weaponDialogOpen}
        categories={weaponCategories}
        onClose={() => setWeaponDialogOpen(false)}
        onCreated={(w) => {
          setWeapons((prev) => [...prev, w]);
          setValue((prev) =>
            prev
              ? { ...prev, weapons: [...(prev.weapons ?? []), { weaponId: w.id }] }
              : prev,
          );
          setWeaponDialogOpen(false);
        }}
      />
      <CustomArmorDialog
        open={armorDialogOpen}
        onClose={() => setArmorDialogOpen(false)}
        onCreated={(a) => {
          setArmors((prev) => [...prev, a]);
          setValue((prev) =>
            prev
              ? { ...prev, armors: [...(prev.armors ?? []), { armorId: a.id }] }
              : prev,
          );
          setArmorDialogOpen(false);
        }}
      />

      {dialog}
    </section>
  );
}
