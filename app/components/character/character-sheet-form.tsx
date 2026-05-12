import { Plus, Trash2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { DotRating } from "~/components/character/dot-rating";
import { HealthToggle, type DamageState } from "~/components/character/health-toggle";
import { FormField } from "~/components/common/form-field";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type {
  Archetype,
  Clan,
  Discipline,
  MeritFlaw,
} from "~/lib/api/catalog/catalog.types";
import type {
  CharacterAbility,
  CharacterBackground,
  CharacterDiscipline,
  CharacterInput,
  CharacterMeritFlaw,
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
import { cn } from "~/lib/utils";

interface Props {
  value: CharacterInput;
  onChange: (next: CharacterInput) => void;
  archetypes: Archetype[];
  clans: Clan[];
  disciplines: Discipline[];
  meritsFlaws: MeritFlaw[];
  readOnly?: boolean;
}

const SELECT_DARK_CLASS =
  "h-9 w-full rounded-md border border-input bg-input/30 px-2.5 text-sm text-foreground dark:bg-input/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none [&>option]:bg-popover [&>option]:text-popover-foreground";

export function CharacterSheetForm({
  value,
  onChange,
  archetypes,
  clans,
  disciplines,
  meritsFlaws,
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

      {/* Méritos / Estado */}
      <SectionHeading>Méritos · Defectos · Estado</SectionHeading>
      <div className="grid gap-6 lg:grid-cols-3">
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
            label="Voluntad (máx)"
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
