import {
  Check,
  Droplet,
  Flame,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CatalogReferenceButtons } from "~/components/character/catalog-reference-buttons";
import { CollapsibleSection } from "~/components/common/collapsible-section";
import { Tooltip } from "~/components/common/tooltip";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/hooks/use-confirm";
import { updateCharacterInChronicle } from "~/lib/api/characters/characters.api";
import type {
  Armor,
  Discipline,
  DisciplinePower,
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
    /** Origen de la tirada cuando el prefill no es un click-to-roll
     *  manual (ej. activar una disciplina ⇒ sourceKind="DISCIPLINE"). */
    sourceKind?: string;
    sourceName?: string;
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
  /**
   * Catálogo de disciplinas con sus poderes (incluye metadata mecánica).
   * Necesario para renderizar la sección de Disciplinas con tooltip y
   * activar poderes desde la mesa.
   */
  disciplinesCatalog?: Discipline[];
  /**
   * Activa un poder de disciplina. El callback usa el WS para descontar
   * sangre + anunciar en chat; resuelve con el resultado del back, que
   * incluye el shape del poder (para que la UI sepa si debe preparar el
   * roller a continuación).
   */
  onActivateDiscipline?: (input: {
    characterId: string;
    powerId: string;
  }) => Promise<{
    ok: boolean;
    error?: string;
    power?: {
      id: string;
      name: string;
      level: number;
      description: string | null;
      summary: string | null;
      bloodCost: number;
      rollAttribute: string | null;
      rollAbility: string | null;
      rollDifficulty: number | null;
    };
    discipline?: { id: string; name: string };
    blood?: { before: number; after: number; spent: number };
  }>;
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
  disciplinesCatalog,
  onActivateDiscipline,
}: CharacterSheetPanelProps) {
  // ── Selección click-to-roll ─────────────────────────────────
  const [selection, setSelection] = useState<RollSelection>({});

  // Reset cuando cambia el personaje seleccionado.
  useEffect(() => {
    setSelection({});
  }, [character.id]);

  const valueOf = (key: AttributeKey) => character[key] as number;

  // Llave de persistencia para los collapsibles. Por personaje + crónica
  // para que cada combinación recuerde su preferencia por separado.
  const collapseKey = (section: string) =>
    `mesa:${chronicleId}:${character.id}:${section}`;

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
      <header className="border-b border-border px-2 py-1.5">
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
        <div className="border-b border-blood bg-blood/10 px-2 py-1.5 text-sm">
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
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
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

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-gutter-stable themed-scrollbar p-2 space-y-2">
        {/* Estado editable (autosave) — colapsable, default cerrado. */}
        <StateSection
          character={character}
          chronicleId={chronicleId}
          onCharacterUpdated={onCharacterUpdated}
          onAnnounceSheet={onAnnounceSheet}
          canEditWillpower={canEditWillpower}
          collapseStorageKey={collapseKey("estado")}
        />

        {/* Atributos: cada grupo (Físicos / Sociales / Mentales) en su propia
            card con borde, dentro de un collapsible. */}
        <CollapsibleSection
          title="Atributos"
          storageKey={collapseKey("atributos")}
        >
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3 *:min-w-0 pt-0.5">
            {(["physical", "social", "mental"] as const).map((group) => (
              <article
                key={group}
                className="rounded-md border border-border/60 bg-background/30 p-1.5"
              >
                <p className="mb-1.5 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
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
              </article>
            ))}
          </div>
        </CollapsibleSection>

        {/* Habilidades: card por categoría (Talentos / Técnicas / Conocimientos). */}
        <CollapsibleSection
          title="Habilidades"
          storageKey={collapseKey("habilidades")}
        >
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3 *:min-w-0 pt-0.5">
            {(["TALENT", "SKILL", "KNOWLEDGE"] as AbilityCategory[]).map((cat) => {
              const items = character.abilities
                .filter((a) => a.category === cat)
                .sort((a, b) => a.name.localeCompare(b.name));
              return (
                <article
                  key={cat}
                  className="rounded-md border border-border/60 bg-background/30 p-1.5"
                >
                  <p className="mb-1.5 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
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
                </article>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Consulta rápida de catálogos V20 */}
        {weapons && weaponCategories && armors ? (
          <CatalogReferenceButtons
            weapons={weapons}
            weaponCategories={weaponCategories}
            armors={armors}
          />
        ) : null}

        {/* Disciplinas del personaje con acción rápida de activación */}
        {disciplinesCatalog && onActivateDiscipline ? (
          <DisciplinesSection
            character={character}
            catalog={disciplinesCatalog}
            collapseStorageKey={collapseKey("disciplinas")}
            onActivate={(powerId) =>
              onActivateDiscipline({ characterId: character.id, powerId })
            }
            onPrefillRoll={(prefill) => onPrefillRoll(prefill)}
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
  collapseStorageKey,
}: {
  character: Character;
  chronicleId: string;
  onCharacterUpdated?: (c: Character) => void;
  onAnnounceSheet?: (input: SheetAnnounceInput) => Promise<unknown>;
  canEditWillpower: boolean;
  /** Si se pasa, el bloque se envuelve en un CollapsibleSection y persiste
   *  su estado con esta llave (uno por personaje). */
  collapseStorageKey?: string;
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

  const autosaveBadge = (
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
  );

  const content = (
    <div className="space-y-2 pt-0.5">
      {error ? <p className="text-xs italic text-blood">{error}</p> : null}

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

      <div className="rounded-md border border-border/40 bg-card/30 px-2 py-1.5 space-y-1">
        <p className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1">Virtudes</p>
        <VirtueReadRow
          icon={<ShieldCheck className="size-3.5 text-sky-400" />}
          label="Conciencia"
          tooltip="Mide el sentido moral y ético del personaje. Junto a Autocontrol determina su Humanidad."
          value={draft.conscience}
        />
        <VirtueReadRow
          icon={<Zap className="size-3.5 text-violet-400" />}
          label="Autocontrol"
          tooltip="Regula los impulsos de la Bestia. Junto a Conciencia determina la Humanidad."
          value={draft.selfControl}
        />
        <VirtueReadRow
          icon={<Flame className="size-3.5 text-orange-400" />}
          label="Coraje"
          tooltip="La capacidad de enfrentarse al miedo y el peligro. Determina la Voluntad permanente."
          value={draft.courage}
        />
      </div>

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
    </div>
  );

  if (collapseStorageKey) {
    return (
      <CollapsibleSection
        title="Estado"
        storageKey={collapseStorageKey}
        rightSlot={autosaveBadge}
      >
        {content}
      </CollapsibleSection>
    );
  }

  return (
    <section className="space-y-2 rounded-md border border-border bg-card/50 p-1.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-heading text-xs uppercase tracking-wider text-blood">
          Estado
        </h4>
        {autosaveBadge}
      </div>
      {content}
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

function VirtueReadRow({
  icon,
  label,
  tooltip,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  value: number;
}) {
  const dots = Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={cn(
        "inline-block size-2.5 rounded-full border",
        i < value
          ? "border-foreground/60 bg-foreground/70"
          : "border-border/50 bg-transparent"
      )}
    />
  ));
  const row = (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-sm">
        {icon}
        <span className="text-sm">{label}</span>
      </span>
      <span className="flex items-center gap-1">{dots}</span>
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

// ─────────────────────────────────────────────────────────────────────────────
// Disciplinas del personaje
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve el valor de un atributo del personaje a partir de la clave del back
 * (ej. "manipulation" → character.manipulation). Si la clave no existe en el
 * modelo devuelve 0.
 */
function readAttribute(character: Character, key: string): number {
  // El modelo Character expone los atributos como propiedades planas con la
  // misma clave; un cast a Record<string, unknown> nos evita una unión enorme.
  const raw = (character as unknown as Record<string, unknown>)[key];
  return typeof raw === "number" ? raw : 0;
}

/** Busca el valor de una habilidad por nombre exacto. 0 si no existe. */
function readAbility(character: Character, name: string): number {
  return (
    character.abilities.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? 0
  );
}

/** Devuelve la specialty (markdown) de la habilidad si existe. */
function readAbilitySpecialty(
  character: Character,
  name: string,
): string | undefined {
  const ab = character.abilities.find(
    (a) => a.name.toLowerCase() === name.toLowerCase(),
  );
  return ab?.specialty ?? undefined;
}

function DisciplinesSection({
  character,
  catalog,
  collapseStorageKey,
  onActivate,
  onPrefillRoll,
}: {
  character: Character;
  catalog: Discipline[];
  collapseStorageKey?: string;
  onActivate: (powerId: string) => Promise<{
    ok: boolean;
    error?: string;
    power?: {
      id: string;
      name: string;
      level: number;
      description: string | null;
      summary: string | null;
      bloodCost: number;
      rollAttribute: string | null;
      rollAbility: string | null;
      rollDifficulty: number | null;
    };
    discipline?: { id: string; name: string };
  }>;
  onPrefillRoll: (input: {
    pool: number;
    label: string;
    characterId: string;
    woundPenalty: number;
    willpowerAvailable: number;
    skillRating: number;
    specialtyText?: string;
    sourceKind?: string;
    sourceName?: string;
  }) => void;
}) {
  const { confirm, dialog } = useConfirm();
  const [busyPowerId, setBusyPowerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Solo mostramos disciplinas que el personaje ha aprendido (level >= 1).
  // Por cada disciplina, los poderes hasta el nivel aprendido. Para
  // disciplinas con sendas, los poderes vienen agrupados por senda.
  const learned = useMemo(() => {
    const byId = new Map(catalog.map((d) => [d.id, d]));
    return character.disciplines
      .map((cd) => {
        const d = byId.get(cd.disciplineId);
        if (!d || cd.level < 1) return null;
        if (d.hasPaths) {
          // Filtra poderes de cada senda por el nivel conocido en esa senda.
          const ownedPathsById = new Map(
            (cd.paths ?? []).map((p) => [p.pathId, p]),
          );
          const pathBuckets = (d.paths ?? [])
            .map((p) => {
              const owned = ownedPathsById.get(p.id);
              if (!owned || owned.level < 1) return null;
              const powers = p.powers
                .filter((pw) => pw.level <= owned.level)
                .sort((a, b) => a.level - b.level);
              return {
                path: p,
                level: owned.level,
                isPrimary: !!owned.isPrimary,
                powers,
              };
            })
            .filter(
              (x): x is {
                path: import("~/lib/api/catalog/catalog.types").DisciplinePath;
                level: number;
                isPrimary: boolean;
                powers: DisciplinePower[];
              } => x !== null,
            )
            // Primaria primero, después por orden de catálogo.
            .sort((a, b) => {
              if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
              return a.path.order - b.path.order;
            });
          // Rituales aprendidos para esta disciplina.
          const rituals = (d.rituals ?? []).filter((r) =>
            (character.disciplineRituals ?? []).some(
              (cr) => cr.ritualId === r.id,
            ),
          );
          return {
            discipline: d,
            level: cd.level,
            powers: [] as DisciplinePower[],
            pathBuckets,
            rituals,
          };
        }
        const powers = d.powers
          .filter((p) => p.level <= cd.level)
          .sort((a, b) => a.level - b.level);
        return {
          discipline: d,
          level: cd.level,
          powers,
          pathBuckets: [],
          rituals: [],
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.discipline.name.localeCompare(b.discipline.name));
  }, [catalog, character.disciplines, character.disciplineRituals]);

  if (learned.length === 0) return null;

  async function handleActivate(power: DisciplinePower, disciplineName: string) {
    setError(null);
    const cost = power.bloodCost ?? 0;
    const hasRoll = !!power.rollAttribute;
    const lines: string[] = [];
    if (cost > 0) {
      lines.push(
        `Cuesta **${cost}** ${cost === 1 ? "punto" : "puntos"} de sangre (tienes ${character.bloodPool}).`,
      );
    } else {
      lines.push("No tiene coste de sangre.");
    }
    if (hasRoll) {
      const atKey = power.rollAttribute ?? "";
      const abilityName = power.rollAbility ?? "";
      const atVal = readAttribute(character, atKey);
      const abVal = abilityName ? readAbility(character, abilityName) : 0;
      const pool = atVal + abVal;
      const diff = power.rollDifficulty ?? 6;
      lines.push(
        `Tras activar, se preparará la tirada **${pool}d10 vs dif ${diff}**${abilityName ? ` (${atKey} + ${abilityName})` : ` (${atKey})`}.`,
      );
    } else {
      lines.push("Es un poder pasivo o sin tirada activa.");
    }

    const ok = await confirm({
      title: `Activar ${disciplineName} ${power.level}: ${power.name}`,
      description: (
        <div className="space-y-1.5 text-sm">
          {lines.map((l, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: l.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          ))}
        </div>
      ),
      confirmLabel: "Activar",
      cancelLabel: "Cancelar",
      tone: cost > 0 ? "danger" : "default",
    });
    if (!ok) return;

    setBusyPowerId(power.id);
    const resp = await onActivate(power.id);
    setBusyPowerId(null);
    if (!resp.ok) {
      setError(resp.error ?? "No se pudo activar el poder.");
      return;
    }
    if (hasRoll && resp.power) {
      const atKey = resp.power.rollAttribute ?? "";
      const abilityName = resp.power.rollAbility ?? "";
      const atVal = readAttribute(character, atKey);
      const abVal = abilityName ? readAbility(character, abilityName) : 0;
      const pool = atVal + abVal;
      const label = abilityName
        ? `${disciplineName} ${resp.power.level}: ${atKey} + ${abilityName}`
        : `${disciplineName} ${resp.power.level}: ${atKey}`;
      onPrefillRoll({
        pool,
        label,
        characterId: character.id,
        woundPenalty: computeWoundPenaltyLocal(character),
        willpowerAvailable: character.willpowerCurrent,
        skillRating: abVal,
        specialtyText: abilityName
          ? readAbilitySpecialty(character, abilityName)
          : undefined,
        sourceKind: "DISCIPLINE",
        sourceName: disciplineName,
      });
    }
  }

  const body = (
    <div className="space-y-1.5 pt-0.5">
      {error ? <p className="mb-2 text-xs text-blood">{error}</p> : null}
      {learned.map(({ discipline, level, powers, pathBuckets, rituals }) => (
        <article
          key={discipline.id}
          className="rounded-md border border-border/60 bg-background/30 p-1.5"
        >
          <header className="mb-1.5 flex items-baseline justify-between text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
            <span className="text-foreground/90">{discipline.name}</span>
            <span className="text-blood">
              {discipline.hasPaths ? `Max ${level}` : `Nivel ${level}`}
            </span>
          </header>
          {discipline.hasPaths ? (
            <div className="space-y-2">
              {pathBuckets.map((b) => (
                <div key={b.path.id} className="space-y-1">
                  <p className="flex items-baseline justify-between text-[10px] font-heading uppercase tracking-widest text-blood/85">
                    <span>
                      {b.path.name}
                      {b.isPrimary ? " · primaria" : ""}
                    </span>
                    <span>Lv {b.level}</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {b.powers.map((p) => (
                      <DisciplinePowerButton
                        key={p.id}
                        power={p}
                        disciplineName={`${discipline.name} · ${b.path.name}`}
                        characterBlood={character.bloodPool}
                        busy={busyPowerId === p.id}
                        onClick={() =>
                          void handleActivate(
                            p,
                            `${discipline.name} · ${b.path.name}`,
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
              {rituals.length > 0 ? (
                <details className="rounded-md border border-border/40 bg-background/40 px-1.5 py-1">
                  <summary className="cursor-pointer text-[10px] font-heading uppercase tracking-widest text-blood/85">
                    Rituales conocidos ({rituals.length})
                  </summary>
                  <ul className="mt-1 space-y-0.5 font-serif text-[11px] text-foreground/80">
                    {rituals.map((r) => (
                      <li key={r.id} className="flex items-baseline gap-1.5">
                        <span className="font-heading text-blood">
                          ·{r.level}·
                        </span>
                        <span>{r.name}</span>
                        {r.castingTime ? (
                          <span className="ml-auto text-[10px] italic text-muted-foreground">
                            {r.castingTime}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {powers.map((p) => (
                <DisciplinePowerButton
                  key={p.id}
                  power={p}
                  disciplineName={discipline.name}
                  characterBlood={character.bloodPool}
                  busy={busyPowerId === p.id}
                  onClick={() => void handleActivate(p, discipline.name)}
                />
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );

  if (collapseStorageKey) {
    return (
      <>
        <CollapsibleSection
          title="Disciplinas"
          storageKey={collapseStorageKey}
        >
          {body}
        </CollapsibleSection>
        {dialog}
      </>
    );
  }

  return (
    <section>
      <SectionTitle>Disciplinas</SectionTitle>
      {body}
      {dialog}
    </section>
  );
}

function DisciplinePowerButton({
  power,
  disciplineName,
  characterBlood,
  busy,
  onClick,
}: {
  power: DisciplinePower;
  disciplineName: string;
  characterBlood: number;
  busy: boolean;
  onClick: () => void;
}) {
  const cost = power.bloodCost ?? 0;
  const insufficient = cost > 0 && characterBlood < cost;
  const hasRoll = !!power.rollAttribute;
  const tooltipBody = (
    <span className="block space-y-1">
      {power.summary ? (
        <span className="block text-foreground/90">{power.summary}</span>
      ) : null}
      {power.description ? (
        <span className="block text-[11px] italic text-muted-foreground">
          {power.description}
        </span>
      ) : null}
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        {cost > 0 ? `Cuesta ${cost} sangre · ` : "Sin coste · "}
        {hasRoll ? "Con tirada" : "Sin tirada"}
      </span>
    </span>
  );
  return (
    <Tooltip
      title={`${disciplineName} ${power.level}: ${power.name}`}
      content={tooltipBody}
      side="top"
      className="w-full"
    >
      <button
        type="button"
        disabled={busy || insufficient}
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition",
          "border-blood/40 bg-card/50 hover:border-blood hover:bg-blood/15",
          (busy || insufficient) &&
            "opacity-50 cursor-not-allowed hover:border-blood/40 hover:bg-card/50",
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <Wand2 className="size-3.5 shrink-0 text-blood" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading text-[11px] uppercase tracking-wider text-foreground">
              {power.name}
            </span>
            <span className="block truncate text-[10px] italic text-muted-foreground">
              {power.summary ?? "Sin resumen"}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {cost > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 font-heading text-[9px] uppercase tracking-wider",
                insufficient
                  ? "bg-destructive/20 text-destructive"
                  : "bg-blood/15 text-blood",
              )}
            >
              <Droplet className="size-2.5" />
              {cost}
            </span>
          ) : null}
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
        </span>
      </button>
    </Tooltip>
  );
}

/**
 * Local wrapper a `computeWoundPenalty` para no exportarla. Usamos el mismo
 * cálculo que el resto del panel.
 */
function computeWoundPenaltyLocal(character: Character): number {
  // -1 a partir de Magullado, -2 desde Lesionado, -5 en Tullido (V20).
  // Como el panel ya tiene una helper interna, lo replicamos aquí basándonos
  // en la jerarquía de salud. Si el modelo cambia, ajustar en un solo lugar.
  if ((character.healthCrippled ?? 0) > 0) return -5;
  if ((character.healthMauled ?? 0) > 0) return -2;
  if ((character.healthWounded ?? 0) > 0) return -2;
  if ((character.healthInjured ?? 0) > 0) return -1;
  if ((character.healthHurt ?? 0) > 0) return -1;
  return 0;
}
