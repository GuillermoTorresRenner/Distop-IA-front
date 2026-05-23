import { Plus, Star, Trash2 } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { DotRating } from "~/components/character/dot-rating";
import { HealthToggle, type DamageState } from "~/components/character/health-toggle";
import { SpecialtyDialog } from "~/components/character/specialty-dialog";
import { FormField } from "~/components/common/form-field";
import { ImageUploader } from "~/components/common/image-uploader";
import { useInfoModal } from "~/components/common/info-modal";
import { MarkdownEditor } from "~/components/common/markdown-editor";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs } from "~/components/common/tabs";
import { Textarea } from "~/components/ui/textarea";
import type {
  AbilityInfo,
  Archetype,
  Armor,
  AttributeInfo,
  Background,
  Clan,
  Discipline,
  DisciplinePath,
  DisciplineRitual,
  MeritFlaw,
  Virtue,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";
import type {
  CharacterAbility,
  CharacterArmor,
  CharacterBackground,
  CharacterDiscipline,
  CharacterInput,
  CharacterMeritFlaw,
  CharacterWeapon,
} from "~/lib/api/characters/characters.types";
import {
  applyAutoStats,
  ATTRIBUTES,
  bloodPoolForGeneration,
  HEALTH_LEVELS,
  KNOWLEDGES,
  SKILLS,
  TALENTS,
} from "~/lib/character-sheet";
import {
  ABILITY_TOOLTIPS,
  ATTR_TOOLTIPS,
  HEALTH_LEGEND,
  HEALTH_TOOLTIPS,
  IDENTITY_TOOLTIPS,
  STATE_TOOLTIPS,
  VIRTUE_TOOLTIPS,
} from "~/lib/sheet-tooltips";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import { cn } from "~/lib/utils";

interface Props {
  value: CharacterInput;
  onChange: (next: CharacterInput) => void;
  archetypes: Archetype[];
  clans: Clan[];
  disciplines: Discipline[];
  meritsFlaws: MeritFlaw[];
  /** Catálogo de Trasfondos V20 para el dropdown. Si no llega, la UI cae a
   *  input libre (compat con consumidores antiguos). */
  backgrounds?: Background[];
  /** Catálogo de Atributos con tooltips del backend (opcional). */
  attributes?: AttributeInfo[];
  /** Catálogo de Habilidades con tooltips del backend (opcional). */
  abilities?: AbilityInfo[];
  /** Catálogo de Virtudes con tooltips del backend (opcional). */
  virtues?: Virtue[];
  weapons: Weapon[];
  weaponCategories: WeaponCategory[];
  armors: Armor[];
  onCreateWeapon?: () => void;
  onCreateArmor?: () => void;
  readOnly?: boolean;
  /**
   * Nombre del jugador (nick del usuario dueño del PJ). Se muestra en el
   * campo "Jugador" de Identidad (read-only). Si no llega, queda vacío.
   */
  playerName?: string | null;
  /**
   * URL del retrato actual del personaje (relativa, servida por NPM).
   * Si está presente junto con `onUploadAvatar`, se renderiza el uploader
   * en la sección Identidad. En la pantalla de creación se omite hasta
   * que el personaje exista en BD.
   */
  avatarUrl?: string | null;
  onUploadAvatar?: (file: File) => Promise<void>;
  onRemoveAvatar?: () => Promise<void>;
}

export function CharacterSheetForm({
  value,
  onChange,
  archetypes,
  clans,
  disciplines,
  meritsFlaws,
  backgrounds,
  attributes,
  abilities,
  virtues,
  weapons,
  weaponCategories,
  armors,
  onCreateWeapon,
  onCreateArmor,
  readOnly,
  playerName,
  avatarUrl,
  onUploadAvatar,
  onRemoveAvatar,
}: Props) {
  const backgroundCatalog = backgrounds ?? [];
  const attributesCatalog = attributes ?? [];
  const abilitiesCatalog = abilities ?? [];
  const virtuesCatalog = virtues ?? [];

  const backgroundsByName = useMemo(() => {
    const m = new Map<string, Background>();
    for (const b of backgroundCatalog) m.set(b.name, b);
    return m;
  }, [backgroundCatalog]);

  const attributesByLabel = useMemo(() => {
    const m = new Map<string, AttributeInfo>();
    for (const a of attributesCatalog) m.set(a.name, a);
    return m;
  }, [attributesCatalog]);

  const abilitiesByName = useMemo(() => {
    const m = new Map<string, AbilityInfo>();
    for (const a of abilitiesCatalog) m.set(a.name, a);
    return m;
  }, [abilitiesCatalog]);

  const virtuesByName = useMemo(() => {
    const m = new Map<string, Virtue>();
    for (const v of virtuesCatalog) m.set(v.name, v);
    return m;
  }, [virtuesCatalog]);
  // Especialidad abierta en el modal (si hay). Vacía mientras el modal está cerrado.
  const [specialtyEditing, setSpecialtyEditing] = useState<
    { category: CharacterAbility["category"]; name: string } | null
  >(null);

  function patch(p: Partial<CharacterInput>) {
    // Aplica los autocálculos V20 (Voluntad permanente ← Coraje, Humanidad
    // ← Conciencia + Autocontrol, Reserva de Sangre ← Generación) antes de
    // propagar el cambio. Solo se autocalculan los campos que aún estaban
    // sincronizados con la fórmula previa, preservando ediciones manuales.
    const merged = applyAutoStats(value, p);
    onChange({ ...value, ...merged });
  }

  function setAbility(category: CharacterAbility["category"], name: string, v: number) {
    const abilities = (value.abilities ?? []).map((a) =>
      a.category === category && a.name === name ? { ...a, value: v } : a,
    );
    if (!abilities.find((a) => a.category === category && a.name === name)) {
      abilities.push({ category, name, value: v });
    }
    onChange({ ...value, abilities });
  }

  function getAbility(category: CharacterAbility["category"], name: string): number {
    return value.abilities?.find((a) => a.category === category && a.name === name)?.value ?? 0;
  }

  function getAbilitySpecialty(
    category: CharacterAbility["category"],
    name: string,
  ): string {
    return (
      value.abilities?.find((a) => a.category === category && a.name === name)
        ?.specialty ?? ""
    );
  }

  function setAbilitySpecialty(
    category: CharacterAbility["category"],
    name: string,
    specialty: string | null,
  ) {
    const abilities = (value.abilities ?? []).map((a) =>
      a.category === category && a.name === name ? { ...a, specialty } : a,
    );
    if (!abilities.find((a) => a.category === category && a.name === name)) {
      // Si la habilidad aún no estaba persistida (value=0), no permitimos
      // declarar especialidad. El botón solo aparece con value>=4, así que
      // este caso solo ocurre por defensa.
      return;
    }
    onChange({ ...value, abilities });
  }

  function addBackground() {
    const list = [...(value.backgrounds ?? []), { name: "", level: 1 } as CharacterBackground];
    patch({ backgrounds: list });
  }
  function updateBackground(i: number, p: Partial<CharacterBackground>) {
    const list = [...(value.backgrounds ?? [])];
    list[i] = { ...list[i], ...p };
    patch({ backgrounds: list });
  }
  function removeBackground(i: number) {
    const list = [...(value.backgrounds ?? [])];
    list.splice(i, 1);
    patch({ backgrounds: list });
  }

  function addDiscipline() {
    const list = [
      ...(value.disciplines ?? []),
      { disciplineId: disciplines[0]?.id ?? "", level: 1 } as CharacterDiscipline,
    ];
    patch({ disciplines: list });
  }
  function updateDiscipline(i: number, p: Partial<CharacterDiscipline>) {
    const list = [...(value.disciplines ?? [])];
    list[i] = { ...list[i], ...p };
    patch({ disciplines: list });
  }
  function removeDiscipline(i: number) {
    const list = [...(value.disciplines ?? [])];
    list.splice(i, 1);
    patch({ disciplines: list });
  }

  function addMeritFlaw() {
    // Arranca sin selección. La UI muestra un placeholder "— Selecciona —"
    // hasta que el jugador elija una entrada del catálogo o un custom.
    const list = [
      ...(value.meritsFlaws ?? []),
      { meritFlawId: null } as CharacterMeritFlaw,
    ];
    patch({ meritsFlaws: list });
  }
  function updateMeritFlaw(i: number, p: Partial<CharacterMeritFlaw>) {
    const list = [...(value.meritsFlaws ?? [])];
    list[i] = { ...list[i], ...p };
    patch({ meritsFlaws: list });
  }
  function removeMeritFlaw(i: number) {
    const list = [...(value.meritsFlaws ?? [])];
    list.splice(i, 1);
    patch({ meritsFlaws: list });
  }

  function addWeapon(weaponId: string) {
    if (!weaponId) return;
    const list = [
      ...(value.weapons ?? []),
      { weaponId } as CharacterWeapon,
    ];
    patch({ weapons: list });
  }
  function updateWeaponRow(i: number, p: Partial<CharacterWeapon>) {
    const list = [...(value.weapons ?? [])];
    list[i] = { ...list[i], ...p };
    patch({ weapons: list });
  }
  function removeWeaponRow(i: number) {
    const list = [...(value.weapons ?? [])];
    list.splice(i, 1);
    patch({ weapons: list });
  }

  function addArmor(armorId: string) {
    if (!armorId) return;
    const list = [
      ...(value.armors ?? []),
      { armorId } as CharacterArmor,
    ];
    patch({ armors: list });
  }
  function updateArmorRow(i: number, p: Partial<CharacterArmor>) {
    const list = [...(value.armors ?? [])];
    list[i] = { ...list[i], ...p };
    patch({ armors: list });
  }
  function removeArmorRow(i: number) {
    const list = [...(value.armors ?? [])];
    list.splice(i, 1);
    patch({ armors: list });
  }

  const archetypesSorted = useMemo(
    () => [...archetypes].sort((a, b) => a.order - b.order),
    [archetypes],
  );
  const clansSorted = useMemo(() => [...clans].sort((a, b) => a.order - b.order), [clans]);

  const physical = ATTRIBUTES.filter((a) => a.group === "physical");
  const social = ATTRIBUTES.filter((a) => a.group === "social");
  const mental = ATTRIBUTES.filter((a) => a.group === "mental");

  // Modal de información enriquecida — alimentado por el vault de catálogo.
  const infoModal = useInfoModal();

  const selectedClan = clans.find((c) => c.id === value.clanId);
  const selectedNature = archetypes.find((a) => a.id === value.natureId);
  const selectedDemeanor = archetypes.find((a) => a.id === value.demeanorId);

  /**
   * Resuelve un tooltip de catálogo o usa el fallback hardcoded.
   * Prefiere el backend (si no está vacío) sobre el fallback.
   */
  function tooltipForAttribute(name: string): string | undefined {
    const catalogEntry = attributesByLabel.get(name);
    return catalogEntry?.tooltip ?? ATTR_TOOLTIPS[name as keyof typeof ATTR_TOOLTIPS];
  }

  function tooltipForAbility(name: string): string | undefined {
    const catalogEntry = abilitiesByName.get(name);
    return catalogEntry?.tooltip ?? ABILITY_TOOLTIPS[name as keyof typeof ABILITY_TOOLTIPS];
  }

  function tooltipForVirtue(name: string): string | undefined {
    const catalogEntry = virtuesByName.get(name);
    return catalogEntry?.tooltip ?? VIRTUE_TOOLTIPS[name as keyof typeof VIRTUE_TOOLTIPS];
  }

  return (
    <div className="space-y-8">
      {/* Identidad */}
      <SectionHeading>Identidad</SectionHeading>
      {onUploadAvatar ? (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <ImageUploader
              currentUrl={avatarUrl ?? null}
              onUpload={onUploadAvatar}
              onRemove={onRemoveAvatar}
              shape="circle"
              maxSizeMb={5}
              uploadLabel="Subir retrato"
              changeLabel="Cambiar retrato"
              removeLabel="Quitar retrato"
              emptyHint="Sin retrato"
              disabled={readOnly}
            />
          </div>
          <p className="font-serif text-xs italic text-muted-foreground">
            Sube un retrato del personaje. JPEG, PNG, WebP o GIF, hasta 5 MB. Se
            convierte a WebP 1024×1024.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Tooltip content={IDENTITY_TOOLTIPS.name} title="Nombre">
          <FormField
            label="Nombre"
            name="name"
            required
            value={value.name}
            disabled={readOnly}
            onChange={(e) => patch({ name: e.target.value })}
            containerClassName="w-full"
          />
        </Tooltip>

        <SelectField
          label="Naturaleza"
          tooltipTitle="Naturaleza"
          tooltipContent={
            selectedNature?.tooltip ?? selectedNature?.description ?? IDENTITY_TOOLTIPS.nature
          }
          value={value.natureId ?? ""}
          disabled={readOnly}
          onChange={(v) => patch({ natureId: v || undefined })}
          options={archetypesSorted.map((a) => ({
            value: a.id,
            label: a.name,
            description: a.description,
          }))}
          placeholder="—"
        />

        <Tooltip content={IDENTITY_TOOLTIPS.generation} title="Generación">
          <FormField
            label="Generación"
            name="generation"
            type="number"
            min={4}
            max={15}
            value={value.generation ?? ""}
            disabled={readOnly}
            onChange={(e) =>
              patch({ generation: e.target.value ? Number(e.target.value) : undefined })
            }
            containerClassName="w-full"
          />
        </Tooltip>

        <FormField
          label="Jugador"
          name="player"
          value={playerName ?? ""}
          disabled
          hint="Se infiere del usuario dueño del personaje"
          onChange={() => undefined}
        />

        <SelectField
          label="Conducta"
          tooltipTitle="Conducta"
          tooltipContent={
            selectedDemeanor?.tooltip ?? selectedDemeanor?.description ?? IDENTITY_TOOLTIPS.demeanor
          }
          value={value.demeanorId ?? ""}
          disabled={readOnly}
          onChange={(v) => patch({ demeanorId: v || undefined })}
          options={archetypesSorted.map((a) => ({
            value: a.id,
            label: a.name,
            description: a.description,
          }))}
          placeholder="—"
        />

        <Tooltip content={IDENTITY_TOOLTIPS.haven} title="Refugio">
          <FormField
            label="Refugio"
            name="haven"
            value={value.haven ?? ""}
            disabled={readOnly}
            onChange={(e) => patch({ haven: e.target.value })}
            containerClassName="w-full"
          />
        </Tooltip>

        {/*
          El campo libre "Crónica" se retiró: la asociación real vive en la
          relación N:M `ChronicleCharacter`. Se gestiona desde /chronicles/:id.
          El field sigue en el modelo Prisma para no romper datos viejos,
          pero NO se muestra ni edita aquí.
        */}

        <div className="space-y-1">
          <SelectField
            label="Clan"
            tooltipTitle={selectedClan?.name ?? "Clan"}
            tooltipContent={
              selectedClan ? (
                <span>
                  <span className="block">{selectedClan.tooltip ?? selectedClan.description}</span>
                  {selectedClan.disciplines ? (
                    <span className="mt-1 block text-foreground/80">
                      Disciplinas: {selectedClan.disciplines}
                    </span>
                  ) : null}
                  {selectedClan.weakness ? (
                    <span className="mt-1 block text-blood/80">
                      Debilidad: {selectedClan.weakness}
                    </span>
                  ) : null}
                </span>
              ) : (
                IDENTITY_TOOLTIPS.clan
              )
            }
            value={value.clanId ?? ""}
            disabled={readOnly}
            onChange={(v) => patch({ clanId: v || undefined })}
            options={clansSorted.map((c) => ({
              value: c.id,
              label: c.sect ? `${c.name} · ${c.sect}` : c.name,
              description: c.description,
            }))}
            placeholder="—"
          />
          {selectedClan ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                infoModal.open("clan", selectedClan.name, selectedClan.name);
              }}
              className="font-heading text-[0.55rem] uppercase tracking-widest text-muted-foreground underline decoration-dotted decoration-blood/30 underline-offset-2 transition-colors hover:text-blood hover:decoration-blood focus:outline-none focus:text-blood"
            >
              Ver detalle de clan
            </button>
          ) : null}
        </div>

        <Tooltip content={IDENTITY_TOOLTIPS.concept} title="Concepto">
          <FormField
            label="Concepto"
            name="concept"
            value={value.concept ?? ""}
            disabled={readOnly}
            onChange={(e) => patch({ concept: e.target.value })}
            containerClassName="w-full"
          />
        </Tooltip>
      </div>

      <Tabs
        items={[
          { id: "rasgos", label: "Rasgos" },
          { id: "ventajas", label: "Ventajas" },
          { id: "estado", label: "Estado y salud" },
          {
            id: "equipo",
            label: "Equipo",
            badge:
              (value.weapons?.length ?? 0) + (value.armors?.length ?? 0) || undefined,
          },
          {
            id: "notas",
            label: "Notas",
            badge: value.notes && value.notes.length > 0 ? "•" : undefined,
          },
        ]}
        defaultValue="rasgos"
      >
        {(activeTab) => (
          <>
            {activeTab === "rasgos" ? (
              <div className="space-y-8">
      {/* Atributos */}
      <SectionHeading>Atributos</SectionHeading>
      <div className="grid gap-6 md:grid-cols-3">
        <AttrBlock title="Físicos">
          {physical.map((a) => (
            <DotRow
              key={a.key}
              label={a.label}
              tooltip={tooltipForAttribute(a.label)}
              value={value[a.key] ?? 1}
              min={1}
              max={5}
              onChange={(v) => patch({ [a.key]: v })}
              readOnly={readOnly}
              onInfo={() => infoModal.open("attribute", a.key, a.label)}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Sociales">
          {social.map((a) => (
            <DotRow
              key={a.key}
              label={a.label}
              tooltip={tooltipForAttribute(a.label)}
              value={value[a.key] ?? 1}
              min={1}
              max={5}
              onChange={(v) => patch({ [a.key]: v })}
              readOnly={readOnly}
              onInfo={() => infoModal.open("attribute", a.key, a.label)}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Mentales">
          {mental.map((a) => (
            <DotRow
              key={a.key}
              label={a.label}
              tooltip={tooltipForAttribute(a.label)}
              value={value[a.key] ?? 1}
              min={1}
              max={5}
              onChange={(v) => patch({ [a.key]: v })}
              readOnly={readOnly}
              onInfo={() => infoModal.open("attribute", a.key, a.label)}
            />
          ))}
        </AttrBlock>
      </div>

      {/* Habilidades */}
      <SectionHeading>Habilidades</SectionHeading>
      <div className="grid gap-6 md:grid-cols-3">
        <AttrBlock title="Talentos">
          {TALENTS.map((name) => (
            <DotRow
              key={name}
              label={name}
              tooltip={tooltipForAbility(name)}
              value={getAbility("TALENT", name)}
              min={0}
              max={5}
              onChange={(v) => setAbility("TALENT", name, v)}
              readOnly={readOnly}
              specialty={getAbilitySpecialty("TALENT", name)}
              onOpenSpecialty={() =>
                setSpecialtyEditing({ category: "TALENT", name })
              }
              onInfo={() => infoModal.open("ability", name, name)}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Técnicas">
          {SKILLS.map((name) => (
            <DotRow
              key={name}
              label={name}
              tooltip={tooltipForAbility(name)}
              value={getAbility("SKILL", name)}
              min={0}
              max={5}
              onChange={(v) => setAbility("SKILL", name, v)}
              readOnly={readOnly}
              specialty={getAbilitySpecialty("SKILL", name)}
              onOpenSpecialty={() =>
                setSpecialtyEditing({ category: "SKILL", name })
              }
              onInfo={() => infoModal.open("ability", name, name)}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Conocimientos">
          {KNOWLEDGES.map((name) => (
            <DotRow
              key={name}
              label={name}
              tooltip={tooltipForAbility(name)}
              value={getAbility("KNOWLEDGE", name)}
              min={0}
              max={5}
              onChange={(v) => setAbility("KNOWLEDGE", name, v)}
              readOnly={readOnly}
              specialty={getAbilitySpecialty("KNOWLEDGE", name)}
              onOpenSpecialty={() =>
                setSpecialtyEditing({ category: "KNOWLEDGE", name })
              }
              onInfo={() => infoModal.open("ability", name, name)}
            />
          ))}
        </AttrBlock>
      </div>

              </div>
            ) : null}

            {activeTab === "ventajas" ? (
              <div className="space-y-8">
      {/* Ventajas */}
      <SectionHeading>Ventajas</SectionHeading>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trasfondos: lista cerrada del catálogo V20 con opción "Personalizado".
            El value persistido es siempre el texto en `bg.name`. Si coincide
            con un trasfondo del catálogo, el select lo muestra como tal y se
            habilita el botón de info. Si no coincide (o es custom), arranca
            en modo libre. */}
        <AttrBlock
          title="Trasfondos"
          action={
            !readOnly && (
              <Button type="button" size="sm" variant="ghost" onClick={addBackground}>
                <Plus className="size-4" /> Añadir
              </Button>
            )
          }
        >
          {(value.backgrounds ?? []).length === 0 ? (
            <p className="font-serif text-xs italic text-muted-foreground">
              Sin trasfondos.
            </p>
          ) : (
            (value.backgrounds ?? []).map((bg, i) => {
              const inCatalog = backgroundsByName.has(bg.name);
              return (
                <BackgroundRow
                  key={i}
                  background={bg}
                  catalog={backgroundCatalog}
                  inCatalog={inCatalog}
                  readOnly={readOnly}
                  onChange={(patch) => updateBackground(i, patch)}
                  onRemove={() => removeBackground(i)}
                  onInfo={
                    inCatalog ? () => infoModal.open("background", bg.name, bg.name) : undefined
                  }
                />
              );
            })
          )}
        </AttrBlock>

        {/* Disciplinas */}
        <AttrBlock
          title="Disciplinas"
          action={
            !readOnly && (
              <Button type="button" size="sm" variant="ghost" onClick={addDiscipline}>
                <Plus className="size-4" /> Añadir
              </Button>
            )
          }
        >
          {(value.disciplines ?? []).length === 0 ? (
            <p className="font-serif text-xs italic text-muted-foreground">
              Sin disciplinas.
            </p>
          ) : (
            (value.disciplines ?? []).map((d, i) => {
              const disc = disciplines.find((x) => x.id === d.disciplineId);
              return (
                <DisciplineRow
                  key={i}
                  index={i}
                  pick={d}
                  disc={disc}
                  disciplines={disciplines}
                  readOnly={!!readOnly}
                  onUpdate={(patchD) => updateDiscipline(i, patchD)}
                  onRemove={() => removeDiscipline(i)}
                  onOpenInfo={(kind, id, fallback) =>
                    infoModal.open(kind, id, fallback)
                  }
                />
              );
            })
          )}
        </AttrBlock>

        {/* Virtudes */}
        <AttrBlock title="Virtudes">
          <div className="flex items-center gap-2">
            <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
              Esquema:
            </label>
            <select
              value={value.virtueScheme ?? "HUMANITY"}
              disabled={readOnly}
              onChange={(e) =>
                patch({ virtueScheme: e.target.value as "HUMANITY" | "PATH" })
              }
              className={cn(SELECT_DARK_CLASS, "h-8 w-auto")}
            >
              <option value="HUMANITY">Humanidad</option>
              <option value="PATH">Senda</option>
            </select>
          </div>
          <DotRow
            label={value.virtueScheme === "PATH" ? "Convicción" : "Conciencia"}
            tooltip={
              value.virtueScheme === "PATH"
                ? tooltipForVirtue("Convicción")
                : tooltipForVirtue("Conciencia")
            }
            value={value.conscience ?? 1}
            min={1}
            max={5}
            onChange={(v) => patch({ conscience: v })}
            readOnly={readOnly}
          />
          <DotRow
            label={value.virtueScheme === "PATH" ? "Instintos" : "Autocontrol"}
            tooltip={
              value.virtueScheme === "PATH"
                ? tooltipForVirtue("Instintos")
                : tooltipForVirtue("Autocontrol")
            }
            value={value.selfControl ?? 1}
            min={1}
            max={5}
            onChange={(v) => patch({ selfControl: v })}
            readOnly={readOnly}
          />
          <DotRow
            label="Coraje"
            tooltip={tooltipForVirtue("Coraje")}
            value={value.courage ?? 1}
            min={1}
            max={5}
            onChange={(v) => patch({ courage: v })}
            readOnly={readOnly}
          />
        </AttrBlock>
      </div>

      {/* Méritos / Defectos — todavía dentro de pestaña Ventajas */}
      <SectionHeading>Méritos · Defectos</SectionHeading>
      <div className="grid gap-6 lg:grid-cols-2">
        <AttrBlock
          title="Méritos / Defectos"
          action={
            !readOnly && (
              <Button type="button" size="sm" variant="ghost" onClick={addMeritFlaw}>
                <Plus className="size-4" /> Añadir
              </Button>
            )
          }
        >
          {(value.meritsFlaws ?? []).length === 0 ? (
            <p className="font-serif text-xs italic text-muted-foreground">
              Sin méritos ni defectos.
            </p>
          ) : (
            (value.meritsFlaws ?? []).map((m, i) => (
              <MeritFlawRow
                key={i}
                meritFlaw={m}
                catalog={meritsFlaws}
                readOnly={readOnly}
                onChange={(patch) => updateMeritFlaw(i, patch)}
                onRemove={() => removeMeritFlaw(i)}
                onInfo={(name) => infoModal.open("merit-flaw", name, name)}
              />
            ))
          )}
        </AttrBlock>
      </div>
              </div>
            ) : null}

            {activeTab === "estado" ? (
              <div className="space-y-8">
      <SectionHeading>Humanidad · Voluntad · Sangre · Salud</SectionHeading>
      <div className="grid gap-6 lg:grid-cols-2">
        <AttrBlock title="Humanidad · Voluntad · Sangre">
          <DotRow
            label={value.virtueScheme === "PATH" ? "Senda" : "Humanidad"}
            tooltip={
              value.virtueScheme === "PATH"
                ? STATE_TOOLTIPS.path
                : STATE_TOOLTIPS.humanity
            }
            value={value.humanity ?? 0}
            min={0}
            max={10}
            onChange={(v) => patch({ humanity: v })}
            readOnly={readOnly}
          />
          <DotRow
            label="Voluntad permanente"
            tooltip={STATE_TOOLTIPS.willpowerMax}
            value={value.willpowerMax ?? 1}
            min={0}
            max={10}
            onChange={(v) =>
              patch({
                willpowerMax: v,
                willpowerCurrent: Math.min(v, value.willpowerCurrent ?? v),
              })
            }
            readOnly={readOnly}
          />
          <DotRow
            label="Voluntad actual"
            tooltip={STATE_TOOLTIPS.willpowerCurrent}
            value={value.willpowerCurrent ?? 0}
            min={0}
            max={value.willpowerMax ?? 10}
            // 10 huecos siempre, igual que Humanidad / Voluntad permanente.
            // Los puntos por encima del máximo permanente quedan inactivos.
            slots={10}
            onChange={(v) => patch({ willpowerCurrent: v })}
            readOnly={readOnly}
          />
          {/* Reserva de sangre: stepper numérico (no DotRating) porque el
              techo depende de la generación y puede llegar a 50 (4ª gen).
              El máximo se calcula con `bloodPoolForGeneration`. */}
          <BloodPoolRow
            value={value.bloodPool ?? 0}
            generation={value.generation ?? null}
            onChange={(v) => patch({ bloodPool: v })}
            readOnly={readOnly}
          />
          <Tooltip content={STATE_TOOLTIPS.experience} title="Experiencia">
            <FormField
              label="Experiencia"
              name="experience"
              type="number"
              min={0}
              value={value.experience ?? 0}
              disabled={readOnly}
              onChange={(e) => patch({ experience: Number(e.target.value) || 0 })}
              containerClassName="w-full"
            />
          </Tooltip>
        </AttrBlock>

        <AttrBlock
          title="Salud"
          action={
            <Tooltip
              title="Daño"
              content={
                <span className="space-y-1">
                  <span className="block">{HEALTH_LEGEND.empty}</span>
                  <span className="block">{HEALTH_LEGEND.bashing}</span>
                  <span className="block">{HEALTH_LEGEND.lethal}</span>
                </span>
              }
            >
              <span className="cursor-help font-mono text-xs text-muted-foreground">
                ? · / · ✕
              </span>
            </Tooltip>
          }
        >
          {HEALTH_LEVELS.map((h) => {
            // h.key = "healthBruised", "healthHurt", ... → mapear a "bruised", "hurt", ...
            const vaultKey = h.key.replace(/^health/, "").toLowerCase();
            return (
              <div key={h.key} className="flex items-center justify-between gap-2">
                <Tooltip title={h.label} content={HEALTH_TOOLTIPS[h.label]}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      infoModal.open("health-level", vaultKey, h.label);
                    }}
                    className="flex flex-1 items-center justify-between font-serif text-sm underline decoration-dotted decoration-blood/30 underline-offset-2 transition-colors hover:text-blood hover:decoration-blood focus:outline-none focus:text-blood"
                  >
                    {h.label}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {h.penalty}
                    </span>
                  </button>
                </Tooltip>
                <HealthToggle
                  value={value[h.key] ?? 0}
                  onChange={(v: DamageState) => patch({ [h.key]: v })}
                  readOnly={readOnly}
                  ariaLabel={`Daño ${h.label}`}
                />
              </div>
            );
          })}
        </AttrBlock>
      </div>
              </div>
            ) : null}

            {activeTab === "equipo" ? (
              <EquipmentTab
                value={value}
                weapons={weapons}
                weaponCategories={weaponCategories}
                armors={armors}
                readOnly={readOnly}
                addWeapon={addWeapon}
                updateWeaponRow={updateWeaponRow}
                removeWeaponRow={removeWeaponRow}
                addArmor={addArmor}
                updateArmorRow={updateArmorRow}
                removeArmorRow={removeArmorRow}
                onCreateWeapon={onCreateWeapon}
                onCreateArmor={onCreateArmor}
                onInfoWeapon={(id, fallback) =>
                  infoModal.open("weapon", id, fallback)
                }
                onInfoArmor={(id, fallback) =>
                  infoModal.open("armor", id, fallback)
                }
                onUpdateEquipmentNotes={(next) =>
                  patch({ equipmentNotes: next })
                }
              />
            ) : null}

            {activeTab === "notas" ? (
              <div className="space-y-3">
                <SectionHeading>Notas del jugador</SectionHeading>
                <p className="font-serif text-xs italic text-muted-foreground">
                  Espacio libre para apuntes de historia, contactos, frases del
                  Narrador, etc. Solo tú las verás. Soporta markdown.
                </p>
                <div className="h-128 overflow-hidden rounded-md border border-border bg-background/40">
                  <MarkdownEditor
                    value={value.notes ?? ""}
                    onChange={(next) => patch({ notes: next })}
                    disabled={readOnly}
                    maxLength={8000}
                    placeholder="Hila aquí los secretos del vástago... (soporta markdown)"
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </Tabs>

      <SpecialtyDialog
        open={specialtyEditing !== null}
        abilityName={specialtyEditing?.name ?? ""}
        initialValue={
          specialtyEditing
            ? getAbilitySpecialty(specialtyEditing.category, specialtyEditing.name)
            : ""
        }
        readOnly={readOnly}
        onClose={() => setSpecialtyEditing(null)}
        onSave={(next) => {
          if (!specialtyEditing) return;
          setAbilitySpecialty(
            specialtyEditing.category,
            specialtyEditing.name,
            next.length > 0 ? next : null,
          );
        }}
        onClear={() => {
          if (!specialtyEditing) return;
          setAbilitySpecialty(
            specialtyEditing.category,
            specialtyEditing.name,
            null,
          );
        }}
      />

      {infoModal.modal}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 pb-2">
      <h2 className="font-heading text-sm uppercase tracking-[0.3em] text-blood">
        {children}
      </h2>
    </div>
  );
}

function AttrBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="space-y-2 rounded-lg border border-border/60 bg-card/70 p-4">
      <header className="flex items-center justify-between">
        <h3 className="font-heading text-xs uppercase tracking-[0.3em] text-foreground/80">
          {title}
        </h3>
        {action}
      </header>
      <div className="space-y-1.5">{children}</div>
    </article>
  );
}

/**
 * Fila de un trasfondo del personaje. La UI muestra un `<select>` con la
 * lista cerrada del catálogo + una opción "Personalizado…"; al elegirla, se
 * cambia a un input libre que persiste el `name` tal cual lo escribe el
 * jugador. Las dos vistas operan sobre el mismo campo `name` del
 * CharacterBackground — no hay metadata oculta.
 */
function BackgroundRow({
  background,
  catalog,
  inCatalog,
  readOnly,
  onChange,
  onRemove,
  onInfo,
}: {
  background: { name: string; level: number };
  catalog: Background[];
  /** El name actual coincide con un trasfondo del catálogo. */
  inCatalog: boolean;
  readOnly?: boolean;
  onChange: (patch: { name?: string; level?: number }) => void;
  onRemove: () => void;
  /** Si hay match con el catálogo, abre el InfoModal con la descripción. */
  onInfo?: () => void;
}) {
  // Si la fila arrancó vacía o con un valor del catálogo, vivimos en modo
  // select. Si el valor es un custom (no está en el catálogo y no es vacío),
  // arrancamos en modo libre. El usuario puede alternar con el botón "Aa".
  const startsCustom = background.name !== "" && !inCatalog;
  const [customMode, setCustomMode] = useState(startsCustom);

  function pickFromCatalog(name: string) {
    if (name === "__custom__") {
      // Entrar en modo libre: vaciamos el name si venía del catálogo para
      // dejar al jugador escribir sin sorpresas.
      setCustomMode(true);
      if (inCatalog || background.name === "") onChange({ name: "" });
      return;
    }
    setCustomMode(false);
    onChange({ name });
  }

  return (
    <div className="flex items-center gap-2">
      {customMode ? (
        <div className="flex flex-1 items-center gap-1">
          <Input
            placeholder="Trasfondo personalizado…"
            value={background.name}
            disabled={readOnly}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-8 flex-1"
          />
          {!readOnly ? (
            <Tooltip
              title="Volver al catálogo"
              content="Elige un trasfondo de la lista cerrada V20."
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setCustomMode(false);
                  onChange({ name: "" });
                }}
                aria-label="Volver al selector de catálogo"
              >
                <span className="font-heading text-[10px]">≡</span>
              </Button>
            </Tooltip>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-1">
          <select
            value={inCatalog ? background.name : ""}
            disabled={readOnly}
            onChange={(e) => pickFromCatalog(e.target.value)}
            className={cn(SELECT_DARK_CLASS, "h-8 flex-1")}
            aria-label="Trasfondo"
          >
            <option value="">— Selecciona un trasfondo —</option>
            {catalog.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
                {b.category ? ` · ${b.category}` : ""}
              </option>
            ))}
            <option value="__custom__">+ Personalizado…</option>
          </select>
          {inCatalog && onInfo ? (
            <Tooltip
              title={background.name}
              content="Ver descripción canónica del trasfondo."
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={onInfo}
                aria-label={`Información sobre ${background.name}`}
              >
                <span className="font-heading text-[10px]">i</span>
              </Button>
            </Tooltip>
          ) : null}
        </div>
      )}
      <DotRating
        value={background.level}
        onChange={(v) => onChange({ level: v })}
        readOnly={readOnly}
      />
      {!readOnly && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
          aria-label="Eliminar trasfondo"
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

/**
 * Fila de un mérito/defecto del personaje. Soporta dos modos mutuamente
 * excluyentes:
 *
 *  - **Catálogo:** select agrupado por Categoría (Físico/Mental/Social/
 *    Sobrenatural) y dentro de cada categoría separa "Méritos" / "Defectos"
 *    via `<optgroup>` con label "Categoría — Méritos".
 *  - **Personalizado:** inputs inline para nombre, tipo (mérito/defecto),
 *    coste y categoría libre. El valor persiste en los campos `customX`
 *    del CharacterMeritFlaw; no toca el catálogo global.
 *
 * El usuario alterna con la opción "+ Personalizado…" del select o con el
 * botón "≡" cuando está en modo libre.
 */
function MeritFlawRow({
  meritFlaw,
  catalog,
  readOnly,
  onChange,
  onRemove,
  onInfo,
}: {
  meritFlaw: CharacterMeritFlaw;
  catalog: MeritFlaw[];
  readOnly?: boolean;
  onChange: (patch: Partial<CharacterMeritFlaw>) => void;
  onRemove: () => void;
  onInfo: (name: string) => void;
}) {
  const cat = catalog.find((x) => x.id === meritFlaw.meritFlawId) ?? null;
  const isCustom = !meritFlaw.meritFlawId && !!meritFlaw.customName !== false &&
    (!!meritFlaw.customName || !!meritFlaw.customKind || meritFlaw.customValue != null);
  // Agrupado del catálogo: { "Físico": { MERIT: [...], FLAW: [...] }, ... }
  const grouped = useMemo(() => {
    const byCat = new Map<string, { MERIT: MeritFlaw[]; FLAW: MeritFlaw[] }>();
    for (const m of catalog) {
      const c = m.category?.trim() || "Otros";
      let bucket = byCat.get(c);
      if (!bucket) {
        bucket = { MERIT: [], FLAW: [] };
        byCat.set(c, bucket);
      }
      bucket[m.kind].push(m);
    }
    // Orden de categorías canónico V20 + cualquier extra al final.
    const canonical = ["Físico", "Mental", "Social", "Sobrenatural"];
    const ordered = [
      ...canonical.filter((c) => byCat.has(c)),
      ...[...byCat.keys()].filter((c) => !canonical.includes(c)).sort(),
    ];
    return ordered.map((c) => ({
      category: c,
      MERIT: byCat.get(c)!.MERIT.sort((a, b) => a.value - b.value || a.name.localeCompare(b.name)),
      FLAW: byCat.get(c)!.FLAW.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
    }));
  }, [catalog]);

  function handleSelectChange(v: string) {
    if (v === "__custom__") {
      // Entra a modo custom: limpia FK del catálogo y prellena con kind por
      // defecto para que los inputs custom estén operativos.
      onChange({
        meritFlawId: null,
        customName: "",
        customKind: "MERIT",
        customValue: 1,
        customCategory: "",
      });
      return;
    }
    if (v === "") {
      onChange({ meritFlawId: null });
      return;
    }
    // Vuelve al modo catálogo: limpia los campos custom.
    onChange({
      meritFlawId: v,
      customName: null,
      customKind: null,
      customValue: null,
      customCategory: null,
    });
  }

  function backToCatalog() {
    onChange({
      meritFlawId: null,
      customName: null,
      customKind: null,
      customValue: null,
      customCategory: null,
    });
  }

  // Modo custom: o bien tiene meritFlawId null y algún customX, o bien
  // arrancó con una entrada vacía. La señal canónica es que NO haya match
  // con el catálogo y haya al menos un campo custom poblado.
  const customMode = !meritFlaw.meritFlawId && isCustom;

  return (
    <div className="space-y-1 rounded-md border border-border/40 bg-background/30 p-2">
      {customMode ? (
        <CustomMeritFlawInputs
          meritFlaw={meritFlaw}
          readOnly={readOnly}
          onChange={onChange}
          onBackToCatalog={backToCatalog}
          onRemove={onRemove}
        />
      ) : (
        <div className="flex items-center gap-2">
          <Tooltip
            title={cat?.name}
            content={
              cat ? (
                <span>
                  <span className="block">
                    [{cat.kind === "MERIT" ? "+" : ""}{cat.value}]{" "}
                    {cat.category ?? ""}
                  </span>
                  {cat.description ? (
                    <span className="mt-1 block">{cat.description}</span>
                  ) : null}
                </span>
              ) : (
                ""
              )
            }
            className="flex-1"
          >
            <select
              value={meritFlaw.meritFlawId ?? ""}
              disabled={readOnly}
              onChange={(e) => handleSelectChange(e.target.value)}
              className={cn(SELECT_DARK_CLASS, "h-8")}
            >
              <option value="">— Selecciona un mérito / defecto —</option>
              {/*
                Tres niveles visuales en un <select> nativo (que solo permite
                un nivel de <optgroup>):
                  1) Categoría: option deshabilitado con barras decorativas
                     y mayúsculas para que destaque como encabezado.
                  2) <optgroup> "Méritos" / "Defectos" indentado con prefijo.
                  3) Items con doble indentación (NBSP) y bullet "·".
              */}
              {grouped.map((g) => (
                <Fragment key={g.category}>
                  <option disabled value={`__cat__${g.category}`}>
                    {`━━━ ${g.category.toUpperCase()} ━━━`}
                  </option>
                  {g.MERIT.length > 0 ? (
                    <optgroup label={"  ▸ Méritos"}>
                      {g.MERIT.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {`    · [+${opt.value}] ${opt.name}`}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {g.FLAW.length > 0 ? (
                    <optgroup label={"  ▸ Defectos"}>
                      {g.FLAW.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {`    · [${opt.value}] ${opt.name}`}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </Fragment>
              ))}
              <option disabled value="__sep_custom__">
                {"━━━━━━━━━━━━━━━"}
              </option>
              <option value="__custom__">+ Personalizado…</option>
            </select>
          </Tooltip>
          {cat ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onInfo(cat.name);
              }}
              aria-label={`Ver detalle de ${cat.name}`}
              title="Ver detalle"
              className="text-muted-foreground hover:text-blood"
            >
              <span aria-hidden className="font-heading text-[0.6rem] uppercase tracking-widest">
                ?
              </span>
            </Button>
          ) : null}
          {!readOnly && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              aria-label="Eliminar"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CustomMeritFlawInputs({
  meritFlaw,
  readOnly,
  onChange,
  onBackToCatalog,
  onRemove,
}: {
  meritFlaw: CharacterMeritFlaw;
  readOnly?: boolean;
  onChange: (patch: Partial<CharacterMeritFlaw>) => void;
  onBackToCatalog: () => void;
  onRemove: () => void;
}) {
  // Si el jugador cambia el kind, ajustamos el signo del value para que
  // sea coherente y no falle la validación del back.
  function setKind(k: "MERIT" | "FLAW") {
    const current = meritFlaw.customValue ?? 0;
    let nextValue = current;
    if (k === "MERIT" && current <= 0) nextValue = Math.max(1, Math.abs(current) || 1);
    if (k === "FLAW" && current >= 0) nextValue = -Math.max(1, Math.abs(current) || 1);
    onChange({ customKind: k, customValue: nextValue });
  }

  function setValue(v: number) {
    // Mantiene el signo coherente con el kind elegido.
    const k = meritFlaw.customKind ?? "MERIT";
    const sign = k === "MERIT" ? 1 : -1;
    const magnitude = Math.max(1, Math.min(7, Math.abs(Math.floor(v) || 1)));
    onChange({ customValue: sign * magnitude });
  }

  const kind = meritFlaw.customKind ?? "MERIT";
  const value = meritFlaw.customValue ?? (kind === "MERIT" ? 1 : -1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-heading text-[10px] uppercase tracking-widest text-amber-300">
          Personalizado
        </span>
        <div className="ml-auto flex items-center gap-1">
          {!readOnly ? (
            <Tooltip
              title="Volver al catálogo"
              content="Cancelar la entrada custom y elegir del catálogo V20."
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={onBackToCatalog}
                aria-label="Volver al catálogo"
              >
                <span className="font-heading text-[10px]">≡</span>
              </Button>
            </Tooltip>
          ) : null}
          {!readOnly ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onRemove}
              aria-label="Eliminar"
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Nombre"
          value={meritFlaw.customName ?? ""}
          disabled={readOnly}
          onChange={(e) => onChange({ customName: e.target.value })}
          className="h-8"
        />
        <Input
          placeholder="Categoría (Físico, Mental…)"
          value={meritFlaw.customCategory ?? ""}
          disabled={readOnly}
          onChange={(e) => onChange({ customCategory: e.target.value })}
          className="h-8"
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={kind}
          disabled={readOnly}
          onChange={(e) => setKind(e.target.value as "MERIT" | "FLAW")}
          className={cn(SELECT_DARK_CLASS, "h-8 flex-1")}
          aria-label="Tipo"
        >
          <option value="MERIT">Mérito</option>
          <option value="FLAW">Defecto</option>
        </select>
        <div className="flex items-center rounded-md border border-input bg-input/30">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setValue(Math.abs(value) - 1)}
            className="px-2 py-1 text-sm font-heading hover:bg-blood/20 disabled:opacity-40"
            aria-label="Bajar coste"
          >
            −
          </button>
          <span className="w-10 text-center font-heading text-sm tabular-nums">
            {kind === "MERIT" ? "+" : ""}
            {value}
          </span>
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setValue(Math.abs(value) + 1)}
            className="px-2 py-1 text-sm font-heading hover:bg-blood/20 disabled:opacity-40"
            aria-label="Subir coste"
          >
            +
          </button>
          <span className="px-1.5 text-[10px] text-muted-foreground">pts</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Fila de disciplina en la pestaña Ventajas de la hoja. Maneja los dos
 * modos del catálogo:
 *
 * - **Monolítica** (`disc.hasPaths === false` o sin catálogo aún cargado):
 *   select de disciplina + `DotRating` único + lista de poderes hasta
 *   el nivel comprado. Comportamiento legacy.
 *
 * - **Ramificada** (`disc.hasPaths === true`, Taumaturgia, Nigromancia):
 *   select de disciplina + subpanel de sendas. Cada senda tiene su
 *   `DotRating 1..5`, radio "primaria" y lista de poderes filtrados
 *   por el nivel conocido. Sección colapsable "Rituales conocidos"
 *   con checkboxes por ritual del catálogo.
 *
 * El handler `onUpdate` recibe `Partial<CharacterDiscipline>` con `paths`
 * y `learnedRitualIds` actualizados según corresponda; el componente
 * padre los manda íntegros al backend en el siguiente PATCH.
 */
function DisciplineRow({
  pick,
  disc,
  disciplines,
  readOnly,
  onUpdate,
  onRemove,
  onOpenInfo,
}: {
  index: number;
  pick: CharacterDiscipline;
  disc: Discipline | undefined;
  disciplines: Discipline[];
  readOnly: boolean;
  onUpdate: (patch: Partial<CharacterDiscipline>) => void;
  onRemove: () => void;
  onOpenInfo: (
    kind: "discipline" | "discipline-power" | "discipline-path" | "discipline-ritual",
    identifier: string,
    fallbackTitle?: string,
  ) => void;
}) {
  const hasPaths = !!disc?.hasPaths;
  const paths = disc?.paths ?? [];
  const rituals = disc?.rituals ?? [];

  function updatePath(pathId: string, level: number) {
    const existing = pick.paths ?? [];
    const found = existing.find((p) => p.pathId === pathId);
    let nextPaths;
    if (level <= 0) {
      // Quitar la senda.
      nextPaths = existing.filter((p) => p.pathId !== pathId);
    } else if (found) {
      nextPaths = existing.map((p) =>
        p.pathId === pathId ? { ...p, level: Math.max(1, Math.min(5, level)) } : p,
      );
    } else {
      // Si no había ninguna primaria, esta lo será.
      const anyPrimary = existing.some((p) => p.isPrimary);
      nextPaths = [
        ...existing,
        {
          pathId,
          level: Math.max(1, Math.min(5, level)),
          isPrimary: !anyPrimary,
        },
      ];
    }
    // Nivel general = máximo de las sendas (legacy, lo lee el back).
    const maxLevel = nextPaths.length
      ? Math.max(...nextPaths.map((p) => p.level))
      : 1;
    onUpdate({ paths: nextPaths, level: maxLevel });
  }

  function setPrimary(pathId: string) {
    const existing = pick.paths ?? [];
    const nextPaths = existing.map((p) => ({
      ...p,
      isPrimary: p.pathId === pathId,
    }));
    onUpdate({ paths: nextPaths });
  }

  function toggleRitual(ritualId: string, learned: boolean) {
    const existing = pick.learnedRitualIds ?? [];
    const next = learned
      ? [...existing, ritualId]
      : existing.filter((id) => id !== ritualId);
    onUpdate({ learnedRitualIds: next });
  }

  const ritualsByLevel = useMemo(() => {
    const map = new Map<number, DisciplineRitual[]>();
    for (const r of rituals) {
      const list = map.get(r.level) ?? [];
      list.push(r);
      map.set(r.level, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [rituals]);

  return (
    <div className="space-y-2 rounded-md border border-border/40 bg-background/30 p-2">
      <div className="flex items-center gap-2">
        <Tooltip
          title={disc?.name}
          content={
            disc?.tooltip ?? disc?.description ?? "Selecciona una disciplina."
          }
          className="flex-1"
        >
          <select
            value={pick.disciplineId}
            disabled={readOnly}
            onChange={(e) => {
              // Al cambiar de disciplina reseteamos paths y rituales — la
              // estructura no es trasladable entre disciplinas distintas.
              onUpdate({
                disciplineId: e.target.value,
                paths: [],
                learnedRitualIds: [],
              });
            }}
            className={cn(SELECT_DARK_CLASS, "h-8")}
          >
            {disciplines.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
                {opt.hasPaths ? " · sendas" : ""}
              </option>
            ))}
          </select>
        </Tooltip>
        {hasPaths ? (
          <span className="font-heading text-[0.65rem] uppercase tracking-widest text-blood">
            Nivel {pick.level}
          </span>
        ) : (
          <DotRating
            value={pick.level}
            min={1}
            onChange={(v) => onUpdate({ level: v })}
            readOnly={readOnly}
          />
        )}
        {!readOnly && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onRemove}
            aria-label="Eliminar disciplina"
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {hasPaths ? (
        <div className="space-y-2 rounded-md border border-border/30 bg-background/50 p-2">
          <p className="font-heading text-[0.65rem] uppercase tracking-[0.3em] text-blood">
            Sendas
          </p>
          {paths.map((p) => {
            const owned = (pick.paths ?? []).find((x) => x.pathId === p.id);
            const level = owned?.level ?? 0;
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenInfo(
                        "discipline-path",
                        `${disc!.name}|${p.key}`,
                        p.name,
                      );
                    }}
                    className="flex-1 text-left font-serif text-xs text-foreground underline decoration-dotted decoration-blood/30 underline-offset-2 hover:text-blood"
                  >
                    {p.name}
                  </button>
                  {!readOnly && level > 0 ? (
                    <label className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                      <input
                        type="radio"
                        name={`primary-${pick.disciplineId}`}
                        checked={!!owned?.isPrimary}
                        onChange={() => setPrimary(p.id)}
                        className="accent-blood"
                      />
                      <span className="uppercase tracking-widest">Primaria</span>
                    </label>
                  ) : null}
                  <DotRating
                    value={level}
                    min={0}
                    onChange={(v) => updatePath(p.id, v)}
                    readOnly={readOnly}
                  />
                </div>
                {level > 0 ? (
                  <ul className="ml-3 space-y-0.5 font-serif text-[0.7rem] text-muted-foreground">
                    {p.powers
                      .filter((pw) => pw.level <= level)
                      .map((pw) => (
                        <li key={pw.id} className="text-foreground/80">
                          <Tooltip
                            title={`${p.name} · Nivel ${pw.level}`}
                            content={
                              pw.tooltip ?? pw.summary ?? pw.description ?? ""
                            }
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                onOpenInfo(
                                  "discipline-power",
                                  `${disc!.name}|${p.key}|${pw.level}`,
                                  pw.name,
                                );
                              }}
                              className="underline decoration-dotted decoration-blood/30 underline-offset-2 hover:text-blood"
                            >
                              <span className="font-semibold text-blood">
                                ·{pw.level}·
                              </span>{" "}
                              {pw.name}
                            </button>
                          </Tooltip>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            );
          })}

          {rituals.length > 0 ? (
            <details className="rounded-md border border-border/30 bg-background/40 px-2 py-1.5">
              <summary className="cursor-pointer font-heading text-[0.65rem] uppercase tracking-widest text-blood">
                Rituales conocidos ({pick.learnedRitualIds?.length ?? 0})
              </summary>
              <div className="mt-2 space-y-2">
                {ritualsByLevel.map(([lvl, list]) => (
                  <div key={lvl} className="space-y-1">
                    <p className="font-heading text-[0.6rem] uppercase tracking-widest text-muted-foreground">
                      Nivel {lvl}
                    </p>
                    {list.map((r) => {
                      const checked = (pick.learnedRitualIds ?? []).includes(
                        r.id,
                      );
                      return (
                        <label
                          key={r.id}
                          className="flex items-start gap-2 text-[0.7rem] text-foreground/85"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={readOnly}
                            onChange={(e) =>
                              toggleRitual(r.id, e.target.checked)
                            }
                            className="mt-0.5 accent-blood"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              onOpenInfo(
                                "discipline-ritual",
                                `${disc!.name}|${r.key}`,
                                r.name,
                              );
                            }}
                            className="flex-1 text-left underline decoration-dotted decoration-blood/30 underline-offset-2 hover:text-blood"
                          >
                            {r.name}
                          </button>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        (disc?.powers ?? []).length > 0 && (
          <ul className="space-y-0.5 font-serif text-xs text-muted-foreground">
            {(disc?.powers ?? [])
              .filter((p) => p.level <= pick.level)
              .map((p) => (
                <li key={p.id} className="text-foreground/80">
                  <Tooltip
                    title={`Nivel ${p.level} · ${p.name}`}
                    content={p.tooltip ?? p.summary ?? p.description ?? ""}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (disc) {
                          onOpenInfo(
                            "discipline-power",
                            `${disc.name}|${p.level}`,
                            p.name,
                          );
                        }
                      }}
                      className="underline decoration-dotted decoration-blood/30 underline-offset-2 transition-colors hover:text-blood hover:decoration-blood focus:outline-none focus:text-blood"
                    >
                      <span className="font-semibold text-blood">·{p.level}·</span>{" "}
                      {p.name}
                    </button>
                  </Tooltip>
                </li>
              ))}
          </ul>
        )
      )}

      {disc ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onOpenInfo("discipline", disc.name, disc.name);
            }}
            className="font-heading text-[0.55rem] uppercase tracking-widest text-muted-foreground underline decoration-dotted decoration-blood/30 underline-offset-2 transition-colors hover:text-blood hover:decoration-blood focus:outline-none focus:text-blood"
          >
            Ver disciplina
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Fila para la Reserva de Sangre con stepper numérico. No usa DotRating
 * porque el techo varía con la generación (10 → 50). El máximo se infiere
 * desde la Tabla de Generación V20.
 */
function BloodPoolRow({
  value,
  generation,
  onChange,
  readOnly,
}: {
  value: number;
  generation: number | null;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  const max = bloodPoolForGeneration(generation) ?? 50;
  const tooltip = generation
    ? `${STATE_TOOLTIPS.bloodPool} · Máximo por generación ${generation}ª: ${max}.`
    : STATE_TOOLTIPS.bloodPool;
  function clamp(v: number) {
    return Math.max(0, Math.min(max, Math.floor(v)));
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <Tooltip title="Reserva de sangre" content={tooltip}>
        <span className="font-serif text-sm">Reserva de sangre</span>
      </Tooltip>
      <div className="flex items-center rounded-md border border-input bg-input/30">
        <button
          type="button"
          disabled={readOnly || value <= 0}
          onClick={() => onChange(clamp(value - 1))}
          className="px-2 py-1 text-sm font-heading hover:bg-blood/20 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Restar sangre"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={0}
          max={max}
          disabled={readOnly}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onChange(clamp(n));
            else if (e.target.value === "") onChange(0);
          }}
          aria-label="Reserva de sangre"
          className="h-7 w-14 bg-transparent text-center font-heading text-sm tabular-nums focus:outline-none"
        />
        <button
          type="button"
          disabled={readOnly || value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className="px-2 py-1 text-sm font-heading hover:bg-blood/20 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Sumar sangre"
        >
          +
        </button>
        <span className="px-2 text-[10px] text-muted-foreground tabular-nums">
          / {max}
        </span>
      </div>
    </div>
  );
}

function DotRow({
  label,
  tooltip,
  value,
  min,
  max,
  onChange,
  readOnly,
  specialty,
  onOpenSpecialty,
  onInfo,
  slots,
}: {
  label: string;
  tooltip?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  /** Texto actual de la especialidad (puede ser markdown). Activa el botón. */
  specialty?: string | null;
  /** Si está definido, se muestra el botón de especialidad cuando value>=4. */
  onOpenSpecialty?: () => void;
  /** Si está definido, el label es clicable y abre el InfoModal. */
  onInfo?: () => void;
  /**
   * Cantidad fija de huecos a renderizar (>= max). Los slots por encima
   * de `max` quedan inactivos y solo sirven para alinear con otras filas.
   */
  slots?: number;
}) {
  const canHaveSpecialty = value >= 4 && !!onOpenSpecialty;
  const hasSpecialty = !!specialty && specialty.trim().length > 0;

  const labelNode = onInfo ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onInfo();
      }}
      className="font-serif text-sm underline decoration-dotted decoration-blood/30 underline-offset-2 transition-colors hover:text-blood hover:decoration-blood focus:outline-none focus:text-blood"
    >
      {label}
    </button>
  ) : (
    <span className="font-serif text-sm">{label}</span>
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <Tooltip title={label} content={tooltip}>
        {labelNode}
      </Tooltip>
      <div className="flex items-center gap-1.5">
        {canHaveSpecialty ? (
          <Tooltip
            title={hasSpecialty ? "Editar especialidad" : "Declarar especialidad"}
            content={
              hasSpecialty
                ? "Especialidad declarada — click para ver / editar."
                : "Habilidad ≥ 4: puedes declarar una especialidad."
            }
          >
            <button
              type="button"
              onClick={(e) => {
                // Evita cualquier propagación a controles padres que pudieran
                // mal interpretarlo como submit del form externo.
                e.preventDefault();
                e.stopPropagation();
                onOpenSpecialty();
              }}
              aria-label={
                hasSpecialty
                  ? `Editar especialidad de ${label}`
                  : `Declarar especialidad de ${label}`
              }
              className={
                hasSpecialty
                  ? "inline-flex items-center gap-1 rounded-full border border-emerald-500 bg-emerald-500/20 px-2 py-0.5 font-heading text-[0.6rem] uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/30"
                  : "inline-flex items-center gap-1 rounded-full border border-blood/40 px-2 py-0.5 font-heading text-[0.6rem] uppercase tracking-widest text-blood/80 transition hover:bg-blood/10"
              }
            >
              <Star className="size-3" />
              Esp.
            </button>
          </Tooltip>
        ) : null}
        <DotRating
          value={value}
          min={min}
          max={max}
          slots={slots}
          onChange={onChange}
          readOnly={readOnly}
          size="sm"
          ariaLabel={label}
        />
      </div>
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
  description?: string | null;
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  tooltipTitle,
  tooltipContent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  tooltipTitle?: string;
  tooltipContent?: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <Tooltip title={tooltipTitle ?? label} content={tooltipContent}>
        <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </Tooltip>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_DARK_CLASS}
      >
        <option value="">{placeholder ?? "—"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} title={o.description ?? undefined}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Pestaña Equipo
// ─────────────────────────────────────────────────────────────────────

interface EquipmentTabProps {
  value: CharacterInput;
  weapons: Weapon[];
  weaponCategories: WeaponCategory[];
  armors: Armor[];
  readOnly?: boolean;
  addWeapon: (id: string) => void;
  updateWeaponRow: (i: number, p: Partial<CharacterWeapon>) => void;
  removeWeaponRow: (i: number) => void;
  addArmor: (id: string) => void;
  updateArmorRow: (i: number, p: Partial<CharacterArmor>) => void;
  removeArmorRow: (i: number) => void;
  onCreateWeapon?: () => void;
  onCreateArmor?: () => void;
  /** Abre el InfoModal para un arma del catálogo (por id o name). */
  onInfoWeapon?: (id: string, fallbackTitle?: string) => void;
  /** Abre el InfoModal para una armadura del catálogo. */
  onInfoArmor?: (id: string, fallbackTitle?: string) => void;
  /** Persiste cambios en el campo libre de pertenencias narrativas. */
  onUpdateEquipmentNotes: (next: string) => void;
}

function EquipmentTab({
  value,
  weapons,
  weaponCategories,
  armors,
  readOnly,
  addWeapon,
  updateWeaponRow,
  removeWeaponRow,
  addArmor,
  updateArmorRow,
  removeArmorRow,
  onCreateWeapon,
  onCreateArmor,
  onInfoWeapon,
  onInfoArmor,
  onUpdateEquipmentNotes,
}: EquipmentTabProps) {
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

  const myMelee = (value.weapons ?? []).filter(
    (w) => weaponsById.get(w.weaponId)?.kind === "MELEE",
  );
  const myRanged = (value.weapons ?? []).filter(
    (w) => weaponsById.get(w.weaponId)?.kind === "RANGED",
  );

  return (
    <div className="space-y-8">
      <WeaponSection
        title="Armas cuerpo a cuerpo"
        kind="MELEE"
        weaponsAvailable={meleeWeapons}
        categoriesOrder={meleeCategoriesOrder}
        rows={value.weapons ?? []}
        myRows={myMelee}
        weaponsById={weaponsById}
        readOnly={readOnly}
        addWeapon={addWeapon}
        updateWeaponRow={updateWeaponRow}
        removeWeaponRow={removeWeaponRow}
        onCreateWeapon={onCreateWeapon}
        onInfoWeapon={onInfoWeapon}
      />

      <WeaponSection
        title="Armas a distancia"
        kind="RANGED"
        weaponsAvailable={rangedWeapons}
        categoriesOrder={rangedCategoriesOrder}
        rows={value.weapons ?? []}
        myRows={myRanged}
        weaponsById={weaponsById}
        readOnly={readOnly}
        addWeapon={addWeapon}
        updateWeaponRow={updateWeaponRow}
        removeWeaponRow={removeWeaponRow}
        onCreateWeapon={onCreateWeapon}
        onInfoWeapon={onInfoWeapon}
      />

      <ArmorSection
        armorsAvailable={armors}
        rows={value.armors ?? []}
        armorsById={armorsById}
        readOnly={readOnly}
        addArmor={addArmor}
        updateArmorRow={updateArmorRow}
        removeArmorRow={removeArmorRow}
        onCreateArmor={onCreateArmor}
        onInfoArmor={onInfoArmor}
      />

      <div className="space-y-3">
        <SectionHeading>Pertenencias narrativas</SectionHeading>
        <p className="font-serif text-xs italic text-muted-foreground">
          Equipo, vestimenta, objetos significativos, vehículos, refugio.
          Texto libre con markdown — complementa la tabla de armas y armaduras.
        </p>
        <div className="h-96 overflow-hidden rounded-md border border-border bg-background/40">
          <MarkdownEditor
            value={value.equipmentNotes ?? ""}
            onChange={onUpdateEquipmentNotes}
            disabled={readOnly}
            maxLength={8000}
          />
        </div>
      </div>
    </div>
  );
}

interface WeaponSectionProps {
  title: string;
  kind: "MELEE" | "RANGED";
  weaponsAvailable: Weapon[];
  categoriesOrder: WeaponCategory[];
  rows: CharacterWeapon[];
  myRows: CharacterWeapon[];
  weaponsById: Map<string, Weapon>;
  readOnly?: boolean;
  addWeapon: (id: string) => void;
  updateWeaponRow: (i: number, p: Partial<CharacterWeapon>) => void;
  removeWeaponRow: (i: number) => void;
  onCreateWeapon?: () => void;
  onInfoWeapon?: (id: string, fallbackTitle?: string) => void;
}

function WeaponSection({
  title,
  kind,
  weaponsAvailable,
  categoriesOrder,
  rows,
  myRows,
  weaponsById,
  readOnly,
  addWeapon,
  updateWeaponRow,
  removeWeaponRow,
  onCreateWeapon,
  onInfoWeapon,
}: WeaponSectionProps) {
  // Agrupado por categoría para el <select>
  const grouped = useMemo(() => {
    const byCategoryId = new Map<string, Weapon[]>();
    for (const w of weaponsAvailable) {
      const list = byCategoryId.get(w.categoryId) ?? [];
      list.push(w);
      byCategoryId.set(w.categoryId, list);
    }
    return categoriesOrder
      .filter((c) => byCategoryId.has(c.id))
      .map((c) => ({ category: c, items: byCategoryId.get(c.id) ?? [] }));
  }, [weaponsAvailable, categoriesOrder]);

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between border-b border-border/60 pb-2">
        <h2 className="font-heading text-sm uppercase tracking-[0.3em] text-blood">
          {title}
        </h2>
        {!readOnly && onCreateWeapon ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCreateWeapon}
            className="border border-blood/40 text-blood hover:bg-blood/10"
            title="Crear arma personalizada"
          >
            <Plus className="size-4" /> Nueva arma
          </Button>
        ) : null}
      </header>

      {!readOnly ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/40 bg-background/40 p-3">
          <div className="flex-1 min-w-50 space-y-1">
            <label className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Añadir desde el catálogo
            </label>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addWeapon(e.target.value);
                  e.target.value = "";
                }
              }}
              className={SELECT_DARK_CLASS}
            >
              <option value="">Selecciona un arma...</option>
              {grouped.map(({ category, items }) => (
                <optgroup key={category.id} label={category.name}>
                  {items.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.system ? "" : " (custom)"}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {myRows.length === 0 ? (
        <p className="font-serif text-xs italic text-muted-foreground">
          Sin {kind === "MELEE" ? "armas cuerpo a cuerpo" : "armas a distancia"}.
        </p>
      ) : (
        <ul className="space-y-2">
          {myRows.map((row) => {
            const w = weaponsById.get(row.weaponId);
            // i en el array global de weapons (importante para update/remove)
            const i = rows.indexOf(row);
            return (
              <li
                key={`${row.weaponId}-${i}`}
                className="rounded-md border border-border/40 bg-card/50 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm uppercase tracking-wide text-foreground">
                      {w && onInfoWeapon ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onInfoWeapon(w.id, w.name);
                          }}
                          className="underline decoration-dotted decoration-blood/30 underline-offset-2 transition-colors hover:text-blood hover:decoration-blood focus:outline-none focus:text-blood"
                        >
                          {w.name}
                        </button>
                      ) : (
                        w?.name ?? "Arma desconocida"
                      )}
                      {w?.system === false ? (
                        <span className="ml-2 rounded border border-blood/40 px-1.5 py-0.5 align-middle font-mono text-[0.55rem] uppercase tracking-widest text-blood">
                          Custom
                        </span>
                      ) : null}
                    </p>
                    <p className="font-serif text-xs italic text-muted-foreground">
                      {w?.category?.name ?? "—"} ·{" "}
                      {formatDamage(w)} ·{" "}
                      {w?.lethal ? "Letal" : w?.aggravated ? "Agravado" : "Contundente"}
                      {w?.concealment ? ` · Ocultación ${w.concealment}` : ""}
                    </p>
                    {w?.kind === "RANGED" ? (
                      <p className="mt-0.5 font-mono text-[0.7rem] text-foreground/70">
                        Alc. {w.range ?? "—"} m · Cad. {w.rate ?? "—"} ·
                        Cargador {w.magazine ?? "—"}
                      </p>
                    ) : null}
                    {w?.notes ? (
                      <p className="mt-1 font-serif text-xs italic text-foreground/70">
                        {w.notes}
                      </p>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeWeaponRow(i)}
                      aria-label="Eliminar arma"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                {!readOnly ? (
                  <Input
                    value={row.notes ?? ""}
                    onChange={(e) => updateWeaponRow(i, { notes: e.target.value })}
                    placeholder="Notas (ej. munición especial, modificaciones)"
                    className="mt-2 h-8 text-xs"
                  />
                ) : row.notes ? (
                  <p className="mt-2 font-serif text-xs italic text-foreground/70">
                    {row.notes}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatDamage(w: Weapon | undefined): string {
  if (!w) return "—";
  if (w.damageBase === "STRENGTH") {
    return w.damageBonus > 0 ? `Fuerza +${w.damageBonus}` : "Fuerza";
  }
  return `${w.damageBonus}`;
}

interface ArmorSectionProps {
  armorsAvailable: Armor[];
  rows: CharacterArmor[];
  armorsById: Map<string, Armor>;
  readOnly?: boolean;
  addArmor: (id: string) => void;
  updateArmorRow: (i: number, p: Partial<CharacterArmor>) => void;
  removeArmorRow: (i: number) => void;
  onCreateArmor?: () => void;
  onInfoArmor?: (id: string, fallbackTitle?: string) => void;
}

function ArmorSection({
  armorsAvailable,
  rows,
  armorsById,
  readOnly,
  addArmor,
  updateArmorRow,
  removeArmorRow,
  onCreateArmor,
  onInfoArmor,
}: ArmorSectionProps) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between border-b border-border/60 pb-2">
        <h2 className="font-heading text-sm uppercase tracking-[0.3em] text-blood">
          Armaduras
        </h2>
        {!readOnly && onCreateArmor ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCreateArmor}
            className="border border-blood/40 text-blood hover:bg-blood/10"
            title="Crear armadura personalizada"
          >
            <Plus className="size-4" /> Nueva armadura
          </Button>
        ) : null}
      </header>

      {!readOnly ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/40 bg-background/40 p-3">
          <div className="flex-1 min-w-50 space-y-1">
            <label className="font-heading text-[0.65rem] uppercase tracking-widest text-muted-foreground">
              Añadir desde el catálogo
            </label>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  addArmor(e.target.value);
                  e.target.value = "";
                }
              }}
              className={SELECT_DARK_CLASS}
            >
              <option value="">Selecciona una armadura...</option>
              {armorsAvailable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.system ? "" : " (custom)"} · Abs +{a.rating} / Pen −{a.penalty}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="font-serif text-xs italic text-muted-foreground">
          Sin armaduras equipadas.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, i) => {
            const a = armorsById.get(row.armorId);
            return (
              <li
                key={`${row.armorId}-${i}`}
                className="rounded-md border border-border/40 bg-card/50 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm uppercase tracking-wide text-foreground">
                      {a && onInfoArmor ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onInfoArmor(a.id, a.name);
                          }}
                          className="underline decoration-dotted decoration-blood/30 underline-offset-2 transition-colors hover:text-blood hover:decoration-blood focus:outline-none focus:text-blood"
                        >
                          {a.name}
                        </button>
                      ) : (
                        a?.name ?? "Armadura desconocida"
                      )}
                      {a?.system === false ? (
                        <span className="ml-2 rounded border border-blood/40 px-1.5 py-0.5 align-middle font-mono text-[0.55rem] uppercase tracking-widest text-blood">
                          Custom
                        </span>
                      ) : null}
                    </p>
                    <p className="font-serif text-xs italic text-muted-foreground">
                      Absorción +{a?.rating ?? "?"} · Penalización −{a?.penalty ?? "?"}
                    </p>
                    {a?.description ? (
                      <p className="mt-1 font-serif text-xs italic text-foreground/70">
                        {a.description}
                      </p>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeArmorRow(i)}
                      aria-label="Eliminar armadura"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                {!readOnly ? (
                  <Input
                    value={row.notes ?? ""}
                    onChange={(e) => updateArmorRow(i, { notes: e.target.value })}
                    placeholder="Notas"
                    className="mt-2 h-8 text-xs"
                  />
                ) : row.notes ? (
                  <p className="mt-2 font-serif text-xs italic text-foreground/70">
                    {row.notes}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
