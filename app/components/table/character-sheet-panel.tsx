import { Check, Droplet, Heart, Loader2, Sparkles, Star, X, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CatalogReferenceButtons } from "~/components/character/catalog-reference-buttons";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { updateCharacterInChronicle } from "~/lib/api/characters/characters.api";
import type {
  Armor,
  Weapon,
  WeaponCategory,
} from "~/lib/api/catalog/catalog.types";
import type {
  Character,
  CharacterAbility,
} from "~/lib/api/characters/characters.types";
import type {
  SheetAnnounceInput,
  SheetDeltaEntry,
} from "~/lib/socket/types";
import {
  ATTRIBUTES,
  ATTR_GROUP_LABEL,
  attributeLabel,
  categoryLabel,
  type AbilityCategory,
  type AttributeKey,
} from "~/lib/vtm/abilities";
import { cn } from "~/lib/utils";

export interface RollSelection {
  attributeKey?: AttributeKey;
  abilityName?: string;
  abilityCategory?: AbilityCategory;
}

interface CharacterSheetPanelProps {
  character: Character;
  chronicleId: string;
  /**
   * Llamado cuando el usuario tira con el atajo desde la hoja.
   * `pool` es el pool BASE (atributo + habilidad), sin restar heridas:
   * el roller aplica el penalizador él mismo (y permite anularlo con Voluntad).
   * `woundPenalty` es el penalizador actual del personaje (negativo o 0).
   * `willpowerAvailable` es la Voluntad actual del personaje, que el roller
   * usa para deshabilitar los toggles cuando no alcanza el saldo.
   */
  onPrefillRoll: (input: {
    pool: number;
    label: string;
    characterId: string;
    woundPenalty: number;
    willpowerAvailable: number;
    /** Valor de la habilidad seleccionada (0..5). 0 si no hay habilidad. */
    skillRating: number;
    /** Texto (markdown) de la especialidad de la habilidad seleccionada. */
    specialtyText?: string;
  }) => void;
  /** Cuando se hace PATCH exitoso al back. */
  onCharacterUpdated?: (updated: Character) => void;
  /** Anuncia el delta de cambios al resto de la mesa (WS). */
  onAnnounceSheet?: (input: SheetAnnounceInput) => Promise<unknown>;
  /**
   * Si false, los campos de Voluntad (permanente y actual) son read-only.
   * Por convención: solo el narrador puede modificar la voluntad desde la mesa.
   * El jugador ve los valores pero no puede tocarlos a mano; se descuentan
   * automáticamente al gastar Voluntad en una tirada.
   */
  canEditWillpower?: boolean;
  /**
   * Catálogos V20 para los botones de consulta (Armas CC / Armas de fuego /
   * Armaduras) que se muestran bajo Habilidades en la hoja embebida.
   * Si no se proveen, los botones no se renderizan.
   */
  weapons?: Weapon[];
  weaponCategories?: WeaponCategory[];
  armors?: Armor[];
}

const HEALTH_LEVELS: Array<{
  key: HealthKey;
  label: string;
  penalty: number;
  hint: string;
}> = [
  { key: "healthBruised", label: "Contusionado", penalty: 0, hint: "-0" },
  { key: "healthHurt", label: "Magullado", penalty: -1, hint: "-1" },
  { key: "healthInjured", label: "Herido", penalty: -1, hint: "-1" },
  { key: "healthWounded", label: "Lesionado", penalty: -2, hint: "-2" },
  { key: "healthMauled", label: "Malherido", penalty: -2, hint: "-2" },
  { key: "healthCrippled", label: "Tullido", penalty: -5, hint: "-5" },
  // Incapacitado no se "penaliza", saca al personaje de combate.
  { key: "healthIncapacitated", label: "Incapacitado", penalty: 0, hint: "—" },
];

type HealthKey =
  | "healthBruised"
  | "healthHurt"
  | "healthInjured"
  | "healthWounded"
  | "healthMauled"
  | "healthCrippled"
  | "healthIncapacitated";

type StateKey =
  | "bloodPool"
  | "willpowerCurrent"
  | "willpowerMax"
  | "humanity"
  | "experience"
  | HealthKey;

const STATE_KEYS: readonly StateKey[] = [
  "bloodPool",
  "willpowerCurrent",
  "willpowerMax",
  "humanity",
  "experience",
  "healthBruised",
  "healthHurt",
  "healthInjured",
  "healthWounded",
  "healthMauled",
  "healthCrippled",
  "healthIncapacitated",
] as const;

const STATE_LABELS: Record<StateKey, string> = {
  bloodPool: "Sangre",
  willpowerCurrent: "Voluntad actual",
  willpowerMax: "Voluntad permanente",
  humanity: "Humanidad",
  experience: "Experiencia",
  healthBruised: "Contusionado",
  healthHurt: "Magullado",
  healthInjured: "Herido",
  healthWounded: "Lesionado",
  healthMauled: "Malherido",
  healthCrippled: "Tullido",
  healthIncapacitated: "Incapacitado",
};

const HEALTH_GLYPH = ["—", "/", "✕"];

const AUTOSAVE_DEBOUNCE_MS = 700;

// ─────────────────────────────────────────────────────────────────────────────

export function CharacterSheetPanel({
  character,
  chronicleId,
  onPrefillRoll,
  onCharacterUpdated,
  onAnnounceSheet,
  canEditWillpower = false,
  weapons,
  weaponCategories,
  armors,
}: CharacterSheetPanelProps) {
  // ── Selección click-to-roll ─────────────────────────────────
  const [selection, setSelection] = useState<RollSelection>({});

  // Reset cuando cambia el personaje seleccionado.
  useEffect(() => {
    setSelection({});
  }, [character.id]);

  const valueOf = (key: AttributeKey) => character[key] as number;

  function toggleAttribute(key: AttributeKey) {
    setSelection((s) => ({
      ...s,
      attributeKey: s.attributeKey === key ? undefined : key,
    }));
  }

  function toggleAbility(ab: CharacterAbility) {
    setSelection((s) =>
      s.abilityName === ab.name && s.abilityCategory === ab.category
        ? { ...s, abilityName: undefined, abilityCategory: undefined }
        : { ...s, abilityName: ab.name, abilityCategory: ab.category }
    );
  }

  const selectedAbility = useMemo(() => {
    if (!selection.abilityName || !selection.abilityCategory) return null;
    return (
      character.abilities.find(
        (a) =>
          a.name === selection.abilityName &&
          a.category === selection.abilityCategory
      ) ?? null
    );
  }, [character, selection.abilityName, selection.abilityCategory]);
  const abilityValue = selectedAbility?.value ?? 0;
  const abilitySpecialty = selectedAbility?.specialty ?? null;

  const attrValue = selection.attributeKey ? valueOf(selection.attributeKey) : 0;
  const woundPenalty = useMemo(() => computeWoundPenalty(character), [character]);

  // Pool BASE (atributo + habilidad). El roller aplica el penalizador.
  // El preview muestra ambos: el base y cómo quedaría tras heridas.
  const basePool = attrValue + abilityValue;
  // Para tirar se exige siempre un atributo (puede ir sólo o atributo+habilidad).
  // Una habilidad por sí sola no produce una tirada válida en V20.
  const canRoll = !!selection.attributeKey && basePool > 0;
  const effectivePoolAfterWounds = canRoll
    ? Math.max(1, basePool + woundPenalty)
    : 0;

  const labelParts: string[] = [];
  if (selection.attributeKey) labelParts.push(attributeLabel(selection.attributeKey));
  if (selection.abilityName) labelParts.push(selection.abilityName);
  const label = labelParts.join(" + ");

  function clearSelection() {
    setSelection({});
  }

  function commitRoll() {
    if (!canRoll) return;
    onPrefillRoll({
      pool: basePool,
      label,
      characterId: character.id,
      woundPenalty,
      willpowerAvailable: character.willpowerCurrent,
      skillRating: abilityValue,
      specialtyText: abilitySpecialty ?? undefined,
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Identidad */}
      <header className="border-b border-border px-3 py-2">
        <h3 className="truncate font-heading text-base uppercase tracking-wider">
          {character.name}
        </h3>
        {character.concept ? (
          <p className="truncate text-xs italic text-muted-foreground">
            {character.concept}
          </p>
        ) : null}
        {character.kind !== "PC" ? (
          <span className="mt-1 inline-block rounded-sm bg-blood/20 px-1.5 py-0.5 font-heading text-[10px] uppercase tracking-wider text-blood">
            {character.kind === "NPC" ? "PNJ" : "Antagonista"}
          </span>
        ) : null}
      </header>

      {/* Preview de selección click-to-roll. Si sólo hay habilidad (sin atributo)
          mostramos un hint para guiar al usuario; V20 exige siempre un atributo. */}
      {canRoll ? (
        <div className="border-b border-blood bg-blood/10 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground">{label}</p>
              <p className="font-heading text-base uppercase tracking-wider text-blood">
                {effectivePoolAfterWounds}d10
                {woundPenalty < 0 ? (
                  <span className="ml-1 text-xs text-amber-400 normal-case tracking-normal">
                    ({basePool}{woundPenalty})
                  </span>
                ) : null}
              </p>
              {woundPenalty < 0 ? (
                <p className="text-[10px] text-amber-400/80">
                  Penalización por heridas: {woundPenalty}
                  <span className="ml-1 text-muted-foreground">
                    · podés anularla gastando Voluntad
                  </span>
                </p>
              ) : null}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                onClick={commitRoll}
                className="bg-blood text-blood-foreground hover:bg-blood/90"
              >
                <Check className="size-3.5" />
                Agregar a la tirada
              </Button>
              <Tooltip
                title="Limpiar"
                content="Quita la selección actual de atributo y habilidad."
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={clearSelection}
                >
                  <X className="size-3.5" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      ) : selection.abilityName ? (
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <span>
            Selecciona un <strong className="font-heading">atributo</strong>{" "}
            para completar la tirada. Una habilidad por sí sola no se tira.
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={clearSelection}
            aria-label="Limpiar selección"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-gutter-stable themed-scrollbar p-3 space-y-4">
        {/* Estado editable (autosave) */}
        <StateSection
          character={character}
          chronicleId={chronicleId}
          onCharacterUpdated={onCharacterUpdated}
          onAnnounceSheet={onAnnounceSheet}
          canEditWillpower={canEditWillpower}
        />

        {/* Atributos: 3 columnas (Físicos / Sociales / Mentales) en pantallas grandes */}
        <section>
          <SectionTitle>Atributos</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 *:min-w-0">
            {(["physical", "social", "mental"] as const).map((group) => (
              <div key={group}>
                <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
                  {ATTR_GROUP_LABEL[group]}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {ATTRIBUTES.filter((a) => a.group === group).map((a) => (
                    <StatCard
                      key={a.key}
                      label={a.label}
                      value={valueOf(a.key)}
                      active={selection.attributeKey === a.key}
                      onClick={() => toggleAttribute(a.key)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Habilidades: 3 columnas (Talentos / Técnicas / Conocimientos) en pantallas grandes */}
        <section>
          <SectionTitle>Habilidades</SectionTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 *:min-w-0">
            {(["TALENT", "SKILL", "KNOWLEDGE"] as AbilityCategory[]).map((cat) => {
              const items = character.abilities
                .filter((a) => a.category === cat)
                .sort((a, b) => a.name.localeCompare(b.name));
              return (
                <div key={cat}>
                  <p className="mb-1 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
                    {categoryLabel(cat)}
                  </p>
                  {items.length === 0 ? (
                    <p className="px-2 text-xs italic text-muted-foreground/60">
                      Sin entradas. Añade habilidades desde la hoja completa.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map((ab) => (
                        <StatCard
                          key={`${ab.category}-${ab.name}`}
                          label={ab.name}
                          specialty={ab.specialty || undefined}
                          value={ab.value}
                          active={
                            selection.abilityName === ab.name &&
                            selection.abilityCategory === ab.category
                          }
                          onClick={() => toggleAbility(ab)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Consulta rápida de catálogos V20 */}
        {weapons && weaponCategories && armors ? (
          <CatalogReferenceButtons
            weapons={weapons}
            weaponCategories={weaponCategories}
            armors={armors}
          />
        ) : null}

        {/* Link a edición completa */}
        <div className="pt-2 text-center">
          <Link
            to={`/characters/${character.id}`}
            className="text-xs italic text-muted-foreground hover:text-foreground"
          >
            Editar hoja completa →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeWoundPenalty(c: Character): number {
  // Devuelve el peor penalizador (más negativo) entre los niveles que tienen
  // al menos una casilla marcada (value > 0).
  let worst = 0;
  for (const lvl of HEALTH_LEVELS) {
    if ((c[lvl.key] as number) > 0 && lvl.penalty < worst) {
      worst = lvl.penalty;
    }
  }
  return worst;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-1.5 font-heading text-xs uppercase tracking-wider text-blood">
      {children}
    </h4>
  );
}

function StatCard({
  label,
  specialty,
  value,
  active,
  onClick,
}: {
  label: string;
  /**
   * Texto (markdown) de la especialidad declarada para esta habilidad, si la
   * hay. No se muestra inline en la card: una estrella verde en la esquina
   * indica que existe y el texto vive en el tooltip al hacer hover.
   */
  specialty?: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const disabled = value <= 0;
  const hasSpecialty = !!specialty && specialty.trim().length > 0;
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-1.5 text-center transition-colors",
        active
          ? "border-blood bg-blood/25 ring-1 ring-blood"
          : "border-border/60 bg-card/40 hover:border-blood/60 hover:bg-blood/10",
        disabled &&
          "opacity-40 hover:border-border/60 hover:bg-card/40 cursor-not-allowed"
      )}
    >
      <span className="block w-full truncate font-heading text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-heading text-lg leading-none tabular-nums",
          value > 0 ? "text-foreground" : "text-muted-foreground/50"
        )}
      >
        {value}
      </span>
      {hasSpecialty ? (
        <Star
          className="absolute right-1 top-1 size-3 text-emerald-400"
          aria-label="Tiene especialidad declarada"
        />
      ) : null}
    </button>
  );

  const tooltipContent = (
    <span className="block space-y-1.5">
      <span className="block">
        {disabled
          ? "Sin puntos. Súbelo desde la hoja completa para poder añadirlo a una tirada."
          : `Click para añadirlo a la tirada (${value} ${value === 1 ? "punto" : "puntos"}).`}
      </span>
      {hasSpecialty ? (
        <span className="block rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-1">
          <span className="mb-0.5 flex items-center gap-1 font-heading text-[0.6rem] uppercase tracking-widest text-emerald-300">
            <Star className="size-3" /> Especialidad
          </span>
          <span className="markdown-content block text-[11px] leading-snug text-foreground/90">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={(url) => url}
              // El tooltip envuelve el content en <span> (inline), así que
              // remapeamos los bloques de markdown a <span> con display:block
              // para mantener HTML válido (un <p> dentro de <span> es inválido
              // y React se queja en consola).
              components={{
                p: ({ children }) => <span className="block">{children}</span>,
                h1: ({ children }) => (
                  <span className="block font-heading">{children}</span>
                ),
                h2: ({ children }) => (
                  <span className="block font-heading">{children}</span>
                ),
                h3: ({ children }) => (
                  <span className="block font-heading">{children}</span>
                ),
                ul: ({ children }) => (
                  <span className="block pl-3">{children}</span>
                ),
                ol: ({ children }) => (
                  <span className="block pl-3">{children}</span>
                ),
                li: ({ children }) => (
                  <span className="block">• {children}</span>
                ),
              }}
            >
              {specialty!}
            </ReactMarkdown>
          </span>
        </span>
      ) : null}
    </span>
  );

  return (
    <Tooltip
      title={label}
      content={tooltipContent}
      // `top` evita la colisión con el divisor central entre la hoja y el
      // panel derecho de chat/dados que se daba con `side="right"`.
      side="top"
      className="w-full"
    >
      {button}
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado editable con autosave
// ─────────────────────────────────────────────────────────────────────────────

function StateSection({
  character,
  chronicleId,
  onCharacterUpdated,
  onAnnounceSheet,
  canEditWillpower,
}: {
  character: Character;
  chronicleId: string;
  onCharacterUpdated?: (c: Character) => void;
  onAnnounceSheet?: (input: SheetAnnounceInput) => Promise<unknown>;
  canEditWillpower: boolean;
}) {
  const [draft, setDraft] = useState<Character>(character);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshot último confirmado por el server, para diffear contra el draft al guardar.
  const lastSavedRef = useRef<Character>(character);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resincronización completa cuando cambia de personaje o el server emite
  // un nuevo updatedAt (PATCH explícito).
  useEffect(() => {
    setDraft(character);
    lastSavedRef.current = character;
  }, [character.id, character.updatedAt]);

  // Sincronización fina por campo: cuando un evento WS (sheet:announce, por
  // ejemplo gasto de Voluntad en una tirada) parchea el `character` SIN
  // tocar `updatedAt`, el effect de arriba no se dispara. Recorremos los
  // campos numéricos de STATE_KEYS y, si el server cambió uno y el usuario
  // no tiene un edit local pendiente sobre ese campo, lo adoptamos en draft.
  //
  // Adopt si: draft[key] === lastSavedRef[key]  →  no había borrador local.
  useEffect(() => {
    let changed = false;
    setDraft((d) => {
      const next = { ...d } as Character;
      for (const key of STATE_KEYS) {
        const serverVal = character[key] as number;
        const lastVal = lastSavedRef.current[key] as number;
        const draftVal = d[key] as number;
        if (serverVal !== lastVal && draftVal === lastVal) {
          (next[key] as unknown as number) = serverVal;
          changed = true;
        }
      }
      return changed ? next : d;
    });
    if (changed) {
      // Actualizamos el "último confirmado" para no re-aplicar el mismo delta.
      lastSavedRef.current = character;
    }
  }, [
    character.bloodPool,
    character.willpowerCurrent,
    character.willpowerMax,
    character.humanity,
    character.experience,
    character.healthBruised,
    character.healthHurt,
    character.healthInjured,
    character.healthWounded,
    character.healthMauled,
    character.healthCrippled,
    character.healthIncapacitated,
  ]);

  // Cleanup del timer al desmontar / cambiar de personaje.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [character.id]);

  function setField(key: StateKey, value: number, min: number, max: number) {
    const clamped = Math.max(min, Math.min(max, Math.floor(value)));
    setDraft((d) => {
      const next = { ...d, [key]: clamped };
      scheduleSave(next);
      return next;
    });
  }

  function scheduleSave(nextDraft: Character) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist(nextDraft);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  async function persist(target: Character) {
    const deltas = diffDeltas(lastSavedRef.current, target);
    if (deltas.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const patch: Partial<Record<StateKey, number>> = {};
      for (const k of STATE_KEYS) {
        if (target[k] !== lastSavedRef.current[k]) {
          patch[k] = target[k] as number;
        }
      }
      const updated = await updateCharacterInChronicle(
        chronicleId,
        character.id,
        patch,
      );
      lastSavedRef.current = updated;
      onCharacterUpdated?.(updated);
      // Anuncia los cambios en chat (back decide la visibilidad según kind).
      if (onAnnounceSheet) {
        await onAnnounceSheet({ characterId: character.id, deltas });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-border bg-card/50 p-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-heading text-xs uppercase tracking-wider text-blood">
          Estado
        </h4>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Guardando...
            </>
          ) : (
            <span className="opacity-60">Cambios automáticos</span>
          )}
        </span>
      </div>

      {error ? (
        <p className="text-xs italic text-blood">{error}</p>
      ) : null}

      <StateField
        icon={<Droplet className="size-3.5 text-blood" />}
        label="Reserva de sangre"
        tooltip="Puntos de sangre disponibles. La capacidad máxima depende de la generación."
        value={draft.bloodPool}
        min={0}
        max={20}
        onChange={(v) => setField("bloodPool", v, 0, 20)}
      />
      <StateField
        icon={<Zap className="size-3.5 text-amber-300" />}
        label="Voluntad actual"
        tooltip={
          canEditWillpower
            ? "Puntos de Voluntad que tenés ahora. Se gastan para resistir, sumar un éxito automático o anular el penalizador por heridas en una tirada."
            : "Se descuenta automáticamente cuando gastás Voluntad en una tirada. Solo el narrador puede ajustarla a mano desde la mesa."
        }
        value={draft.willpowerCurrent}
        min={0}
        max={draft.willpowerMax}
        readOnly={!canEditWillpower}
        onChange={(v) => setField("willpowerCurrent", v, 0, draft.willpowerMax)}
        right={
          <span className="text-xs text-muted-foreground">
            / {draft.willpowerMax}
          </span>
        }
      />
      <StateField
        icon={<Sparkles className="size-3.5 text-emerald-400" />}
        label={draft.virtueScheme === "PATH" ? "Senda" : "Humanidad"}
        tooltip="Nivel de Humanidad (o Senda alternativa). Limita máximos de sed y voluntad."
        value={draft.humanity}
        min={0}
        max={10}
        onChange={(v) => setField("humanity", v, 0, 10)}
      />
      <StateField
        icon={<Sparkles className="size-3.5 text-muted-foreground" />}
        label="Experiencia"
        tooltip="Puntos de experiencia acumulados, listos para gastar."
        value={draft.experience}
        min={0}
        max={999}
        onChange={(v) => setField("experience", v, 0, 999)}
      />

      <div>
        <div className="mb-1 flex items-center gap-1.5">
          <Heart className="size-3.5 text-blood" />
          <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
            Salud
          </span>
        </div>
        <div className="space-y-1">
          {HEALTH_LEVELS.map((lvl) => (
            <HealthRow
              key={lvl.key}
              label={lvl.label}
              hint={lvl.hint}
              value={draft[lvl.key] as number}
              onChange={(v) => setField(lvl.key, v, 0, 2)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StateField({
  icon,
  label,
  tooltip,
  value,
  min,
  max,
  onChange,
  right,
  readOnly = false,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  right?: React.ReactNode;
  readOnly?: boolean;
}) {
  const row = (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-sm">
        {icon}
        <span>{label}</span>
      </span>
      <div className="flex items-center gap-1">
        {readOnly ? (
          <span className="w-8 text-center font-heading text-sm text-muted-foreground/80">
            {value}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onChange(value - 1)}
              disabled={value <= min}
              className="size-6 rounded border border-border bg-input/30 font-heading text-sm hover:bg-blood/20 disabled:opacity-40"
            >
              −
            </button>
            <span className="w-8 text-center font-heading text-sm">{value}</span>
            <button
              type="button"
              onClick={() => onChange(value + 1)}
              disabled={value >= max}
              className="size-6 rounded border border-border bg-input/30 font-heading text-sm hover:bg-blood/20 disabled:opacity-40"
            >
              +
            </button>
          </>
        )}
        {right}
      </div>
    </div>
  );

  if (!tooltip) return row;
  return (
    <Tooltip title={label} content={tooltip} side="left" className="w-full">
      {row}
    </Tooltip>
  );
}

function HealthRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const next = (value + 1) % 3;
  const tooltipBody = `Penalización ${hint}. Click para alternar: ileso → contundente (/) → letal o agravado (✕).`;
  return (
    <Tooltip title={label} content={tooltipBody} side="left" className="w-full">
      <button
        type="button"
        onClick={() => onChange(next)}
        className="flex w-full items-center justify-between gap-2 rounded-sm px-1.5 py-0.5 text-left text-xs hover:bg-blood/10"
      >
        <span className="flex-1 truncate">{label}</span>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
        <span
          className={cn(
            "inline-flex size-4 items-center justify-center rounded-sm border font-heading text-[10px]",
            value === 0 && "border-border bg-muted/30 text-muted-foreground",
            value === 1 && "border-amber-500 bg-amber-500/20 text-amber-300",
            value === 2 && "border-blood bg-blood/30 text-blood"
          )}
        >
          {value === 0 ? "" : value === 1 ? "/" : "✕"}
        </span>
      </button>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff helpers
// ─────────────────────────────────────────────────────────────────────────────

function diffDeltas(prev: Character, next: Character): SheetDeltaEntry[] {
  const out: SheetDeltaEntry[] = [];
  for (const k of STATE_KEYS) {
    const a = prev[k] as number;
    const b = next[k] as number;
    if (a === b) continue;
    out.push({
      label: STATE_LABELS[k],
      before: formatState(k, a),
      after: formatState(k, b),
    });
  }
  return out;
}

function formatState(key: StateKey, value: number): string {
  if (key.startsWith("health")) {
    return HEALTH_GLYPH[value] ?? String(value);
  }
  return String(value);
}
