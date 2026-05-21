import { Trash2 } from "lucide-react";
import type { Clan, Discipline } from "~/lib/api/catalog/catalog.types";
import { Button } from "~/components/ui/button";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import type { OpenCatalogInfo } from "../character-wizard";
import { WizardInfoButton } from "../wizard-info";
import {
  DISCIPLINE_POINTS,
  disciplinePoolStatus,
  type WizardDisciplinePick,
  type WizardState,
} from "../wizard-state";
import {
  PointPool,
  StepperRow,
  WizardCard,
} from "../wizard-primitives";

interface StepDisciplinesProps {
  state: WizardState;
  disciplines: Discipline[];
  clans: Clan[];
  onChange: (next: WizardDisciplinePick[]) => void;
  openCatalog: OpenCatalogInfo;
}

const DISCIPLINE_INFO_BODY = `
Las **disciplinas** son los poderes sobrenaturales de tu sangre vampírica.
Cada nivel desbloquea un poder nuevo —cuanto más alto, más espectacular—.

**Reglas de la creación**:

- Tienes **3 puntos** para repartir.
- Cada nivel cuesta 1 punto.
- Ninguna disciplina puede superar **3 puntos** en la creación; los grados 4 y
  5 sólo se compran con puntos gratuitos (7 ptos por círculo).
- Lo habitual es elegir las disciplinas **in-clan** (las que tu sangre
  enseña gratis). Aprender otra cuesta más experiencia luego, así que es
  raro empezar con disciplinas fuera del clan… salvo Caitiff y rebeldes.

Pulsa el botón **i** de cada disciplina para leer su descripción.
`.trim();

export function StepDisciplines({
  state,
  disciplines,
  clans,
  onChange,
  openCatalog,
}: StepDisciplinesProps) {
  const clan = clans.find((c) => c.id === state.concept.clanId);
  const clanDisciplineHint = clan?.disciplines ?? null;
  const pool = disciplinePoolStatus(state);

  const usedIds = new Set(state.disciplines.map((d) => d.disciplineId));
  const remainingDisciplines = disciplines.filter((d) => !usedIds.has(d.id));

  function setLevel(disciplineId: string, level: number) {
    const next = state.disciplines
      .map((d) =>
        d.disciplineId === disciplineId
          ? { ...d, level: clamp(level, 0, 3) }
          : d,
      )
      .filter((d) => d.level > 0);
    onChange(next);
  }

  function addDiscipline(disciplineId: string) {
    if (!disciplineId) return;
    if (state.disciplines.some((d) => d.disciplineId === disciplineId)) return;
    if (pool.remaining <= 0) return;
    onChange([...state.disciplines, { disciplineId, level: 1 }]);
  }

  function remove(disciplineId: string) {
    onChange(state.disciplines.filter((d) => d.disciplineId !== disciplineId));
  }

  return (
    <WizardCard
      title="Paso 4a · Disciplinas"
      subtitle={`Reparte ${DISCIPLINE_POINTS} puntos en las disciplinas de tu clan.`}
      description={
        <span className="inline-flex items-center gap-2">
          <span>
            Cualquier nivel comprado aquí no puede superar <strong>3</strong> en la creación.
            {clanDisciplineHint ? (
              <>
                {" "}
                Las disciplinas in-clan de tu sangre son <strong>{clanDisciplineHint}</strong>.
              </>
            ) : null}{" "}
            Los Caitiff y rebeldes pueden elegir cualquier disciplina del catálogo.
          </span>
          <WizardInfoButton
            tooltip="Cómo funcionan las disciplinas"
            inline={{
              title: "Disciplinas (V20)",
              subtitle: "Paso 4a · Ventajas",
              body: DISCIPLINE_INFO_BODY,
            }}
            ariaLabel="Información sobre las disciplinas"
          />
        </span>
      }
      aside={<PointPool label="Disciplinas" {...pool} />}
    >
      <div className="space-y-2">
        {state.disciplines.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 bg-background/40 px-3 py-4 text-center text-xs text-muted-foreground">
            Añade una disciplina para empezar.
          </p>
        ) : (
          state.disciplines.map((pick) => {
            const def = disciplines.find((d) => d.id === pick.disciplineId);
            // Techo dinámico: tope de 3 en creación (V20), nunca por encima
            // de los puntos que quedan en el pool compartido (3 ptos para
            // repartir entre disciplinas).
            const dynamicMax = Math.min(
              3,
              pick.level + Math.max(0, pool.remaining),
            );
            return (
              <div key={pick.disciplineId} className="flex items-center gap-2">
                <StepperRow
                  label={def?.name ?? "Disciplina"}
                  hint={def?.tooltip ?? null}
                  info={
                    def ? (
                      <WizardInfoButton
                        tooltip={def.tooltip ?? `Detalle de ${def.name}`}
                        kind="discipline"
                        identifier={def.name}
                        fallbackTitle={def.name}
                        onOpenCatalog={openCatalog}
                        ariaLabel={`Información de la disciplina ${def.name}`}
                      />
                    ) : null
                  }
                  value={pick.level}
                  min={1}
                  max={dynamicMax}
                  dotsTotal={3}
                  onChange={(v) => setLevel(pick.disciplineId, v)}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => remove(pick.disciplineId)}
                  aria-label="Quitar"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          className={SELECT_DARK_CLASS}
          value=""
          onChange={(e) => addDiscipline(e.target.value)}
          disabled={pool.remaining <= 0 || remainingDisciplines.length === 0}
        >
          <option value="" disabled>
            Añadir disciplina…
          </option>
          {remainingDisciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </WizardCard>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
