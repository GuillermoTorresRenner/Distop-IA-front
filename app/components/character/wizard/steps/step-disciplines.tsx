import { Trash2 } from "lucide-react";
import type { Clan, Discipline } from "~/lib/api/catalog/catalog.types";
import { Button } from "~/components/ui/button";
import { SELECT_DARK_CLASS } from "~/lib/select-styles";
import { cn } from "~/lib/utils";
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
    const def = disciplines.find((x) => x.id === disciplineId);
    if (def?.hasPaths) {
      // Ramificada (Taumaturgia, Nigromancia): el manual V20 dice que
      // al aprender la disciplina el personaje recibe automáticamente
      // **un círculo en su senda primaria**. Para Nigromancia, esa
      // primaria es siempre la Senda del Sepulcro (regla canon).
      // Para Taumaturgia el jugador puede elegir cualquier senda como
      // primaria — por defecto sembramos la primera del catálogo (suele
      // ser la Senda de la Sangre, primaria habitual de los Tremere).
      //
      // El nivel inicial de la primaria es 1 y NO consume puntos del
      // pool (es el "regalo" canon V20). Solo cuando el jugador suba
      // la primaria por encima de 1, ese exceso paga puntos.
      const sepulcroPath = (def.paths ?? []).find(
        (p) => p.key === "senda_sepulcro",
      );
      const primaryPath =
        sepulcroPath ?? def.paths?.[0] ?? null;
      if (!primaryPath) {
        // No hay catálogo de sendas todavía — sin primaria, sin pick.
        onChange([
          ...state.disciplines,
          { disciplineId, level: 0, paths: [] },
        ]);
        return;
      }
      onChange([
        ...state.disciplines,
        {
          disciplineId,
          level: 1,
          paths: [{ pathId: primaryPath.id, level: 1, isPrimary: true }],
        },
      ]);
      return;
    }
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
 *
 * Reglas V20 aplicadas (canon):
 *
 * **Comunes a las dos**:
 *  - Tope 3 por senda en creación.
 *  - Exactamente una senda marcada como primaria.
 *  - La primaria arranca con **1 círculo gratis** (regalo al aprender la
 *    Disciplina); por eso al añadir la disciplina ya viene una senda
 *    inicial con nivel 1 sin haber descontado pool.
 *  - Las secundarias deben quedar **al menos un círculo por debajo** de
 *    la primaria. El techo dinámico = `primaria - 1`.
 *  - Para poder añadir una segunda senda, la primaria debe estar al
 *    menos a **nivel 3** (regla de Nigromancia, aplicada también a
 *    Taumaturgia como sano spacing por encontrarse fuera del manual).
 *  - La tercera senda exige primaria a 5 — imposible en creación, así
 *    que el wizard solo permite **máximo 2 sendas** en disciplinas
 *    ramificadas.
 *
 * **Específica de Nigromancia**:
 *  - La senda primaria es siempre la **Senda del Sepulcro**. El radio
 *    "Primaria" queda bloqueado en ella y no se puede cambiar.
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
  // Nigromancia identifica su senda primaria por la key "senda_sepulcro";
  // si está presente, la primaria queda forzada a ella y el radio de
  // "Primaria" se bloquea.
  const sepulcroPath = allPaths.find((p) => p.key === "senda_sepulcro");
  const isNigromancia = !!sepulcroPath;
  const canAddSecondary = primaryLevel >= 3;
  const ownedCount = pathPicks.length;

  function setPathLevel(pathId: string, level: number) {
    const existing = pathPicks.find((p) => p.pathId === pathId);
    let nextPaths: typeof pathPicks;
    if (level <= 0) {
      // Si la senda eliminada es la primaria forzada (Sepulcro en
      // Nigromancia) la dejamos en nivel 1 — no se puede bajar de ahí
      // sin romper el regalo canon.
      if (existing?.isPrimary && isNigromancia) {
        nextPaths = pathPicks.map((p) =>
          p.pathId === pathId ? { ...p, level: 1 } : p,
        );
      } else {
        nextPaths = pathPicks.filter((p) => p.pathId !== pathId);
        // Si quitamos la primaria (Taumaturgia), promovemos la más alta
        // que quede; si no queda ninguna, sin primaria.
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
      }
    } else if (existing) {
      nextPaths = pathPicks.map((p) =>
        p.pathId === pathId ? { ...p, level: clamp(level, 1, 3) } : p,
      );
    } else {
      // Añadir una senda nueva: solo si hay primaria ≥ 3 (regla canon).
      if (!canAddSecondary) return;
      // Máximo 2 sendas en creación (3ª requiere primaria=5).
      if (pathPicks.length >= 2) return;
      // La nueva senda nunca puede ser primaria — la primaria ya está
      // asignada y el manual exige que la primaria sea estrictamente
      // mayor que las secundarias.
      nextPaths = [
        ...pathPicks,
        {
          pathId,
          level: clamp(level, 1, primaryLevel - 1),
          isPrimary: false,
        },
      ];
    }
    const maxLevel = nextPaths.length
      ? Math.max(...nextPaths.map((p) => p.level))
      : 0;
    onChange({ paths: nextPaths, level: maxLevel });
  }

  function setPrimary(pathId: string) {
    // En Nigromancia la primaria es Sepulcro y no se puede cambiar.
    if (isNigromancia) return;
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
            {isNigromancia
              ? "Sepulcro primaria · 1ª gratis"
              : "ramifica en sendas · primaria 1ª gratis"}
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
      {ownedCount < 2 && !canAddSecondary ? (
        <p className="rounded-md border border-blood/30 bg-blood/10 px-2 py-1 text-[0.7rem] text-blood/80">
          Sube la senda primaria a <strong>nivel 3</strong> para poder añadir
          una segunda senda.
        </p>
      ) : null}
      {ownedCount >= 2 ? (
        <p className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-[0.7rem] text-muted-foreground">
          Máximo 2 sendas en creación. La tercera senda requeriría dominar la
          primaria a 5.
        </p>
      ) : null}
      <div className="space-y-1.5">
        {allPaths.map((p) => {
          const owned = pathPicks.find((x) => x.pathId === p.id);
          const level = owned?.level ?? 0;
          // Techo dinámico:
          //  - Primaria: máx 3 (creación), restringida solo por el pool.
          //  - Secundaria: máx primaryLevel - 1 (las secundarias siempre
          //    quedan al menos un círculo por debajo).
          //  - Para una senda aún no añadida: solo se puede añadir si la
          //    primaria está a ≥3 y aún no hay 2 sendas (regla canon).
          const isOwnedPrimary = !!owned?.isPrimary;
          let ceiling: number;
          if (isOwnedPrimary) {
            ceiling = 3;
          } else if (owned) {
            ceiling = Math.max(1, primaryLevel - 1);
          } else {
            // No añadida aún.
            ceiling = canAddSecondary && ownedCount < 2 ? primaryLevel - 1 : 0;
          }
          const dynamicMax = Math.min(
            3,
            ceiling,
            level + Math.max(0, poolRemaining),
          );
          // El stepper de una senda no añadida pero no permitida queda
          // con max=0 (deshabilitado). Estado visual: gris.
          const disabledHint =
            !owned && (ownedCount >= 2 || !canAddSecondary);
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-md bg-background/50 px-2 py-1",
                disabledHint && "opacity-60",
              )}
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
                {isOwnedPrimary ? (
                  <span className="ml-2 font-heading text-[0.55rem] uppercase tracking-widest text-blood">
                    Primaria
                  </span>
                ) : null}
              </button>
              {level > 0 && !isNigromancia ? (
                <label className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                  <input
                    type="radio"
                    name={`primary-${pick.disciplineId}`}
                    checked={isOwnedPrimary}
                    onChange={() => setPrimary(p.id)}
                    className="accent-blood"
                  />
                  <span className="uppercase tracking-widest">Primaria</span>
                </label>
              ) : null}
              <StepperRow
                label=""
                value={level}
                min={isOwnedPrimary ? 1 : 0}
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
