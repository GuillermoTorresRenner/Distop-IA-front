import type { Virtue } from "~/lib/api/catalog/catalog.types";
import { WizardInfoButton } from "../wizard-info";
import {
  DotRatingRow,
  PointPool,
  WizardCard,
} from "../wizard-primitives";
import {
  VIRTUE_BASE,
  VIRTUE_MAX,
  VIRTUE_POINTS,
  virtuePoolStatus,
  type WizardState,
  type WizardVirtues,
} from "../wizard-state";

interface StepVirtuesProps {
  state: WizardState;
  onChange: (next: WizardVirtues) => void;
  virtuesInfo: Virtue[];
}

const VIRTUE_INFO_BODY = `
Las **virtudes** son los tres pilares morales de tu vástago. Cada una arranca
con un círculo gratuito (1/1/1) y tienes **7 puntos** extra para repartir
encima, hasta un máximo de 5 por virtud.

**Por qué importan**:

- **Conciencia** + **Autocontrol** se suman y se convierten en tu
  **Humanidad** inicial. La Humanidad determina cuán cerca estás de la
  Bestia.
- **Coraje** se convierte en tu **Fuerza de Voluntad** permanente.

En la práctica, tienes que decidir qué tipo de vampiro será al despertar:
uno con remordimiento (alta Conciencia/Autocontrol) o uno empujado por el
miedo y la audacia (alto Coraje).

Cada virtud cuesta **2 puntos gratuitos** por círculo si necesitas más.
`.trim();

const VIRTUE_KEY_MAP: Record<keyof WizardVirtues, string> = {
  conscience: "conscience",
  selfControl: "self-control",
  courage: "courage",
};

const VIRTUE_DESCRIPTIONS: Record<keyof WizardVirtues, string> = {
  conscience: "Brújula moral. Junto con Autocontrol, determina tu Humanidad de partida.",
  selfControl: "Capacidad para refrenar la Bestia. Junto con Conciencia, determina tu Humanidad.",
  courage: "Voluntad de enfrentarse al miedo. Determina tu Fuerza de Voluntad de partida.",
};

const VIRTUE_LABELS: Record<keyof WizardVirtues, string> = {
  conscience: "Conciencia",
  selfControl: "Autocontrol",
  courage: "Coraje",
};

export function StepVirtues({
  state,
  onChange,
  virtuesInfo,
}: StepVirtuesProps) {
  const pool = virtuePoolStatus(state);

  function lookupVirtue(key: keyof WizardVirtues): Virtue | null {
    const mapped = VIRTUE_KEY_MAP[key];
    return (
      virtuesInfo.find((v) => v.key === mapped || v.key === key) ?? null
    );
  }

  function setVirtue(key: keyof WizardVirtues, value: number) {
    onChange({
      ...state.virtues,
      [key]: clamp(value, VIRTUE_BASE, VIRTUE_MAX),
    });
  }

  return (
    <WizardCard
      title="Paso 4c · Virtudes"
      subtitle={`Reparte ${VIRTUE_POINTS} puntos extra sobre el círculo gratuito de cada virtud.`}
      description={
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            Las virtudes definen quién serás antes del próximo despertar. <strong>Conciencia</strong> y{" "}
            <strong>Autocontrol</strong> sumadas se convierten en tu <em>Humanidad</em>; el <strong>Coraje</strong>{" "}
            se convierte en tu <em>Fuerza de Voluntad</em> permanente.
          </span>
          <WizardInfoButton
            tooltip="Cómo funcionan las virtudes"
            inline={{
              title: "Virtudes (V20)",
              subtitle: "Paso 4c · Ventajas",
              body: VIRTUE_INFO_BODY,
            }}
            ariaLabel="Información sobre las virtudes"
          />
        </span>
      }
      aside={
        <div className="space-y-2">
          <PointPool label="Virtudes" {...pool} />
          <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[0.7rem] text-muted-foreground">
            <div className="flex justify-between">
              <span>Humanidad prevista</span>
              <span className="font-display text-foreground">
                {state.virtues.conscience + state.virtues.selfControl}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Voluntad permanente</span>
              <span className="font-display text-foreground">{state.virtues.courage}</span>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-1.5">
        {(Object.keys(VIRTUE_LABELS) as (keyof WizardVirtues)[]).map((key) => {
          const v = lookupVirtue(key);
          const value = state.virtues[key];
          // Techo dinámico: nunca supera VIRTUE_MAX (5) ni permite gastar más
          // puntos de los que quedan en el pool compartido (7 ptos para
          // repartir entre las tres virtudes).
          const dynamicMax = Math.min(
            VIRTUE_MAX,
            value + Math.max(0, pool.remaining),
          );
          return (
            <DotRatingRow
              key={key}
              label={VIRTUE_LABELS[key]}
              info={
                <WizardInfoButton
                  tooltip={v?.tooltip ?? `Detalle de ${VIRTUE_LABELS[key]}`}
                  inline={{
                    title: v?.name ?? VIRTUE_LABELS[key],
                    subtitle: "Virtud",
                    body: v?.description ?? VIRTUE_DESCRIPTIONS[key],
                  }}
                  ariaLabel={`Información de ${VIRTUE_LABELS[key]}`}
                />
              }
              value={value}
              min={VIRTUE_BASE}
              max={dynamicMax}
              dotsTotal={VIRTUE_MAX}
              onChange={(v) => setVirtue(key, v)}
            />
          );
        })}
      </div>
    </WizardCard>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
