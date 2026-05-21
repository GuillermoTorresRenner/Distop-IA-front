import type { AbilityInfo } from "~/lib/api/catalog/catalog.types";
import type { OpenCatalogInfo } from "../character-wizard";
import { WizardInfoButton } from "../wizard-info";
import {
  DotRatingRow,
  PointPool,
  PriorityPicker,
  WizardCard,
} from "../wizard-primitives";
import {
  ABILITY_NAMES_BY_CATEGORY,
  ABILITY_POOL_BY_PRIORITY,
  abilityCategoryPool,
  CREATION_ABILITY_MAX,
  type AbilityCategory,
  type AbilityPriority,
  type WizardAbilities,
  type WizardState,
} from "../wizard-state";

interface StepAbilitiesProps {
  state: WizardState;
  onChange: (next: WizardAbilities) => void;
  abilitiesInfo: AbilityInfo[];
  openCatalog: OpenCatalogInfo;
}

const ABILITY_PRIORITY_INFO = `
Igual que con los atributos, las habilidades se reparten por categorías:

- **Talentos** — intuitivos y callejeros (Alerta, Empatía, Esquivar, etc.).
  No requieren entrenamiento formal.
- **Técnicas** — aprendidas con la práctica (Armas, Conducir, Sigilo).
- **Conocimientos** — estudio formal (Academicismo, Medicina, Política).

Asigna **13** puntos a tu categoría primaria, **9** a la secundaria y **5** a
la terciaria. Las habilidades arrancan en **0** y, durante la creación,
**ninguna puede subir de 3 puntos**: los grados 4 y 5 sólo se compran con
puntos gratuitos al final (2 ptos por círculo).

Una habilidad a 0 significa "no tengo idea": si la tiras, sólo cuenta el
atributo y la dificultad aumenta.
`.trim();

const CATEGORY_LABELS: Record<AbilityCategory, string> = {
  talents: "Talentos",
  skills: "Técnicas",
  knowledges: "Conocimientos",
};

const CATEGORY_DESCRIPTIONS: Record<AbilityCategory, string> = {
  talents: "Habilidades intuitivas, callejeras.",
  skills: "Aprendidas con la práctica.",
  knowledges: "Estudio formal y experiencia.",
};

export function StepAbilities({
  state,
  onChange,
  abilitiesInfo,
  openCatalog,
}: StepAbilitiesProps) {
  const { abilities } = state;

  function setPriority(cat: AbilityCategory, prio: AbilityPriority) {
    const next: WizardAbilities = {
      ...abilities,
      priority: { ...abilities.priority },
    };
    const otherCat = (Object.keys(next.priority) as AbilityCategory[]).find(
      (k) => k !== cat && next.priority[k] === prio,
    );
    const previous = next.priority[cat];
    next.priority[cat] = prio;
    if (otherCat) next.priority[otherCat] = previous;
    onChange(next);
  }

  function setAbilityValue(name: string, value: number) {
    const next: WizardAbilities = {
      ...abilities,
      values: {
        ...abilities.values,
        [name]: clamp(value, 0, CREATION_ABILITY_MAX),
      },
    };
    onChange(next);
  }

  return (
    <WizardCard
      title="Paso tres · Habilidades"
      subtitle="Ordena 13 / 9 / 5 entre Talentos, Técnicas y Conocimientos."
      description={
        <span className="inline-flex items-center gap-2">
          <span>
            Ninguna habilidad puede superar <strong>3 puntos</strong> durante la creación; los grados más altos
            se compran con puntos gratuitos al final. Las habilidades arrancan en 0.
          </span>
          <WizardInfoButton
            tooltip="Reparto 13/9/5 y categorías"
            inline={{
              title: "Reparto de habilidades (V20)",
              subtitle: "Paso 3 del manual",
              body: ABILITY_PRIORITY_INFO,
            }}
            ariaLabel="Información del reparto 13/9/5"
          />
        </span>
      }
    >
      {/* Contadores de puntos por categoría: fila horizontal sobre las
          tres columnas para liberar el ancho del aside. */}
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(CATEGORY_LABELS) as AbilityCategory[]).map((cat) => (
          <PointPool
            key={cat}
            label={CATEGORY_LABELS[cat]}
            {...abilityCategoryPool(state, cat)}
          />
        ))}
      </div>

      <PriorityPicker<AbilityCategory>
        categories={(Object.keys(CATEGORY_LABELS) as AbilityCategory[]).map(
          (k) => ({
            key: k,
            label: CATEGORY_LABELS[k],
            description: CATEGORY_DESCRIPTIONS[k],
          }),
        )}
        value={abilities.priority}
        pools={ABILITY_POOL_BY_PRIORITY}
        onChange={setPriority}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(CATEGORY_LABELS) as AbilityCategory[]).map((cat) => {
          const pool = abilityCategoryPool(state, cat);
          const ready = !!abilities.priority[cat];
          return (
            <section
              key={cat}
              className="space-y-1.5 rounded-md border border-border/60 bg-background/40 p-3"
            >
              <header className="flex items-center justify-between">
                <h3 className="font-heading text-xs uppercase tracking-widest text-blood">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <span className="text-[0.7rem] text-muted-foreground">
                  {ready ? `${pool.remaining} ptos.` : "Asigna prioridad"}
                </span>
              </header>
              <div className="space-y-1.5">
                {ABILITY_NAMES_BY_CATEGORY[cat].map((name) => {
                  const info = abilitiesInfo.find((a) => a.name === name);
                  const value = abilities.values[name] ?? 0;
                  // Techo dinámico: nunca supera CREATION_ABILITY_MAX (3 en creación)
                  // ni permite consumir más puntos de los que quedan en el pool.
                  const dynamicMax = Math.min(
                    CREATION_ABILITY_MAX,
                    value + Math.max(0, pool.remaining),
                  );
                  return (
                    <DotRatingRow
                      key={name}
                      label={name}
                      info={
                        <WizardInfoButton
                          tooltip={info?.tooltip ?? `Detalle de ${name}`}
                          kind="ability"
                          identifier={name}
                          fallbackTitle={name}
                          onOpenCatalog={openCatalog}
                          ariaLabel={`Información de la habilidad ${name}`}
                        />
                      }
                      value={value}
                      min={0}
                      max={dynamicMax}
                      dotsTotal={CREATION_ABILITY_MAX}
                      onChange={(v) => setAbilityValue(name, v)}
                      disabled={!ready}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </WizardCard>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
