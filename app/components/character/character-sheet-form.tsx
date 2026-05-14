import { Plus, Trash2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { DotRating } from "~/components/character/dot-rating";
import { HealthToggle, type DamageState } from "~/components/character/health-toggle";
import { FormField } from "~/components/common/form-field";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs } from "~/components/common/tabs";
import { Textarea } from "~/components/ui/textarea";
import type {
  Archetype,
  Armor,
  Clan,
  Discipline,
  MeritFlaw,
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
  ATTRIBUTES,
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
  weapons: Weapon[];
  weaponCategories: WeaponCategory[];
  armors: Armor[];
  onCreateWeapon?: () => void;
  onCreateArmor?: () => void;
  readOnly?: boolean;
}

export function CharacterSheetForm({
  value,
  onChange,
  archetypes,
  clans,
  disciplines,
  meritsFlaws,
  weapons,
  weaponCategories,
  armors,
  onCreateWeapon,
  onCreateArmor,
  readOnly,
}: Props) {
  function patch(p: Partial<CharacterInput>) {
    onChange({ ...value, ...p });
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
    const list = [
      ...(value.meritsFlaws ?? []),
      { meritFlawId: meritsFlaws[0]?.id ?? "" } as CharacterMeritFlaw,
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

  const selectedClan = clans.find((c) => c.id === value.clanId);
  const selectedNature = archetypes.find((a) => a.id === value.natureId);
  const selectedDemeanor = archetypes.find((a) => a.id === value.demeanorId);

  return (
    <div className="space-y-8">
      {/* Identidad */}
      <SectionHeading>Identidad</SectionHeading>
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
            selectedNature?.description ?? IDENTITY_TOOLTIPS.nature
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
          value=""
          disabled
          hint="Se infiere del usuario logueado"
          onChange={() => undefined}
        />

        <SelectField
          label="Conducta"
          tooltipTitle="Conducta"
          tooltipContent={
            selectedDemeanor?.description ?? IDENTITY_TOOLTIPS.demeanor
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

        <Tooltip content={IDENTITY_TOOLTIPS.chronicleName} title="Crónica">
          <FormField
            label="Crónica"
            name="chronicleName"
            value={value.chronicleName ?? ""}
            disabled={readOnly}
            onChange={(e) => patch({ chronicleName: e.target.value })}
            containerClassName="w-full"
          />
        </Tooltip>

        <SelectField
          label="Clan"
          tooltipTitle={selectedClan?.name ?? "Clan"}
          tooltipContent={
            selectedClan ? (
              <span>
                <span className="block">{selectedClan.description}</span>
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
              tooltip={ATTR_TOOLTIPS[a.label]}
              value={value[a.key] ?? 1}
              min={1}
              max={5}
              onChange={(v) => patch({ [a.key]: v })}
              readOnly={readOnly}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Sociales">
          {social.map((a) => (
            <DotRow
              key={a.key}
              label={a.label}
              tooltip={ATTR_TOOLTIPS[a.label]}
              value={value[a.key] ?? 1}
              min={1}
              max={5}
              onChange={(v) => patch({ [a.key]: v })}
              readOnly={readOnly}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Mentales">
          {mental.map((a) => (
            <DotRow
              key={a.key}
              label={a.label}
              tooltip={ATTR_TOOLTIPS[a.label]}
              value={value[a.key] ?? 1}
              min={1}
              max={5}
              onChange={(v) => patch({ [a.key]: v })}
              readOnly={readOnly}
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
              tooltip={ABILITY_TOOLTIPS[name]}
              value={getAbility("TALENT", name)}
              min={0}
              max={5}
              onChange={(v) => setAbility("TALENT", name, v)}
              readOnly={readOnly}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Técnicas">
          {SKILLS.map((name) => (
            <DotRow
              key={name}
              label={name}
              tooltip={ABILITY_TOOLTIPS[name]}
              value={getAbility("SKILL", name)}
              min={0}
              max={5}
              onChange={(v) => setAbility("SKILL", name, v)}
              readOnly={readOnly}
            />
          ))}
        </AttrBlock>
        <AttrBlock title="Conocimientos">
          {KNOWLEDGES.map((name) => (
            <DotRow
              key={name}
              label={name}
              tooltip={ABILITY_TOOLTIPS[name]}
              value={getAbility("KNOWLEDGE", name)}
              min={0}
              max={5}
              onChange={(v) => setAbility("KNOWLEDGE", name, v)}
              readOnly={readOnly}
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
        {/* Trasfondos */}
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
            (value.backgrounds ?? []).map((bg, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Recursos, Aliados, ..."
                  value={bg.name}
                  disabled={readOnly}
                  onChange={(e) => updateBackground(i, { name: e.target.value })}
                  className="h-8 flex-1"
                />
                <DotRating
                  value={bg.level}
                  onChange={(v) => updateBackground(i, { level: v })}
                  readOnly={readOnly}
                />
                {!readOnly && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeBackground(i)}
                    aria-label="Eliminar trasfondo"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))
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
              const powers = disc?.powers ?? [];
              return (
                <div key={i} className="space-y-2 rounded-md border border-border/40 bg-background/30 p-2">
                  <div className="flex items-center gap-2">
                    <Tooltip
                      title={disc?.name}
                      content={disc?.description ?? "Selecciona una disciplina."}
                      className="flex-1"
                    >
                      <select
                        value={d.disciplineId}
                        disabled={readOnly}
                        onChange={(e) => updateDiscipline(i, { disciplineId: e.target.value })}
                        className={cn(SELECT_DARK_CLASS, "h-8")}
                      >
                        {disciplines.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </Tooltip>
                    <DotRating
                      value={d.level}
                      min={1}
                      onChange={(v) => updateDiscipline(i, { level: v })}
                      readOnly={readOnly}
                    />
                    {!readOnly && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeDiscipline(i)}
                        aria-label="Eliminar disciplina"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  {powers.length > 0 && (
                    <ul className="space-y-0.5 font-serif text-xs text-muted-foreground">
                      {powers
                        .filter((p) => p.level <= d.level)
                        .map((p) => (
                          <li key={p.id} className="text-foreground/80">
                            <Tooltip title={`Nivel ${p.level} · ${p.name}`} content={p.description ?? ""}>
                              <span>
                                <span className="font-semibold text-blood">·{p.level}·</span>{" "}
                                {p.name}
                              </span>
                            </Tooltip>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
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
                ? VIRTUE_TOOLTIPS.Convicción
                : VIRTUE_TOOLTIPS.Conciencia
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
                ? VIRTUE_TOOLTIPS.Instintos
                : VIRTUE_TOOLTIPS.Autocontrol
            }
            value={value.selfControl ?? 1}
            min={1}
            max={5}
            onChange={(v) => patch({ selfControl: v })}
            readOnly={readOnly}
          />
          <DotRow
            label="Coraje"
            tooltip={VIRTUE_TOOLTIPS.Coraje}
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
            (value.meritsFlaws ?? []).map((m, i) => {
              const cat = meritsFlaws.find((x) => x.id === m.meritFlawId);
              return (
                <div key={i} className="space-y-1 rounded-md border border-border/40 bg-background/30 p-2">
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
                        value={m.meritFlawId}
                        disabled={readOnly}
                        onChange={(e) => updateMeritFlaw(i, { meritFlawId: e.target.value })}
                        className={cn(SELECT_DARK_CLASS, "h-8")}
                      >
                        {meritsFlaws.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            [{opt.kind === "MERIT" ? "+" : ""}{opt.value}] {opt.name}
                            {opt.category ? ` · ${opt.category}` : ""}
                          </option>
                        ))}
                      </select>
                    </Tooltip>
                    {!readOnly && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeMeritFlaw(i)}
                        aria-label="Eliminar"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
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
            onChange={(v) => patch({ willpowerCurrent: v })}
            readOnly={readOnly}
          />
          <DotRow
            label="Reserva de sangre"
            tooltip={STATE_TOOLTIPS.bloodPool}
            value={value.bloodPool ?? 0}
            min={0}
            max={20}
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
          {HEALTH_LEVELS.map((h) => (
            <div key={h.key} className="flex items-center justify-between gap-2">
              <Tooltip title={h.label} content={HEALTH_TOOLTIPS[h.label]}>
                <span className="flex flex-1 items-center justify-between font-serif text-sm">
                  {h.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {h.penalty}
                  </span>
                </span>
              </Tooltip>
              <HealthToggle
                value={value[h.key] ?? 0}
                onChange={(v: DamageState) => patch({ [h.key]: v })}
                readOnly={readOnly}
                ariaLabel={`Daño ${h.label}`}
              />
            </div>
          ))}
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
              />
            ) : null}

            {activeTab === "notas" ? (
              <div className="space-y-3">
                <SectionHeading>Notas del jugador</SectionHeading>
                <p className="font-serif text-xs italic text-muted-foreground">
                  Espacio libre para apuntes de historia, contactos, frases del
                  Narrador, etc. Solo tú las verás.
                </p>
                <Textarea
                  value={value.notes ?? ""}
                  disabled={readOnly}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={18}
                  maxLength={8000}
                  placeholder="Hila aquí los secretos del vástago..."
                  className="font-serif text-sm leading-relaxed"
                />
                <p className="text-right font-mono text-[0.65rem] text-muted-foreground">
                  {(value.notes ?? "").length} / 8000
                </p>
              </div>
            ) : null}
          </>
        )}
      </Tabs>
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

function DotRow({
  label,
  tooltip,
  value,
  min,
  max,
  onChange,
  readOnly,
}: {
  label: string;
  tooltip?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Tooltip title={label} content={tooltip}>
        <span className="font-serif text-sm">{label}</span>
      </Tooltip>
      <DotRating
        value={value}
        min={min}
        max={max}
        onChange={onChange}
        readOnly={readOnly}
        size="sm"
        ariaLabel={label}
      />
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
      />
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
                      {w?.name ?? "Arma desconocida"}
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
                      {a?.name ?? "Armadura desconocida"}
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
