import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type {
  Clan,
  Discipline,
  DisciplinePower,
} from "~/lib/api/catalog/catalog.types";
import { DotRating } from "~/components/character/dot-rating";
import { Tooltip } from "~/components/common/tooltip";
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
  DotRatingRow,
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
      // Ramificada (Taumaturgia, Nigromancia): se siembra la senda
      // primaria a nivel 1 (consume 1 punto del pool, no es gratis).
      // En Nigromancia la primaria es siempre la Senda del Sepulcro;
      // en Taumaturgia se elige por defecto la primera del catálogo
      // (Senda de la Sangre suele ser la primaria habitual). El
      // jugador puede cambiar la primaria en Taumaturgia si quiere.
      const sepulcroPath = (def.paths ?? []).find(
        (p) => p.key === "senda_sepulcro",
      );
      const primaryPath = sepulcroPath ?? def.paths?.[0] ?? null;
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
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
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
    >
      {/* Contador del pool encima de la lista para liberar el ancho
          completo del card (consistente con los pasos de Atributos y
          Habilidades). */}
      <PointPool label="Disciplinas" {...pool} />

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
            // Lista de poderes desbloqueados en disciplina monolítica.
            const monoUnlocked = (def?.powers ?? [])
              .filter((pw) => pw.level <= pick.level)
              .sort((a, b) => a.level - b.level);
            return (
              <div
                key={pick.disciplineId}
                className="space-y-1 rounded-md border border-border/40 bg-background/30 px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <DotRatingRow
                      label={def?.name ?? "Disciplina"}
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
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => remove(pick.disciplineId)}
                    aria-label="Quitar"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {monoUnlocked.length > 0 ? (
                  <ul className="space-y-0.5 pl-2">
                    {monoUnlocked.map((pw) => (
                      <li
                        key={pw.id}
                        className="font-serif text-[0.7rem] text-foreground/80"
                      >
                        <Tooltip
                          title={`Nivel ${pw.level} — ${pw.name}`}
                          content={powerTooltipContent(pw)}
                          side="top"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              if (def) {
                                openCatalog(
                                  "discipline-power",
                                  `${def.name}|${pw.level}`,
                                  pw.name,
                                );
                              }
                            }}
                            className="underline decoration-dotted decoration-blood/30 underline-offset-2 hover:text-blood"
                          >
                            <span className="font-semibold text-blood">
                              ·{pw.level}·
                            </span>{" "}
                            {pw.name}
                          </button>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
 * Construye el contenido marginal del Tooltip que aparece al pasar el
 * ratón por encima del nombre de un poder de senda o monolítico. Muestra:
 *   - El tooltip corto del catálogo (resumen mecánico).
 *   - Una línea con los chips mecánicos (coste, atributo + habilidad,
 *     dificultad) si están definidos.
 *
 * Es deliberadamente más corto que el modal: la idea es leer rápido sin
 * abrir el InfoModal.
 */
function powerTooltipContent(power: DisciplinePower): ReactNode {
  const cost = power.bloodCost ?? 0;
  const chips: string[] = [];
  chips.push(cost === 0 ? "Sin coste" : `${cost} sangre`);
  if (power.rollAttribute || power.rollAbility) {
    const parts = [power.rollAttribute, power.rollAbility].filter(Boolean);
    chips.push(parts.join(" + "));
  }
  if (typeof power.rollDifficulty === "number") {
    chips.push(`Dif. ${power.rollDifficulty}`);
  }
  const short = power.tooltip ?? power.summary ?? null;
  return (
    <span className="block space-y-1">
      {short ? (
        <span className="block text-[11px] text-foreground/90">{short}</span>
      ) : null}
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        {chips.join(" · ")}
      </span>
    </span>
  );
}

/**
 * Subpanel para una disciplina ramificada (Taumaturgia o Nigromancia).
 *
 * Reglas V20 aplicadas (canon):
 *
 * **Comunes a las dos**:
 *  - Tope 3 por senda en creación.
 *  - Exactamente una senda marcada como primaria.
 *  - Al añadir la disciplina al pick se siembra la senda primaria a
 *    nivel 1 — eso **consume 1 punto del pool** de disciplinas (cada
 *    punto asignado a la disciplina sube un círculo de la primaria).
 *  - Las secundarias deben quedar **al menos un círculo por debajo** de
 *    la primaria. El techo dinámico = `primaria - 1`.
 *  - Para poder añadir una segunda senda, la primaria debe estar al
 *    menos a **nivel 3**.
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              ? "Sepulcro primaria"
              : "ramifica en sendas"}
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
          const disabledHint =
            !owned && (ownedCount >= 2 || !canAddSecondary);
          // Lista de poderes desbloqueados hasta el nivel actual.
          const unlockedPowers = (p.powers ?? [])
            .filter((pw) => pw.level <= level)
            .sort((a, b) => a.level - b.level);
          return (
            <div
              key={p.id}
              className={cn(
                "space-y-1 rounded-md bg-background/50 px-2 py-1.5",
                disabledHint && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
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
                  className="min-w-0 flex-1 text-left font-serif text-xs text-foreground underline decoration-dotted decoration-blood/30 underline-offset-2 hover:text-blood"
                >
                  {p.name}
                  {isOwnedPrimary ? (
                    <span className="ml-2 font-heading text-[0.55rem] uppercase tracking-widest text-blood">
                      Primaria
                    </span>
                  ) : null}
                </button>
                {level > 0 && !isNigromancia ? (
                  <label className="flex shrink-0 items-center gap-1 text-[0.6rem] text-muted-foreground">
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
                <div className="shrink-0">
                  <DotRating
                    value={level}
                    min={isOwnedPrimary ? 1 : 0}
                    max={dynamicMax}
                    slots={3}
                    onChange={(v) => setPathLevel(p.id, v)}
                    ariaLabel={p.name}
                    size="sm"
                  />
                </div>
              </div>
              {unlockedPowers.length > 0 ? (
                <ul className="space-y-0.5 pl-2">
                  {unlockedPowers.map((pw) => (
                    <li
                      key={pw.id}
                      className="font-serif text-[0.7rem] text-foreground/80"
                    >
                      <Tooltip
                        title={`${p.name} · Nivel ${pw.level} — ${pw.name}`}
                        content={powerTooltipContent(pw)}
                        side="top"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openCatalog(
                              "discipline-power",
                              `${def.name}|${p.key}|${pw.level}`,
                              pw.name,
                            );
                          }}
                          className="underline decoration-dotted decoration-blood/30 underline-offset-2 hover:text-blood"
                        >
                          <span className="font-semibold text-blood">
                            ·{pw.level}·
                          </span>{" "}
                          {pw.name}
                        </button>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
