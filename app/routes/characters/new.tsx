import { Loader2, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CharacterSheetForm } from "~/components/character/character-sheet-form";
import { CustomArmorDialog } from "~/components/character/custom-armor-dialog";
import { CustomWeaponDialog } from "~/components/character/custom-weapon-dialog";
import { QuickGuideButton } from "~/components/character/quick-guide-button";
import { ReferenceTablesButton } from "~/components/character/reference-tables-button";
import { CharacterWizard } from "~/components/character/wizard/character-wizard";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import {
  listAbilitiesInfo,
  listArchetypes,
  listArmors,
  listAttributesInfo,
  listBackgrounds,
  listClans,
  listDisciplines,
  listMeritsFlaws,
  listVirtues,
  listWeaponCategories,
  listWeapons,
} from "~/lib/api/catalog/catalog.api";
import type {
  AbilityInfo,
  Archetype,
  Armor,
  AttributeInfo,
  Background,
  Clan,
  Discipline,
  MeritFlaw,
  Virtue,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";
import {
  createCharacter,
  createChronicleCharacter,
  uploadCharacterAvatar,
} from "~/lib/api/characters/characters.api";
import { getChronicle } from "~/lib/api/chronicles/chronicles.api";
import type {
  CharacterInput,
  CharacterKind,
} from "~/lib/api/characters/characters.types";
import { findTemplate } from "~/lib/antagonist-templates";
import {
  emptyCharacterInput,
  isCharacterInputDirty,
} from "~/lib/character-sheet";
import { useUnsavedChangesGuard } from "~/hooks/use-unsaved-changes-guard";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Crear vástago · Distop-IA VTT" }];
}

export default function NewCharacterRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chronicleId = searchParams.get("chronicleId") ?? undefined;
  const currentUser = useUserStore((s) => s.user);
  const ownerNick =
    currentUser?.nickname ||
    currentUser?.email?.split("@")[0] ||
    null;
  const kindParam = searchParams.get("kind") as CharacterKind | null;
  const nameParam = searchParams.get("name") ?? "";
  const templateParam = searchParams.get("template") ?? "";

  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [meritsFlaws, setMeritsFlaws] = useState<MeritFlaw[]>([]);
  const [backgroundsCatalog, setBackgroundsCatalog] = useState<Background[]>([]);
  const [attributes, setAttributes] = useState<AttributeInfo[]>([]);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [virtues, setVirtues] = useState<Virtue[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [weaponCategories, setWeaponCategories] = useState<WeaponCategory[]>([]);
  const [armors, setArmors] = useState<Armor[]>([]);
  const [chronicleName, setChronicleName] = useState<string | null>(null);
  const [value, setValue] = useState<CharacterInput>(emptyCharacterInput());
  // Snapshot del estado tras aplicar params/template iniciales. Sirve para
  // saber si el jugador realmente tocó algo más allá de los autocompletados.
  // Mientras es null el guard se mantiene apagado (catálogos aún cargando).
  const [pristine, setPristine] = useState<CharacterInput | null>(null);
  // Bandera para desactivar el guard justo antes de un navigate intencional
  // (post-create). Sin esto, el blocker interceptaría la redirección al
  // detalle del personaje recién creado.
  const [skipGuard, setSkipGuard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [armorDialogOpen, setArmorDialogOpen] = useState(false);
  // El wizard de creación V20 sólo aplica a PCs (sin plantilla rápida). Se
  // muestra automáticamente la primera vez que se entra a /characters/new
  // siempre que el usuario no esté creando un NPC/Antagonista por plantilla.
  const isPCFlow =
    (kindParam == null || kindParam === "PC") && !templateParam;
  const [wizardOpen, setWizardOpen] = useState(isPCFlow);
  // Estado de guardado del wizard: el modal final lo consume para mostrar
  // spinner y mensajes de error sin cerrar el wizard.
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const dirty =
    !skipGuard && !!pristine && isCharacterInputDirty(value, pristine);
  const { dialog: unsavedDialog } = useUnsavedChangesGuard({ dirty });

  useEffect(() => {
    const tasks: Promise<unknown>[] = [
      listArchetypes(),
      listClans(),
      listDisciplines(),
      listMeritsFlaws(),
      listBackgrounds(),
      listAttributesInfo(),
      listAbilitiesInfo(),
      listVirtues(),
      listWeapons(),
      listWeaponCategories(),
      listArmors(),
    ];
    if (chronicleId) tasks.push(getChronicle(chronicleId));

    Promise.all(tasks)
      .then((results) => {
        const [a, c, d, m, bg, attrs, abil, virt, w, wc, ar, ch] = results as [
          Archetype[],
          Clan[],
          Discipline[],
          MeritFlaw[],
          Background[],
          AttributeInfo[],
          AbilityInfo[],
          Virtue[],
          Weapon[],
          WeaponCategory[],
          Armor[],
          { name: string }?,
        ];
        setArchetypes(a);
        setClans(c);
        setDisciplines(d);
        setMeritsFlaws(m);
        setBackgroundsCatalog(bg);
        setAttributes(attrs);
        setAbilities(abil);
        setVirtues(virt);
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
          // Capturamos el estado base tras inyectar params/template para
          // que el guard solo compare contra esto y no contra el empty puro.
          setPristine(next);
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
      // Desactiva el guard antes de redirigir: ya guardamos lo que el
      // jugador editó, no hay motivo para interceptar la navegación.
      setSkipGuard(true);
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
    return <p className="text-muted-foreground">Cargando catálogos...</p>;
  }

  async function handleWizardComplete(
    mapped: Partial<CharacterInput>,
    extras: { avatarFile: File | null },
  ) {
    // Combinamos el resultado del wizard con el estado actual del form para
    // construir el payload final, y guardamos directamente sin pasar por la
    // hoja. El modal final del wizard se queda abierto mientras dura el
    // POST: muestra spinner; si falla, muestra el error y permite reintentar.
    setWizardError(null);
    setWizardSaving(true);
    const next: CharacterInput = { ...value, ...mapped };
    try {
      const payload: CharacterInput = {
        ...next,
        abilities: (next.abilities ?? []).filter((a) => a.value > 0),
      };
      const created = chronicleId
        ? await createChronicleCharacter(chronicleId, payload)
        : await createCharacter(payload);

      // Si el wizard incluyó un retrato, lo subimos ahora — el endpoint
      // requiere `characterId`, así que esto va después del create. Un fallo
      // aquí no debe abortar la creación: el personaje ya existe; mostramos
      // un warning y seguimos a la hoja.
      if (extras.avatarFile) {
        try {
          await uploadCharacterAvatar(created.id, extras.avatarFile);
        } catch (uploadErr) {
          // eslint-disable-next-line no-console
          console.warn("No se pudo subir el retrato del personaje", uploadErr);
        }
      }

      // Actualiza el form (por si el usuario vuelve atrás en la historia) y
      // resetea el pristine para que el guard no salte.
      setValue(next);
      setPristine(next);
      setSkipGuard(true);
      setWizardOpen(false);
      navigate(
        chronicleId ? `/chronicles/${chronicleId}` : `/characters/${created.id}`,
        { replace: true },
      );
    } catch (err) {
      setWizardError(extractAuthError(err, "No se pudo crear el personaje"));
    } finally {
      setWizardSaving(false);
    }
  }

  function handleWizardCancel() {
    setSkipGuard(true);
    navigate(chronicleId ? `/chronicles/${chronicleId}` : "/characters", {
      replace: true,
    });
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
          backgrounds={backgroundsCatalog}
          attributes={attributes}
          abilities={abilities}
          virtues={virtues}
          weapons={weapons}
          weaponCategories={weaponCategories}
          armors={armors}
          playerName={ownerNick}
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
      {unsavedDialog}
      <CharacterWizard
        open={wizardOpen}
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
        saving={wizardSaving}
        saveError={wizardError}
        clans={clans}
        archetypes={archetypes}
        disciplines={disciplines}
        backgrounds={backgroundsCatalog}
        attributesInfo={attributes}
        abilitiesInfo={abilities}
        virtuesInfo={virtues}
        weapons={weapons}
        weaponCategories={weaponCategories}
        armors={armors}
      />
    </section>
  );
}
