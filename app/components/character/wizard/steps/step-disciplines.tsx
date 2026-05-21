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

  function updatePick(disciplineId: string, patch: Partial<WizardDisciplinePick>) {
    onChange(
      state.disciplines.map((d) =>
        d.disciplineId === disciplineId ? { ...d, ...patch } : d,
      ),
    );
  }

  function addDiscipline(disciplineId: string) {
    if (!disciplineId) return;
    if (state.disciplines.some((d) => d.disciplineId === disciplineId)) return;
    if (pool.remaining <= 0) return;
    const def = disciplines.find((x) => x.id === disciplineId);
    if (def?.hasPaths) {
      // Ramificada: sin sendas iniciales; el jugador debe asignar al menos
      // una desde el subpanel. El `level` plano queda en 0 hasta que se
      // marque alguna senda; usamos 1 como placeholder visual mínimo.
      onChange([
        ...state.disciplines,
        { disciplineId, level: 0, paths: [] },
      ]);
    } else {
      onChange([...state.disciplines, { disciplineId, level: 1 }]);
    }
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
            if (def?.hasPaths) {
              return (
                <DisciplineWithPathsRow
                  key={pick.disciplineId}
                  def={def}
                  pick={pick}
                  poolRemaining={pool.remaining}
                  openCatalog={openCatalog}
                  onChange={(next) => updatePick(pick.disciplineId, next)}
                  onRemove={() => remove(pick.disciplineId)}
                />
              );
            }
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

/**
 * Subpanel para una disciplina ramificada (Taumaturgia o Nigromancia).
 * El jugador asigna niveles a cada senda; el `level` general se deriva
 * del máximo de las sendas y la primaria se marca con un radio.
 *
 * Reglas V20 que se respetan:
 *  - Tope 3 por senda en creación (igual que las disciplinas planas).
 *  - Exactamente una senda marcada como primaria.
 *  - Las secundarias no pueden superar a la primaria — el techo dinámico
 *    refleja esto, deshabilitando el botón "+" si fuera a romper la regla.
 *  - Cada nivel de senda cuesta 1 punto del pool global de 3.
 */
function DisciplineWithPathsRow({
  def,
  pick,
  poolRemaining,
  openCatalog,
  onChange,
  onRemove,
}: {
  def: Discipline;
  pick: WizardDisciplinePick;
  poolRemaining: number;
  openCatalog: OpenCatalogInfo;
  onChange: (next: Partial<WizardDisciplinePick>) => void;
  onRemove: () => void;
}) {
  const allPaths = def.paths ?? [];
  const pathPicks = pick.paths ?? [];
  const primaryPick = pathPicks.find((p) => p.isPrimary);
  const primaryLevel = primaryPick?.level ?? 0;

  function setPathLevel(pathId: string, level: number) {
    const existing = pathPicks.find((p) => p.pathId === pathId);
    let nextPaths;
    if (level <= 0) {
      nextPaths = pathPicks.filter((p) => p.pathId !== pathId);
      // Si quitamos la primaria, promovemos la siguiente más alta.
      if (existing?.isPrimary && nextPaths.length > 0) {
        const newPrimaryIdx = nextPaths.reduce(
          (best, p, idx, arr) => (p.level > arr[best].level ? idx : best),
          0,
        );
        nextPaths = nextPaths.map((p, idx) => ({
          ...p,
          isPrimary: idx === newPrimaryIdx,
        }));
      }
    } else if (existing) {
      nextPaths = pathPicks.map((p) =>
        p.pathId === pathId ? { ...p, level: clamp(level, 1, 3) } : p,
      );
    } else {
      // Si no había ninguna primaria aún, esta lo será.
      const anyPrimary = pathPicks.some((p) => p.isPrimary);
      nextPaths = [
        ...pathPicks,
        {
          pathId,
          level: clamp(level, 1, 3),
          isPrimary: !anyPrimary,
        },
      ];
    }
    const maxLevel = nextPaths.length
      ? Math.max(...nextPaths.map((p) => p.level))
      : 0;
    onChange({ paths: nextPaths, level: maxLevel });
  }

  function setPrimary(pathId: string) {
    onChange({
      paths: pathPicks.map((p) => ({
        ...p,
        isPrimary: p.pathId === pathId,
      })),
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-blood/30 bg-blood/5 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm text-foreground">
            {def.name}
          </span>
          <WizardInfoButton
            tooltip={def.tooltip ?? `Detalle de ${def.name}`}
            kind="discipline"
            identifier={def.name}
            fallbackTitle={def.name}
            onOpenCatalog={openCatalog}
            ariaLabel={`Información de la disciplina ${def.name}`}
          />
          <span className="font-heading text-[0.6rem] uppercase tracking-widest text-blood">
            ramifica en sendas
          </span>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
          aria-label="Quitar"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {allPaths.map((p) => {
          const owned = pathPicks.find((x) => x.pathId === p.id);
          const level = owned?.level ?? 0;
          // Techo: en creación tope 3, no superar primaria (si esta senda
          // no es la primaria) y no exceder los puntos del pool global.
          const noPrimaryYet = primaryLevel === 0;
          const ceilByPrimary =
            owned?.isPrimary || noPrimaryYet ? 3 : primaryLevel;
          const dynamicMax = Math.min(
            3,
            ceilByPrimary,
            level + Math.max(0, poolRemaining),
          );
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-md bg-background/50 px-2 py-1"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openCatalog(
                    "discipline-path",
                    `${def.name}|${p.key}`,
                    p.name,
                  );
                }}
                className="flex-1 text-left font-serif text-xs text-foreground underline decoration-dotted decoration-blood/30 underline-offset-2 hover:text-blood"
              >
                {p.name}
              </button>
              {level > 0 ? (
                <label className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
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
              <StepperRow
                label=""
                value={level}
                min={0}
                max={dynamicMax}
                dotsTotal={3}
                onChange={(v) => setPathLevel(p.id, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
