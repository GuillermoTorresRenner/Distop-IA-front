import { Minus, Plus } from "lucide-react";
import type {
  AbilityInfo,
  AttributeInfo,
  Background,
  Discipline,
  Virtue,
} from "~/lib/api/catalog/catalog.types";
import { Button } from "~/components/ui/button";
import { ATTRIBUTES, type AttributeDef } from "~/lib/character-sheet";
import { cn } from "~/lib/utils";
import type { OpenCatalogInfo } from "../character-wizard";
import { WizardInfoButton } from "../wizard-info";
import {
  PointPool,
  WizardCard,
} from "../wizard-primitives";
import {
  ABILITY_NAMES_BY_CATEGORY,
  abilityCategoryOf,
  FREEBIE_COST,
  freebiePoolStatus,
  type AttributeKey,
  type WizardFreebies,
  type WizardState,
  type WizardVirtues,
} from "../wizard-state";

interface StepFreebiesProps {
  state: WizardState;
  disciplines: Discipline[];
  backgrounds: Background[];
  onChange: (next: WizardFreebies) => void;
  attributesInfo?: AttributeInfo[];
  abilitiesInfo?: AbilityInfo[];
  virtuesInfo?: Virtue[];
  openCatalog?: OpenCatalogInfo;
}

const FREEBIE_INFO_BODY = `
Los **puntos gratuitos** ("bonus points") son los últimos 15 puntos del
proceso de creación. Sirven para afinar lo que los pasos anteriores no
alcanzaron: subir un rasgo por encima del tope (3 en habilidades, 5 en
atributos), comprar trasfondos extra (incluida la **Generación**, si te
quedaste corto en el paso de Trasfondos), mejorar virtudes, o subir
Humanidad y Voluntad.

**Tabla de costes** (1 círculo cuesta…):

- Atributo → **5** ptos
- Habilidad → **2**
- Disciplina → **7**
- Trasfondo → **1** (Generación incluida, baja un escalón por punto)
- Virtud (Conciencia, Autocontrol, Coraje) → **2**
- Humanidad → **1**
- Fuerza de Voluntad → **1**

Subir una virtud aquí **no actualiza automáticamente** Humanidad ni
Voluntad: si quieres más Humanidad o Voluntad, hay que comprarlas aparte
(es más barato que vía virtud). Esta es la regla del manual y se respeta
en el wizard.
`.trim();

const VIRTUE_KEY_MAP: Record<keyof WizardVirtues, string> = {
  conscience: "conscience",
  selfControl: "self-control",
  courage: "courage",
};

const HUMANITY_FREEBIE_INFO = `
La **Humanidad** mide cuánto queda en ti del mortal que fuiste. Sube y baja
durante el juego (degeneraciones), pero al crear el personaje partes con un
valor igual a **Conciencia + Autocontrol**.

Aquí puedes comprar Humanidad **extra** por **1 punto gratuito por círculo**.
Es un atajo más barato que comprar las virtudes correspondientes.
`.trim();

const WILLPOWER_FREEBIE_INFO = `
La **Fuerza de Voluntad** permanente parte igual a tu **Coraje** y puedes
elevarla aquí por **1 punto gratuito por círculo**. Es habitualmente más
barato que comprar Coraje (que cuesta 2 ptos y arrastra otros efectos).
`.trim();

const COST_TABLE: { label: string; cost: number }[] = [
  { label: "Atributo", cost: FREEBIE_COST.attribute },
  { label: "Habilidad", cost: FREEBIE_COST.ability },
  { label: "Disciplina", cost: FREEBIE_COST.discipline },
  { label: "Trasfondo", cost: FREEBIE_COST.background },
  { label: "Virtud", cost: FREEBIE_COST.virtue },
  { label: "Humanidad", cost: FREEBIE_COST.humanity },
  { label: "Voluntad", cost: FREEBIE_COST.willpower },
];

export function StepFreebies({
  state,
  disciplines,
  backgrounds,
  onChange,
  attributesInfo = [],
  abilitiesInfo = [],
  virtuesInfo = [],
  openCatalog,
}: StepFreebiesProps) {
  const pool = freebiePoolStatus(state);

  function update(patch: Partial<WizardFreebies>) {
    onChange({ ...state.freebies, ...patch });
  }

  function bumpAttribute(key: AttributeKey, delta: number) {
    const current = state.freebies.attributes[key] ?? 0;
    const next = Math.max(0, current + delta);
    const newSpend =
      pool.spent +
      (next - current) * FREEBIE_COST.attribute;
    if (newSpend > pool.total) return;
    const updated = { ...state.freebies.attributes };
    if (next === 0) delete updated[key];
    else updated[key] = next;
    update({ attributes: updated });
  }

  function bumpAbility(name: string, delta: number) {
    const current = state.freebies.abilities[name] ?? 0;
    const next = Math.max(0, current + delta);
    const newSpend =
      pool.spent +
      (next - current) * FREEBIE_COST.ability;
    if (newSpend > pool.total) return;
    const updated = { ...state.freebies.abilities };
    if (next === 0) delete updated[name];
    else updated[name] = next;
    update({ abilities: updated });
  }

  function bumpDiscipline(id: string, delta: number) {
    const current = state.freebies.disciplines[id] ?? 0;
    const next = Math.max(0, current + delta);
    const newSpend =
      pool.spent +
      (next - current) * FREEBIE_COST.discipline;
    if (newSpend > pool.total) return;
    const updated = { ...state.freebies.disciplines };
    if (next === 0) delete updated[id];
    else updated[id] = next;
    update({ disciplines: updated });
  }

  function bumpBackground(key: string, delta: number) {
    const current = state.freebies.backgrounds[key] ?? 0;
    const next = Math.max(0, current + delta);
    const newSpend =
      pool.spent +
      (next - current) * FREEBIE_COST.background;
    if (newSpend > pool.total) return;
    const updated = { ...state.freebies.backgrounds };
    if (next === 0) delete updated[key];
    else updated[key] = next;
    update({ backgrounds: updated });
  }

  function bumpVirtue(key: keyof WizardVirtues, delta: number) {
    const current = state.freebies.virtues[key] ?? 0;
    const next = Math.max(0, current + delta);
    const newSpend =
      pool.spent +
      (next - current) * FREEBIE_COST.virtue;
    if (newSpend > pool.total) return;
    const updated = { ...state.freebies.virtues };
    if (next === 0) delete updated[key];
    else updated[key] = next;
    update({ virtues: updated });
  }

  function bumpHumanity(delta: number) {
    const current = state.freebies.humanity;
    const next = Math.max(0, current + delta);
    const newSpend = pool.spent + (next - current) * FREEBIE_COST.humanity;
    if (newSpend > pool.total) return;
    update({ humanity: next });
  }

  function bumpWillpower(delta: number) {
    const current = state.freebies.willpower;
    const next = Math.max(0, current + delta);
    const newSpend = pool.spent + (next - current) * FREEBIE_COST.willpower;
    if (newSpend > pool.total) return;
    update({ willpower: next });
  }

  return (
    <WizardCard
      title="Paso seis · Puntos gratuitos"
      subtitle={`Gasta los ${pool.total} puntos finales.`}
      description={
        <span className="inline-flex items-center gap-2">
          <span>
            Estos puntos sirven para afinar al personaje y comprar lo que los
            pasos anteriores no alcanzaron. Si quieres bajar más tu generación,
            puedes gastar puntos aquí en el trasfondo «Generación».
          </span>
          <WizardInfoButton
            tooltip="Cómo gastar los 15 puntos gratuitos"
            inline={{
              title: "Puntos gratuitos (V20)",
              subtitle: "Paso 6 · Cierre",
              body: FREEBIE_INFO_BODY,
            }}
            ariaLabel="Información sobre los puntos gratuitos"
          />
        </span>
      }
      aside={
        <div className="space-y-2">
          <PointPool label="Puntos gratuitos" {...pool} />
          <table className="w-full text-[0.7rem]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-heading uppercase tracking-widest">
                  Coste
                </th>
                <th className="text-right font-heading uppercase tracking-widest">
                  ptos / círculo
                </th>
              </tr>
            </thead>
            <tbody>
              {COST_TABLE.map((row) => (
                <tr key={row.label} className="border-t border-border/40">
                  <td className="py-1 text-foreground/80">{row.label}</td>
                  <td className="py-1 text-right font-display text-foreground">
                    {row.cost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      <Section title="Atributos">
        {ATTRIBUTES.map((a: AttributeDef) => {
          const def = attributesInfo.find((x) => x.key === a.key || x.name === a.label);
          return (
            <FreebieRow
              key={a.key}
              label={a.label}
              base={state.attributes.values[a.key]}
              extra={state.freebies.attributes[a.key] ?? 0}
              cost={FREEBIE_COST.attribute}
              onDec={() => bumpAttribute(a.key, -1)}
              onInc={() => bumpAttribute(a.key, +1)}
              canInc={pool.remaining >= FREEBIE_COST.attribute}
              maxBase={5}
              info={
                openCatalog ? (
                  <WizardInfoButton
                    tooltip={def?.tooltip ?? `Detalle de ${a.label}`}
                    kind="attribute"
                    identifier={def?.key ?? a.key}
                    fallbackTitle={a.label}
                    onOpenCatalog={openCatalog}
                    ariaLabel={`Información del atributo ${a.label}`}
                  />
                ) : null
              }
            />
          );
        })}
      </Section>

      <Section title="Habilidades">
        {(["talents", "skills", "knowledges"] as const).map((cat) => (
          <div key={cat}>
            <h4 className="mb-1 mt-2 font-heading text-[0.65rem] uppercase tracking-widest text-blood/80">
              {cat === "talents"
                ? "Talentos"
                : cat === "skills"
                  ? "Técnicas"
                  : "Conocimientos"}
            </h4>
            {ABILITY_NAMES_BY_CATEGORY[cat].map((name) => {
              const def = abilitiesInfo.find((a) => a.name === name);
              return (
                <FreebieRow
                  key={name}
                  label={name}
                  base={state.abilities.values[name] ?? 0}
                  extra={state.freebies.abilities[name] ?? 0}
                  cost={FREEBIE_COST.ability}
                  onDec={() => bumpAbility(name, -1)}
                  onInc={() => bumpAbility(name, +1)}
                  canInc={pool.remaining >= FREEBIE_COST.ability}
                  info={
                    openCatalog ? (
                      <WizardInfoButton
                        tooltip={def?.tooltip ?? `Detalle de ${name}`}
                        kind="ability"
                        identifier={name}
                        fallbackTitle={name}
                        onOpenCatalog={openCatalog}
                        ariaLabel={`Información de la habilidad ${name}`}
                      />
                    ) : null
                  }
                />
              );
            })}
          </div>
        ))}
      </Section>

      <Section title="Disciplinas">
        {disciplines.map((d) => {
          const base =
            state.disciplines.find((x) => x.disciplineId === d.id)?.level ?? 0;
          return (
            <FreebieRow
              key={d.id}
              label={d.name}
              base={base}
              extra={state.freebies.disciplines[d.id] ?? 0}
              cost={FREEBIE_COST.discipline}
              onDec={() => bumpDiscipline(d.id, -1)}
              onInc={() => bumpDiscipline(d.id, +1)}
              canInc={pool.remaining >= FREEBIE_COST.discipline}
              info={
                openCatalog ? (
                  <WizardInfoButton
                    tooltip={d.tooltip ?? `Detalle de ${d.name}`}
                    kind="discipline"
                    identifier={d.name}
                    fallbackTitle={d.name}
                    onOpenCatalog={openCatalog}
                    ariaLabel={`Información de la disciplina ${d.name}`}
                  />
                ) : null
              }
            />
          );
        })}
      </Section>

      <Section title="Trasfondos">
        {backgrounds.map((b) => {
          const base =
            state.backgrounds.find((x) => x.key === b.key)?.level ?? 0;
          return (
            <FreebieRow
              key={b.key}
              label={b.name}
              base={base}
              extra={state.freebies.backgrounds[b.key] ?? 0}
              cost={FREEBIE_COST.background}
              onDec={() => bumpBackground(b.key, -1)}
              onInc={() => bumpBackground(b.key, +1)}
              canInc={pool.remaining >= FREEBIE_COST.background}
              hint={
                b.key === "generacion" || b.key === "generation"
                  ? "Cada punto baja un escalón desde la 13.ª"
                  : undefined
              }
              info={
                openCatalog ? (
                  <WizardInfoButton
                    tooltip={b.tooltip ?? `Detalle de ${b.name}`}
                    kind="background"
                    identifier={b.key}
                    fallbackTitle={b.name}
                    onOpenCatalog={openCatalog}
                    ariaLabel={`Información del trasfondo ${b.name}`}
                  />
                ) : null
              }
            />
          );
        })}
      </Section>

      <Section title="Virtudes y rasgos derivados">
        {(["conscience", "selfControl", "courage"] as const).map((key) => {
          const label =
            key === "conscience" ? "Conciencia"
            : key === "selfControl" ? "Autocontrol"
            : "Coraje";
          const def = virtuesInfo.find(
            (v) => v.key === VIRTUE_KEY_MAP[key] || v.key === key,
          );
          return (
            <FreebieRow
              key={key}
              label={label}
              base={state.virtues[key]}
              extra={state.freebies.virtues[key] ?? 0}
              cost={FREEBIE_COST.virtue}
              onDec={() => bumpVirtue(key, -1)}
              onInc={() => bumpVirtue(key, +1)}
              canInc={pool.remaining >= FREEBIE_COST.virtue}
              info={
                <WizardInfoButton
                  tooltip={def?.tooltip ?? `Detalle de ${label}`}
                  inline={{
                    title: def?.name ?? label,
                    subtitle: "Virtud",
                    body: def?.description ?? null,
                  }}
                  ariaLabel={`Información de ${label}`}
                />
              }
            />
          );
        })}
        <FreebieRow
          label="Humanidad"
          base={state.virtues.conscience + state.virtues.selfControl}
          extra={state.freebies.humanity}
          cost={FREEBIE_COST.humanity}
          onDec={() => bumpHumanity(-1)}
          onInc={() => bumpHumanity(+1)}
          canInc={pool.remaining >= FREEBIE_COST.humanity}
          hint="Comprada aparte, no se recalcula desde las virtudes"
          info={
            <WizardInfoButton
              tooltip="Qué es la Humanidad"
              inline={{
                title: "Humanidad",
                subtitle: "Estado moral",
                body: HUMANITY_FREEBIE_INFO,
              }}
              ariaLabel="Información sobre la Humanidad"
            />
          }
        />
        <FreebieRow
          label="Fuerza de Voluntad"
          base={state.virtues.courage}
          extra={state.freebies.willpower}
          cost={FREEBIE_COST.willpower}
          onDec={() => bumpWillpower(-1)}
          onInc={() => bumpWillpower(+1)}
          canInc={pool.remaining >= FREEBIE_COST.willpower}
          info={
            <WizardInfoButton
              tooltip="Qué es la Fuerza de Voluntad"
              inline={{
                title: "Fuerza de Voluntad",
                subtitle: "Recurso mental",
                body: WILLPOWER_FREEBIE_INFO,
              }}
              ariaLabel="Información sobre la Fuerza de Voluntad"
            />
          }
        />
      </Section>
    </WizardCard>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1 rounded-md border border-border/60 bg-background/40 p-3">
      <h3 className="font-heading text-xs uppercase tracking-widest text-blood">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

interface FreebieRowProps {
  label: string;
  base: number;
  extra: number;
  cost: number;
  onDec: () => void;
  onInc: () => void;
  canInc: boolean;
  hint?: string;
  /** Tope del valor base (ej. atributos hasta 5). Si está, no permite subir
   * `extra` cuando base+extra alcanza el tope. */
  maxBase?: number;
  /** Botón "i" u otro slot a la izquierda del label. */
  info?: React.ReactNode;
}

function FreebieRow({
  label,
  base,
  extra,
  cost,
  onDec,
  onInc,
  canInc,
  hint,
  maxBase,
  info,
}: FreebieRowProps) {
  const total = base + extra;
  const atCap = maxBase != null && total >= maxBase;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 text-sm hover:border-border/60",
        extra > 0 && "border-blood/30 bg-blood/5",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {info ? <span className="shrink-0">{info}</span> : null}
        <span className="truncate font-serif text-foreground">{label}</span>
        {hint ? (
          <span className="truncate text-[0.65rem] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[0.7rem] text-muted-foreground">
          base <span className="font-display text-foreground">{base}</span>
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={extra <= 0}
          onClick={onDec}
          aria-label="Restar punto gratuito"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-6 text-center font-display text-base text-foreground">
          +{extra}
        </span>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={!canInc || atCap}
          onClick={onInc}
          aria-label="Sumar punto gratuito"
        >
          <Plus className="size-3.5" />
        </Button>
        <span className="w-12 text-right text-[0.7rem] text-muted-foreground">
          {extra > 0 ? `-${extra * cost} pt` : `${cost}/pt`}
        </span>
      </div>
    </div>
  );
}

// Silenciamos warning si nunca llegamos a usar `abilityCategoryOf` aquí
// (lo dejamos importado para futuras extensiones del paso de freebies).
void abilityCategoryOf;
