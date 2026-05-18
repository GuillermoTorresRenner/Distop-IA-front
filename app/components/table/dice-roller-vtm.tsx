import {
  ChevronDown,
  ChevronUp,
  Dices,
  EyeOff,
  HeartCrack,
  RotateCcw,
  Star,
  Swords,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { RollInitiativeInput, RollVtmInput } from "~/lib/socket/types";

export interface RollerPrefill {
  pool?: number;
  label?: string;
  characterId?: string;
  /**
   * Penalizador por heridas del personaje seleccionado (negativo o 0).
   * Lo emite la hoja de personaje. Se usa para mostrar el desglose en el
   * preview y para enviárselo al back, que lo persiste con la tirada.
   */
  woundPenalty?: number;
  /**
   * Voluntad actual del personaje. Si no hay personaje asociado, queda 0
   * y los usos de voluntad se deshabilitan.
   */
  willpowerAvailable?: number;
  /**
   * Nivel de la habilidad declarada al hacer click-to-roll (1..5).
   * La especialidad solo se puede activar si este valor es >= 4.
   * 0 / undefined ⇒ tirada sin habilidad (especialidad bloqueada).
   */
  skillRating?: number;
  /**
   * Atributo Destreza del personaje seleccionado. Necesario para mostrar
   * el desglose del botón de iniciativa (1d10 + Destreza + Astucia).
   */
  dexterity?: number;
  /** Atributo Astucia del personaje seleccionado. */
  wits?: number;
  /**
   * Texto (markdown) de la especialidad declarada en la habilidad
   * seleccionada. Se envía al back cuando el roller marca specialty=true,
   * para guardarlo con la tirada como snapshot histórico.
   */
  specialtyText?: string;
  /**
   * Origen de la tirada. Hoy "DISCIPLINE" cuando el prefill vino de activar
   * un poder; null/undefined para click-to-roll de atributo+habilidad.
   */
  sourceKind?: string;
  /** Etiqueta legible del origen (ej. "Dominación"). */
  sourceName?: string;
  /** Incrementa cuando cambia para forzar re-set del form aunque pool sea igual */
  signature?: number;
}

interface DiceRollerVtMProps {
  canTryPrivate: boolean;
  prefill?: RollerPrefill;
  onRoll: (
    input: RollVtmInput
  ) => Promise<{ ok: boolean; error?: string; id?: string }>;
  /**
   * Tira iniciativa V20 para el personaje del prefill: 1d10 + Destreza +
   * Astucia. El back agrega o actualiza al personaje en el tracker de
   * turnos con el total como iniciativa.
   */
  onRollInitiative?: (
    input: RollInitiativeInput
  ) => Promise<{ ok: boolean; error?: string; id?: string }>;
}

const MIN_SKILL_FOR_SPECIALTY = 4;

/**
 * Roller VtM V20 (variante de la mesa):
 *   - pool d10s vs dificultad. 10 = 1 éxito ordinario (NO dobla).
 *   - Especialidad (solo si habilidad>=4): cada 10 detona un dado extra que
 *     se relanza. 10 encadena; 1 resta éxitos; resto se evalúa contra la dif.
 *   - 1 = -1 éxito en el pool inicial.
 *   - Botch: 0 o menos éxitos netos pre-WP y al menos un 1 del pool inicial.
 *   - Voluntad — tres usos, 1 punto cada uno (combinables):
 *     · éxito automático no removible por 1s.
 *     · anular el penalizador por heridas en esta tirada.
 *     · relanzar todos los dados que no fueron éxito (una vez).
 */
export function DiceRollerVtM({
  canTryPrivate,
  prefill,
  onRoll,
  onRollInitiative,
}: DiceRollerVtMProps) {
  const [pool, setPool] = useState(5);
  const [difficulty, setDifficulty] = useState(6);
  const [specialty, setSpecialty] = useState(false);
  // `source` se hidrata al recibir un prefill con origen (ej. activar una
  // disciplina) y se limpia al tirar para que tiradas manuales subsiguientes
  // no queden etiquetadas. Live independiente del prefill por si la signature
  // no cambia (el padre no siempre toca sourceKind/Name).
  const [source, setSource] = useState<{
    sourceKind?: string;
    sourceName?: string;
  } | null>(null);
  const [wpSuccess, setWpSuccess] = useState(false);
  const [wpWound, setWpWound] = useState(false);
  const [wpReroll, setWpReroll] = useState(false);
  const [label, setLabel] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [wpPanelOpen, setWpPanelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Modificador circunstancial para la tirada de iniciativa (positivo o
   * negativo). No persiste entre tiradas: se resetea al cambiar de personaje
   * y tras tirar para evitar arrastrar modificadores accidentales.
   */
  const [initiativeModifier, setInitiativeModifier] = useState(0);
  /**
   * El panel de iniciativa arranca colapsado para no robar foco al roller
   * V20. Se abre con el botón "Iniciativa" y se vuelve a cerrar tras tirar.
   */
  const [initiativeOpen, setInitiativeOpen] = useState(false);

  const skillRating = prefill?.skillRating ?? 0;
  const specialtyAllowed = skillRating >= MIN_SKILL_FOR_SPECIALTY;

  // Aplica prefill cuando cambia su signature (click-to-roll en la hoja).
  useEffect(() => {
    if (!prefill) return;
    if (typeof prefill.pool === "number") setPool(prefill.pool);
    if (typeof prefill.label === "string") setLabel(prefill.label);
    // Reset de los toggles de voluntad y especialidad cuando viene una
    // selección nueva para no arrastrar gastos del último click.
    setWpSuccess(false);
    setWpWound(false);
    setWpReroll(false);
    setSpecialty(false);
    setWpPanelOpen(false);
    // Si el prefill trae origen (disciplina, etc.), lo retenemos para la
    // próxima tirada. Si viene sin origen, limpiamos: una nueva selección
    // manual de atributo/habilidad no debe heredar la etiqueta anterior.
    if (prefill.sourceKind) {
      setSource({
        sourceKind: prefill.sourceKind,
        sourceName: prefill.sourceName,
      });
    } else {
      setSource(null);
    }
  }, [prefill?.signature]);

  // Si la habilidad seleccionada cae por debajo del umbral, apagamos la
  // especialidad (defensivo: el botón está bloqueado, pero por si acaso).
  useEffect(() => {
    if (!specialtyAllowed && specialty) setSpecialty(false);
  }, [specialtyAllowed, specialty]);

  // Resetea el modificador de iniciativa al cambiar de personaje: no tiene
  // sentido arrastrarlo entre PJs ni mantenerlo después de tirar. También
  // cerramos el panel para que el siguiente PJ arranque con la UI limpia.
  useEffect(() => {
    setInitiativeModifier(0);
    setInitiativeOpen(false);
  }, [prefill?.characterId]);

  const rawPenalty = Math.min(0, prefill?.woundPenalty ?? 0);
  const effectivePenalty = wpWound ? 0 : rawPenalty;
  const previewPool = Math.max(1, pool + effectivePenalty);

  const wpBudget = prefill?.willpowerAvailable ?? 0;
  const hasCharacter = prefill?.characterId !== undefined;
  const wpToSpend =
    (wpSuccess ? 1 : 0) + (wpWound ? 1 : 0) + (wpReroll ? 1 : 0);

  /// Activa un toggle de voluntad solo si la combinación final no excede el saldo.
  function toggleWp(kind: "success" | "wound" | "reroll") {
    const desired = {
      success: kind === "success" ? !wpSuccess : wpSuccess,
      wound: kind === "wound" ? !wpWound : wpWound,
      reroll: kind === "reroll" ? !wpReroll : wpReroll,
    };
    const desiredCost =
      (desired.success ? 1 : 0) +
      (desired.wound ? 1 : 0) +
      (desired.reroll ? 1 : 0);
    if (desiredCost > wpBudget) return;
    setWpSuccess(desired.success);
    setWpWound(desired.wound);
    setWpReroll(desired.reroll);
  }

  const initiativeBase =
    (prefill?.dexterity ?? 0) + (prefill?.wits ?? 0);
  const initiativeBonus = initiativeBase + initiativeModifier;
  const canRollInitiative =
    !!onRollInitiative && !!prefill?.characterId && initiativeBase > 0;

  async function handleRollInitiative() {
    if (!onRollInitiative || !prefill?.characterId || busy) return;
    setBusy(true);
    setError(null);
    const resp = await onRollInitiative({
      characterId: prefill.characterId,
      isPublic,
      modifier: initiativeModifier !== 0 ? initiativeModifier : undefined,
    });
    setBusy(false);
    if (!resp.ok) {
      setError(resp.error ?? "No se pudo tirar la iniciativa");
    } else {
      // Tirada consumida: el modificador es circunstancial y no debe
      // arrastrarse a la siguiente iniciativa. También colapsamos el panel
      // para devolver el foco al roller V20.
      setInitiativeModifier(0);
      setInitiativeOpen(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const resp = await onRoll({
      pool,
      difficulty,
      specialty,
      skillRating: skillRating || undefined,
      // Sólo enviamos el texto si la tirada realmente declaró especialidad.
      // El back además lo guarda solo cuando specialty=true.
      specialtyText:
        specialty && prefill?.specialtyText
          ? prefill.specialtyText
          : undefined,
      willpowerForSuccess: wpSuccess,
      willpowerForWound: wpWound,
      willpowerForReroll: wpReroll,
      woundPenalty: rawPenalty,
      isPublic,
      label: label.trim() || undefined,
      characterId: prefill?.characterId,
      sourceKind: source?.sourceKind,
      sourceName: source?.sourceName,
    });
    setBusy(false);
    if (!resp.ok) {
      setError(resp.error ?? "No se pudo tirar");
    } else {
      // Una vez consumido, limpiamos el origen: la siguiente tirada manual
      // sale sin etiqueta a menos que el usuario active otra disciplina.
      setSource(null);
    }
  }

  const specialtyTooltip = specialtyAllowed
    ? "Especialidad: cada 10 lanza un dado extra. Si ese dado vuelve a ser 10 encadena otro; si es 1, resta un éxito anterior."
    : skillRating === 0
      ? "Selecciona una habilidad en la hoja para poder aplicar especialidad."
      : `La especialidad requiere habilidad ≥ ${MIN_SKILL_FOR_SPECIALTY}. La habilidad seleccionada tiene ${skillRating}.`;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberStepper
          label="Pool (d10)"
          value={pool}
          min={1}
          max={20}
          onChange={setPool}
        />
        <NumberStepper
          label="Dificultad"
          value={difficulty}
          min={2}
          max={10}
          onChange={setDifficulty}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRollInitiative ? (
          <Tooltip
            title="Iniciativa V20"
            content={
              canRollInitiative
                ? "Despliega el panel para tirar 1d10 + Destreza + Astucia. Puedes añadir un modificador circunstancial antes de tirar."
                : "Selecciona un personaje en la hoja con Destreza y Astucia para tirar iniciativa."
            }
            side="top"
          >
            <button
              type="button"
              onClick={() => setInitiativeOpen((v) => !v)}
              disabled={busy || !canRollInitiative}
              aria-expanded={initiativeOpen}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-heading uppercase tracking-wider transition-colors",
                initiativeOpen || initiativeModifier !== 0
                  ? "border-amber-400 bg-amber-500/20 text-amber-200"
                  : "border-border bg-input/30 text-muted-foreground hover:bg-amber-500/10",
                (busy || !canRollInitiative) &&
                  "opacity-40 cursor-not-allowed hover:bg-input/30",
              )}
            >
              <Swords className="size-3.5" />
              Iniciativa
              {initiativeModifier !== 0 ? (
                <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 text-[10px] leading-4 tabular-nums">
                  {initiativeModifier > 0 ? "+" : ""}
                  {initiativeModifier}
                </span>
              ) : null}
              {initiativeOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          </Tooltip>
        ) : null}
        <Toggle
          active={specialty}
          onToggle={() => specialtyAllowed && setSpecialty((v) => !v)}
          icon={<Star className="size-3.5" />}
          label="Especialidad"
          tooltip={specialtyTooltip}
          disabled={!specialtyAllowed}
        />
        <button
          type="button"
          onClick={() => setWpPanelOpen((v) => !v)}
          disabled={!hasCharacter || wpBudget === 0}
          aria-expanded={wpPanelOpen}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-heading uppercase tracking-wider transition-colors",
            wpToSpend > 0
              ? "border-blood bg-blood/20 text-blood-foreground"
              : "border-border bg-input/30 text-muted-foreground hover:bg-blood/10",
            (!hasCharacter || wpBudget === 0) &&
              "opacity-40 cursor-not-allowed hover:bg-input/30",
          )}
          title={
            !hasCharacter
              ? "Asocia un personaje para gastar Voluntad."
              : wpBudget === 0
                ? "Tu personaje no tiene puntos de Voluntad."
                : "Gastar Voluntad en esta tirada"
          }
        >
          <Zap className="size-3.5" />
          Voluntad
          {wpToSpend > 0 ? (
            <span className="ml-1 rounded-full bg-blood/40 px-1.5 text-[10px] leading-4">
              {wpToSpend}
            </span>
          ) : null}
          {wpPanelOpen ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
        {canTryPrivate ? (
          <Toggle
            active={!isPublic}
            onToggle={() => setIsPublic((v) => !v)}
            icon={<EyeOff className="size-3.5" />}
            label="Secreta"
            tooltip="Tirada secreta: sólo tú verás el resultado. Ni siquiera el narrador ve el detalle ni el gasto de Voluntad asociado. Queda registrada para auditoría."
          />
        ) : null}
      </div>

      {initiativeOpen && canRollInitiative ? (
        <div className="space-y-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-[10px] uppercase tracking-widest text-amber-300/90">
              Modificador circunstancial
            </span>
            <ModifierStepper
              value={initiativeModifier}
              onChange={setInitiativeModifier}
              disabled={busy}
            />
          </div>
          <p className="text-[10px] leading-tight text-muted-foreground">
            Base: 1d10 + Destreza ({prefill?.dexterity ?? 0}) + Astucia (
            {prefill?.wits ?? 0})
            {initiativeModifier !== 0 ? (
              <span
                className={cn(
                  "ml-1 font-medium",
                  initiativeModifier > 0
                    ? "text-emerald-300"
                    : "text-blood",
                )}
              >
                {initiativeModifier > 0 ? "+" : ""}
                {initiativeModifier} circunstancial
              </span>
            ) : null}
            <span className="ml-1 italic text-muted-foreground/70">
              · se reinicia tras tirar
            </span>
          </p>
          <Button
            type="button"
            onClick={handleRollInitiative}
            disabled={busy}
            variant="outline"
            className="w-full border-amber-500/50 text-amber-200 hover:bg-amber-500/10"
          >
            <Swords className="size-4" />
            {busy
              ? "Tirando iniciativa..."
              : `Tirar · 1d10 + ${initiativeBonus >= 0 ? initiativeBonus : `(${initiativeBonus})`}`}
          </Button>
        </div>
      ) : null}

      {wpPanelOpen && hasCharacter ? (
        <div className="space-y-1.5 rounded-md border border-blood/40 bg-blood/5 p-2.5">
          <p className="font-heading text-[10px] uppercase tracking-widest text-blood/80">
            Usos de Voluntad ({wpBudget} disponibles)
          </p>
          <WpOption
            active={wpSuccess}
            disabled={!wpSuccess && wpToSpend >= wpBudget && wpBudget > 0}
            icon={<Zap className="size-3.5" />}
            label="Éxito automático"
            description="+1 éxito no removible por 1s. La pifia sigue contando."
            onToggle={() => toggleWp("success")}
          />
          <WpOption
            active={wpWound}
            disabled={
              rawPenalty === 0 ||
              (!wpWound && wpToSpend >= wpBudget && wpBudget > 0)
            }
            icon={<HeartCrack className="size-3.5" />}
            label="Anular heridas"
            description={
              rawPenalty === 0
                ? "No tienes penalizador por heridas."
                : `Anula el penalizador de ${rawPenalty} en esta tirada.`
            }
            onToggle={() => toggleWp("wound")}
          />
          <WpOption
            active={wpReroll}
            disabled={!wpReroll && wpToSpend >= wpBudget && wpBudget > 0}
            icon={<RotateCcw className="size-3.5" />}
            label="Relanzar fallos"
            description="Relanza una vez los dados que no fueron éxito. Los 1 del reroll también restan."
            onToggle={() => toggleWp("reroll")}
          />
          <p className="pt-1 text-[10px] text-muted-foreground">
            Cada uso cuesta 1 punto. Costo total:{" "}
            <span className={cn(wpToSpend > wpBudget && "text-blood")}>
              {wpToSpend}
            </span>{" "}
            / {wpBudget}.
          </p>
        </div>
      ) : null}

      {rawPenalty < 0 ? (
        <p className="text-[10px] text-amber-400/90">
          Penalización por heridas: {rawPenalty}
          {wpWound ? (
            <span className="ml-1 text-emerald-300">
              · anulada por Voluntad
            </span>
          ) : null}
        </p>
      ) : null}

      {error ? <p className="text-xs text-blood">{error}</p> : null}

      {initiativeOpen ? null : (
        <Button
          type="submit"
          disabled={busy}
          className="w-full bg-blood text-blood-foreground hover:bg-blood/90"
        >
          <Dices className="size-4" />
          {busy
            ? "Tirando..."
            : `Tirar ${previewPool}d10 vs ${difficulty}`}
        </Button>
      )}
    </form>
  );
}

/** Stepper compacto con rango [-20, +20] para el modificador de iniciativa. */
function ModifierStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  function clamp(v: number) {
    return Math.max(-20, Math.min(20, v));
  }
  return (
    <div className="flex items-center rounded-md border border-amber-500/40 bg-input/30">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled}
        aria-label="Restar modificador"
        className="px-2 py-0.5 text-sm font-heading text-amber-300 hover:bg-blood/20 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(clamp(n));
          else if (e.target.value === "" || e.target.value === "-") onChange(0);
        }}
        disabled={disabled}
        aria-label="Modificador de iniciativa"
        className="h-7 w-12 bg-transparent text-center font-heading text-sm tabular-nums focus:outline-none disabled:opacity-40"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled}
        aria-label="Sumar modificador"
        className="px-2 py-0.5 text-sm font-heading text-amber-300 hover:bg-blood/20 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

// ── Subcomponentes ───────────────────────────────────────────────

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  function clamp(v: number) {
    return Math.max(min, Math.min(max, v));
  }
  return (
    <div>
      <label className="mb-1 block text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center rounded-md border border-input bg-input/30">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          className="px-2 py-1 text-sm font-heading hover:bg-blood/20"
        >
          −
        </button>
        <input
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onChange(clamp(n));
          }}
          className="h-9 w-full bg-transparent text-center font-heading text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          className="px-2 py-1 text-sm font-heading hover:bg-blood/20"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Toggle({
  active,
  onToggle,
  icon,
  label,
  tooltip,
  disabled = false,
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  disabled?: boolean;
}) {
  const button = (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-heading uppercase tracking-wider transition-colors",
        active
          ? "border-blood bg-blood/20 text-blood-foreground"
          : "border-border bg-input/30 text-muted-foreground hover:bg-blood/10",
        disabled && "opacity-40 cursor-not-allowed hover:bg-input/30"
      )}
    >
      {icon}
      {label}
    </button>
  );

  if (!tooltip) return button;
  return (
    <Tooltip content={tooltip} title={label} side="top">
      {button}
    </Tooltip>
  );
}

function WpOption({
  active,
  disabled,
  icon,
  label,
  description,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
        active
          ? "border-blood bg-blood/15"
          : "border-border/60 bg-background/40 hover:bg-blood/5",
        disabled && "opacity-40 cursor-not-allowed hover:bg-background/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          active
            ? "border-blood bg-blood text-blood-foreground"
            : "border-border bg-input/30 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[11px] uppercase tracking-wider text-foreground">
          {label}
        </span>
        <span className="block text-[10px] leading-tight text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}
