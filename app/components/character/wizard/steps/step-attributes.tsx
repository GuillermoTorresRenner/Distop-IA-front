import type { AttributeInfo } from "~/lib/api/catalog/catalog.types";
import {
  ATTRIBUTES,
  type AttributeDef,
} from "~/lib/character-sheet";
import type { OpenCatalogInfo } from "../character-wizard";
import { WizardInfoButton } from "../wizard-info";
import {
  PointPool,
  PriorityPicker,
  StepperRow,
  WizardCard,
} from "../wizard-primitives";
import {
  ATTRIBUTE_KEYS_BY_CATEGORY,
  ATTRIBUTE_POOL_BY_PRIORITY,
  attributeCategoryPool,
  type AttributeCategory,
  type AttributeKey,
  type AttributePriority,
  type WizardAttributes,
  type WizardState,
} from "../wizard-state";

interface StepAttributesProps {
  state: WizardState;
  onChange: (next: WizardAttributes) => void;
  attributesInfo: AttributeInfo[];
  openCatalog: OpenCatalogInfo;
}

const PRIORITY_INFO_BODY = `
En V20 los atributos se reparten por **categorías**, no individualmente:

- La **categoría primaria** recibe **7** puntos extra para repartir entre sus
  tres rasgos.
- La **secundaria** recibe **5**.
- La **terciaria** recibe **3**.

Cada atributo ya tiene un círculo gratuito de partida (el "automático" del
manual). Estos números se suman encima.

Las categorías son: **Físicos** (Fuerza, Destreza, Resistencia), **Sociales**
(Carisma, Manipulación, Apariencia) y **Mentales** (Percepción, Inteligencia,
Astucia). Ningún atributo puede superar 5 puntos al crearlo; lo que sobre lo
podrás comprar con los puntos gratuitos del paso 6 (a razón de 5 ptos por
círculo).
`.trim();

const CATEGORY_LABELS: Record<AttributeCategory, string> = {
  physical: "Físicos",
  social: "Sociales",
  mental: "Mentales",
};

const CATEGORY_DESCRIPTIONS: Record<AttributeCategory, string> = {
  physical: "Cuerpo, golpes y resistencia.",
  social: "Trato, presencia y manipulación.",
  mental: "Percepción, intelecto e instinto.",
};

export function StepAttributes({
  state,
  onChange,
  attributesInfo,
  openCatalog,
}: StepAttributesProps) {
  const { attributes } = state;

  function setPriority(cat: AttributeCategory, prio: AttributePriority) {
    // Si otra categoría ya tiene esa prioridad, las intercambiamos para
    // garantizar que las tres prioridades sigan asignadas exactamente una vez.
    const next: WizardAttributes = {
      ...attributes,
      priority: { ...attributes.priority },
    };
    const otherCat = (Object.keys(next.priority) as AttributeCategory[]).find(
      (k) => k !== cat && next.priority[k] === prio,
    );
    const previous = next.priority[cat];
    next.priority[cat] = prio;
    if (otherCat) next.priority[otherCat] = previous;
    // Si al reasignar prioridades algún pool se queda con valores por debajo
    // de 1, no hay nada que ajustar (todos arrancan en 1). En cambio, si el
    // pool se reduce y deja al jugador con sobrecargo, lo dejamos visible en
    // el indicador (no recortamos puntos automáticamente — el jugador decide
    // qué bajar).
    onChange(next);
  }

  function setAttributeValue(key: AttributeKey, value: number) {
    const next: WizardAttributes = {
      ...attributes,
      values: { ...attributes.values, [key]: clamp(value, 1, 5) },
    };
    onChange(next);
  }

  return (
    <WizardCard
      title="Paso dos · Atributos"
      subtitle="Ordena 7 / 5 / 3 entre Físicos, Sociales y Mentales."
      description={
        <span className="inline-flex items-center gap-2">
          <span>
            Cada atributo arranca con un círculo gratuito. Reparte la categoría primaria con <strong>7</strong> puntos
            extra, la secundaria con <strong>5</strong> y la terciaria con <strong>3</strong>. Si quieres ir más allá
            de ese reparto, te quedan los <em>puntos gratuitos</em> del paso final.
          </span>
          <WizardInfoButton
            tooltip="Cómo funciona el reparto 7/5/3"
            inline={{
              title: "Reparto de atributos (V20)",
              subtitle: "Paso 2 del manual",
              body: PRIORITY_INFO_BODY,
            }}
            ariaLabel="Información del reparto 7/5/3"
          />
        </span>
      }
      aside={
        <div className="space-y-2">
          {(Object.keys(CATEGORY_LABELS) as AttributeCategory[]).map((cat) => (
            <PointPool
              key={cat}
              label={CATEGORY_LABELS[cat]}
              {...attributeCategoryPool(state, cat)}
            />
          ))}
        </div>
      }
    >
      <PriorityPicker<AttributeCategory>
        categories={(Object.keys(CATEGORY_LABELS) as AttributeCategory[]).map(
          (k) => ({
            key: k,
            label: CATEGORY_LABELS[k],
            description: CATEGORY_DESCRIPTIONS[k],
          }),
        )}
        value={attributes.priority}
        pools={ATTRIBUTE_POOL_BY_PRIORITY}
        onChange={setPriority}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(CATEGORY_LABELS) as AttributeCategory[]).map((cat) => {
          const pool = attributeCategoryPool(state, cat);
          const ready = !!attributes.priority[cat];
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
                {ATTRIBUTE_KEYS_BY_CATEGORY[cat].map((key) => {
                  const label = labelFor(key);
                  const info = attributesInfo.find(
                    (a) => a.key === key || a.name === label,
                  );
                  const value = attributes.values[key];
                  // Limita el techo dinámico de cada atributo al pool disponible:
                  // así no se pueden marcar puntos negativos (gastar más de lo asignado
                  // por prioridad). Tope absoluto de 5 según el V20.
                  const dynamicMax = Math.min(5, value + Math.max(0, pool.remaining));
                  return (
                    <StepperRow
                      key={key}
                      label={label}
                      info={
                        <WizardInfoButton
                          tooltip={info?.tooltip ?? `Detalle de ${label}`}
                          kind="attribute"
                          identifier={info?.key ?? key}
                          fallbackTitle={label}
                          onOpenCatalog={openCatalog}
                          ariaLabel={`Información del atributo ${label}`}
                        />
                      }
                      value={value}
                      min={1}
                      max={dynamicMax}
                      dotsTotal={5}
                      onChange={(v) => setAttributeValue(key, v)}
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

function labelFor(key: AttributeKey): string {
  const def = (ATTRIBUTES as AttributeDef[]).find((a) => a.key === key);
  return def?.label ?? key;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
