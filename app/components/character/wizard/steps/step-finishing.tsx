import {
  bloodPoolForGeneration,
  defaultHumanityFor,
  defaultWillpowerMaxFor,
} from "~/lib/character-sheet";
import { WizardInfoButton } from "../wizard-info";
import { WizardCard } from "../wizard-primitives";
import { derivedGeneration, type WizardState } from "../wizard-state";

interface StepFinishingProps {
  state: WizardState;
}

const HUMANITY_INFO = `
La **Humanidad** mide cuánto queda en ti del mortal que fuiste. Va de 0 (una
Bestia con forma de hombre) a 10 (un santo). Empiezas con **Conciencia +
Autocontrol** puntos.

- Cada noche, la Humanidad determina cuántas horas puedes resistir al sol
  y qué actos te provocan una **tirada de degeneración**.
- En la creación puedes comprar Humanidad extra por **1 punto gratuito**
  por círculo (independiente de subir las virtudes).
`.trim();

const WILLPOWER_INFO = `
La **Fuerza de Voluntad** es tu capacidad mental para resistir la influencia
sobrenatural, ignorar el frenesí y forzar éxitos automáticos. Empiezas con
una Voluntad permanente igual a tu **Coraje**.

- La Voluntad **actual** baja al gastarla y se recupera con descanso o al
  actuar conforme a tu Naturaleza.
- La Voluntad **permanente** es el techo y sube con experiencia o con
  puntos gratuitos (**1 pto por círculo**).
`.trim();

const BLOOD_POOL_INFO = `
La **Reserva de Sangre** es el depósito de vitae de tu vampiro. La generación
fija su techo:

| Generación | Reserva |
| --- | --- |
| 4.ª | 50 |
| 5.ª | 40 |
| 6.ª | 30 |
| 7.ª | 20 |
| 8.ª | 15 |
| 9.ª | 14 |
| 10.ª | 13 |
| 11.ª | 12 |
| 12.ª | 11 |
| 13.ª y posteriores | 10 |

Empiezas con la reserva al máximo. Gastas vitae para activar disciplinas,
sanar daño y "calentar" el cuerpo cada noche.
`.trim();

export function StepFinishing({ state }: StepFinishingProps) {
  const humanity = defaultHumanityFor(
    state.virtues.conscience,
    state.virtues.selfControl,
  );
  const willpower = defaultWillpowerMaxFor(state.virtues.courage);
  const generation = derivedGeneration(state);
  const bloodPool = bloodPoolForGeneration(generation) ?? 10;

  return (
    <WizardCard
      title="Paso cinco · Toques finales"
      subtitle="Tu vástago empieza a respirar (metafóricamente)."
      description={
        <>
          Estos valores se calculan automáticamente a partir de las virtudes y la generación que elegiste.
          Si en el próximo paso compras más virtud o generación, se actualizarán. Cuando salgas del wizard
          podrás ajustarlos a mano en la hoja.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <DerivedTile
          label="Humanidad"
          value={humanity}
          formula="Conciencia + Autocontrol"
          info={
            <WizardInfoButton
              tooltip="Qué es la Humanidad"
              inline={{
                title: "Humanidad",
                subtitle: "Estado moral",
                body: HUMANITY_INFO,
              }}
              ariaLabel="Información sobre la Humanidad"
              size="md"
            />
          }
        />
        <DerivedTile
          label="Fuerza de Voluntad"
          value={willpower}
          formula="Igual a Coraje"
          info={
            <WizardInfoButton
              tooltip="Qué es la Fuerza de Voluntad"
              inline={{
                title: "Fuerza de Voluntad",
                subtitle: "Recurso mental",
                body: WILLPOWER_INFO,
              }}
              ariaLabel="Información sobre la Fuerza de Voluntad"
              size="md"
            />
          }
        />
        <DerivedTile
          label="Reserva de sangre"
          value={bloodPool}
          formula={`Según generación ${generation}.ª`}
          info={
            <WizardInfoButton
              tooltip="Cómo se calcula la reserva"
              inline={{
                title: "Reserva de sangre",
                subtitle: "Vitae acumulada",
                body: BLOOD_POOL_INFO,
              }}
              ariaLabel="Información sobre la reserva de sangre"
              size="md"
            />
          }
        />
      </div>

      <p className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[0.75rem] text-muted-foreground">
        Avanza al siguiente paso para repartir los <strong>15 puntos gratuitos</strong>.
      </p>
    </WizardCard>
  );
}

function DerivedTile({
  label,
  value,
  formula,
  info,
}: {
  label: string;
  value: number;
  formula: string;
  info?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-blood/30 bg-blood/5 px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-2 font-heading text-xs uppercase tracking-widest text-blood">
        <span>{label}</span>
        {info ?? null}
      </div>
      <div className="font-display text-4xl text-foreground">{value}</div>
      <div className="text-[0.7rem] text-muted-foreground">{formula}</div>
    </div>
  );
}
