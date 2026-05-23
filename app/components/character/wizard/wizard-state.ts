/**
 * Estado y validación del wizard de creación de personaje V20.
 *
 * El wizard mantiene su propio estado tipado, separado del CharacterInput
 * final, y al terminar produce un Partial<CharacterInput> vía
 * `wizard-mapper.ts`. Esto evita acoplar la UI guiada a la forma del
 * payload y simplifica las validaciones por paso.
 */

import { TALENTS, SKILLS, KNOWLEDGES } from "~/lib/character-sheet";

export type AttributeKey =
  | "strength"
  | "dexterity"
  | "stamina"
  | "charisma"
  | "manipulation"
  | "appearance"
  | "perception"
  | "intelligence"
  | "wits";

export type AttributeCategory = "physical" | "social" | "mental";
export type AbilityCategory = "talents" | "skills" | "knowledges";

export type AttributePriority = "primary" | "secondary" | "tertiary";
export type AbilityPriority = "primary" | "secondary" | "tertiary";

export const ATTRIBUTE_POOL_BY_PRIORITY: Record<AttributePriority, number> = {
  primary: 7,
  secondary: 5,
  tertiary: 3,
};

export const ABILITY_POOL_BY_PRIORITY: Record<AbilityPriority, number> = {
  primary: 13,
  secondary: 9,
  tertiary: 5,
};

export const CREATION_ABILITY_MAX = 3;
export const VIRTUE_MAX = 5;
export const VIRTUE_BASE = 1; // círculo gratuito por virtud.

export const DISCIPLINE_POINTS = 3;
export const BACKGROUND_POINTS = 5;
export const VIRTUE_POINTS = 7;
export const FREEBIE_POINTS = 15;

/**
 * Coste por círculo de los puntos gratuitos (V20, tabla "Puntos Gratuitos").
 */
export const FREEBIE_COST = {
  attribute: 5,
  ability: 2,
  discipline: 7,
  background: 1,
  virtue: 2,
  humanity: 1,
  willpower: 1,
} as const;

export type FreebieCategory = keyof typeof FREEBIE_COST;

export interface WizardConcept {
  name: string;
  concept: string;
  clanId: string | null;
  natureId: string | null;
  demeanorId: string | null;
  generation: number;
  /**
   * Retrato del personaje seleccionado en el paso 1. Solo vive en memoria
   * mientras el wizard está abierto: el archivo se sube en
   * `handleWizardComplete` despues de crear el personaje (porque el endpoint
   * requiere `characterId`). Si el jugador no elige imagen, queda `null`.
   */
  avatarFile?: File | null;
  /** objectURL para preview local. Se libera al cambiar/quitar o cerrar. */
  avatarPreviewUrl?: string | null;
}

export interface WizardAttributes {
  /** Mapa categoría → prioridad. Cada prioridad se usa exactamente una vez. */
  priority: Record<AttributeCategory, AttributePriority | null>;
  /** Valores actuales de cada atributo (cada uno arranca en 1). */
  values: Record<AttributeKey, number>;
}

export interface WizardAbilities {
  priority: Record<AbilityCategory, AbilityPriority | null>;
  /** key = nombre canónico V20 (ej. "Pelea"). */
  values: Record<string, number>;
}

export interface WizardDisciplinePick {
  disciplineId: string;
  level: number;
  /**
   * Sendas asignadas a la disciplina si esta tiene `hasPaths=true`. Cada
   * pick consume puntos del pool de disciplinas igual que un nivel
   * monolítico (1 pt por nivel). El total de la disciplina (`level`) se
   * deriva del máximo de niveles de sendas.
   */
  paths?: { pathId: string; level: number; isPrimary: boolean }[];
}

export interface WizardBackgroundPick {
  /** key del catálogo Background (ej. "aliados"). Es null cuando se gasta automáticamente por Generación. */
  key: string;
  level: number;
}

export interface WizardVirtues {
  conscience: number;
  selfControl: number;
  courage: number;
}

export interface WizardFreebies {
  /** Puntos de atributo extra por key. */
  attributes: Partial<Record<AttributeKey, number>>;
  /** Puntos de habilidad extra por nombre. */
  abilities: Record<string, number>;
  /** Puntos de disciplina extra por disciplineId. */
  disciplines: Record<string, number>;
  /** Puntos de trasfondo extra por key del catálogo. */
  backgrounds: Record<string, number>;
  /** Puntos extra de virtud. */
  virtues: Partial<Record<keyof WizardVirtues, number>>;
  /** Círculos de Humanidad extra (1 pt cada uno). */
  humanity: number;
  /** Círculos de Voluntad permanente extra (1 pt cada uno). */
  willpower: number;
}

export interface WizardState {
  step: number;
  concept: WizardConcept;
  attributes: WizardAttributes;
  abilities: WizardAbilities;
  disciplines: WizardDisciplinePick[];
  backgrounds: WizardBackgroundPick[];
  virtues: WizardVirtues;
  freebies: WizardFreebies;
  /** Pertenencias narrativas (markdown). Campo libre del paso "Equipo". */
  equipmentNotes: string;
  /** Notas finales del personaje (markdown). Campo libre del paso "Notas". */
  notes: string;
  /** Armas elegidas en el paso "Equipo" (catálogo). */
  weapons: { weaponId: string }[];
  /** Armaduras elegidas en el paso "Equipo" (catálogo). */
  armors: { armorId: string }[];
}

export const ALL_ABILITY_NAMES = [...TALENTS, ...SKILLS, ...KNOWLEDGES];

export function abilityCategoryOf(name: string): AbilityCategory {
  if (TALENTS.includes(name)) return "talents";
  if (SKILLS.includes(name)) return "skills";
  return "knowledges";
}

export function emptyWizardState(): WizardState {
  return {
    step: 0,
    concept: {
      name: "",
      concept: "",
      clanId: null,
      natureId: null,
      demeanorId: null,
      generation: 13,
      avatarFile: null,
      avatarPreviewUrl: null,
    },
    attributes: {
      priority: { physical: null, social: null, mental: null },
      values: {
        strength: 1,
        dexterity: 1,
        stamina: 1,
        charisma: 1,
        manipulation: 1,
        appearance: 1,
        perception: 1,
        intelligence: 1,
        wits: 1,
      },
    },
    abilities: {
      priority: { talents: null, skills: null, knowledges: null },
      values: Object.fromEntries(ALL_ABILITY_NAMES.map((n) => [n, 0])),
    },
    disciplines: [],
    backgrounds: [],
    virtues: { conscience: 1, selfControl: 1, courage: 1 },
    freebies: {
      attributes: {},
      abilities: {},
      disciplines: {},
      backgrounds: {},
      virtues: {},
      humanity: 0,
      willpower: 0,
    },
    equipmentNotes: "",
    notes: "",
    weapons: [],
    armors: [],
  };
}

// ── Helpers de pool ─────────────────────────────────────────────────────

export const PHYSICAL_KEYS: AttributeKey[] = ["strength", "dexterity", "stamina"];
export const SOCIAL_KEYS: AttributeKey[] = ["charisma", "manipulation", "appearance"];
export const MENTAL_KEYS: AttributeKey[] = ["perception", "intelligence", "wits"];

export const ATTRIBUTE_KEYS_BY_CATEGORY: Record<AttributeCategory, AttributeKey[]> = {
  physical: PHYSICAL_KEYS,
  social: SOCIAL_KEYS,
  mental: MENTAL_KEYS,
};

export const ABILITY_NAMES_BY_CATEGORY: Record<AbilityCategory, string[]> = {
  talents: TALENTS,
  skills: SKILLS,
  knowledges: KNOWLEDGES,
};

export function attributeCategoryPool(
  state: WizardState,
  category: AttributeCategory,
): { spent: number; total: number; remaining: number } {
  const prio = state.attributes.priority[category];
  const total = prio ? ATTRIBUTE_POOL_BY_PRIORITY[prio] : 0;
  const keys = ATTRIBUTE_KEYS_BY_CATEGORY[category];
  const spent = keys.reduce((acc, k) => acc + (state.attributes.values[k] - 1), 0);
  return { spent, total, remaining: total - spent };
}

export function abilityCategoryPool(
  state: WizardState,
  category: AbilityCategory,
): { spent: number; total: number; remaining: number } {
  const prio = state.abilities.priority[category];
  const total = prio ? ABILITY_POOL_BY_PRIORITY[prio] : 0;
  const names = ABILITY_NAMES_BY_CATEGORY[category];
  const spent = names.reduce((acc, n) => acc + (state.abilities.values[n] ?? 0), 0);
  return { spent, total, remaining: total - spent };
}

/**
 * Calcula el coste de una pick de disciplina en puntos del pool.
 *
 * - Monolíticas: el coste es el `level` plano.
 * - Ramificadas (Taumaturgia, Nigromancia): **cada nivel de cada senda
 *   cuenta como un punto del pool**. Subir la primaria de 0 a 1 cuesta
 *   1 punto (no es regalo). El primer punto se aplica automáticamente
 *   al primer nivel de la senda primaria.
 */
export function disciplinePickCost(d: WizardDisciplinePick): number {
  if (d.paths && d.paths.length > 0) {
    return d.paths.reduce((acc, p) => acc + p.level, 0);
  }
  return d.level;
}

export function disciplinePoolStatus(state: WizardState) {
  const spent = state.disciplines.reduce(
    (acc, d) => acc + disciplinePickCost(d),
    0,
  );
  return { spent, total: DISCIPLINE_POINTS, remaining: DISCIPLINE_POINTS - spent };
}

/**
 * Key canónica del trasfondo Generación. El catálogo lo expone como
 * `generacion` (sin tilde) en español; aceptamos también `generation`
 * por si el seed cambia. `isGenerationBackgroundKey` centraliza la
 * verificación para no repetir literales mágicos.
 */
export const GENERATION_BACKGROUND_KEYS = ["generacion", "generation"] as const;

export function isGenerationBackgroundKey(key: string): boolean {
  return (GENERATION_BACKGROUND_KEYS as readonly string[]).includes(key);
}

/**
 * Calcula la generación final del personaje. Todos arrancan en 13ª.
 * Cada punto invertido en el trasfondo «Generación» (paso 4b) o en
 * freebies sobre ese mismo trasfondo baja un escalón (12ª, 11ª, …),
 * con un piso V20 de 4ª.
 */
export function derivedGeneration(state: WizardState): number {
  const fromBackground = state.backgrounds
    .filter((b) => isGenerationBackgroundKey(b.key))
    .reduce((acc, b) => acc + b.level, 0);
  const fromFreebies = (Object.entries(state.freebies.backgrounds) as [string, number][])
    .filter(([key]) => isGenerationBackgroundKey(key))
    .reduce((acc, [, value]) => acc + value, 0);
  const totalLevels = fromBackground + fromFreebies;
  // Sin compras → 13ª. 5 niveles → 8ª. Capamos en 4ª (5+4 niveles más allá
  // serían imposibles dado el pool de freebies, pero curamos por si acaso).
  return Math.max(4, 13 - totalLevels);
}

export function backgroundPoolStatus(state: WizardState) {
  // La generación ya no consume puntos automáticamente: si el jugador
  // quiere bajarla, mete puntos al trasfondo Generación como cualquier
  // otro trasfondo. Todo el pool de 5 puntos es manual.
  const spent = state.backgrounds.reduce((acc, b) => acc + b.level, 0);
  return {
    spent,
    total: BACKGROUND_POINTS,
    remaining: BACKGROUND_POINTS - spent,
  };
}

export function virtuePoolStatus(state: WizardState) {
  const spent =
    (state.virtues.conscience - VIRTUE_BASE) +
    (state.virtues.selfControl - VIRTUE_BASE) +
    (state.virtues.courage - VIRTUE_BASE);
  return { spent, total: VIRTUE_POINTS, remaining: VIRTUE_POINTS - spent };
}

// ── Freebies ────────────────────────────────────────────────────────────

export function freebieSpent(state: WizardState): number {
  const { freebies } = state;
  let total = 0;
  total += sumRecord(freebies.attributes) * FREEBIE_COST.attribute;
  total += sumRecord(freebies.abilities) * FREEBIE_COST.ability;
  total += sumRecord(freebies.disciplines) * FREEBIE_COST.discipline;
  total += sumRecord(freebies.backgrounds) * FREEBIE_COST.background;
  total += sumRecord(freebies.virtues) * FREEBIE_COST.virtue;
  total += freebies.humanity * FREEBIE_COST.humanity;
  total += freebies.willpower * FREEBIE_COST.willpower;
  return total;
}

export function freebiePoolStatus(state: WizardState) {
  const spent = freebieSpent(state);
  return { spent, total: FREEBIE_POINTS, remaining: FREEBIE_POINTS - spent };
}

function sumRecord<K extends string>(rec: Partial<Record<K, number>>): number {
  let total = 0;
  for (const v of Object.values(rec) as (number | undefined)[]) {
    total += v ?? 0;
  }
  return total;
}

// ── Validación por paso ─────────────────────────────────────────────────

export function canAdvance(state: WizardState, step: number): boolean {
  switch (step) {
    case 0:
      return canAdvanceConcept(state);
    case 1:
      return canAdvanceAttributes(state);
    case 2:
      return canAdvanceAbilities(state);
    case 3:
      return canAdvanceDisciplines(state);
    case 4:
      return canAdvanceBackgrounds(state);
    case 5:
      return canAdvanceVirtues(state);
    case 6:
      return true; // Toques finales es read-only.
    case 7:
      return canFinishFreebies(state);
    case 8:
      return true; // Equipo: campo libre opcional.
    case 9:
      return true; // Notas: campo libre opcional. Cierra el wizard.
    default:
      return false;
  }
}

export function canAdvanceConcept(state: WizardState): boolean {
  const c = state.concept;
  if (!c.name.trim()) return false;
  if (!c.concept.trim()) return false;
  if (!c.clanId) return false;
  if (!c.natureId) return false;
  if (!c.demeanorId) return false;
  if (!Number.isFinite(c.generation)) return false;
  if (c.generation < 4 || c.generation > 15) return false;
  return true;
}

export function canAdvanceAttributes(state: WizardState): boolean {
  // Cada categoría debe tener prioridad asignada (sin repetir).
  const prios = Object.values(state.attributes.priority);
  if (prios.some((p) => p == null)) return false;
  if (new Set(prios).size !== 3) return false;
  // Cada pool debe estar exactamente gastado.
  return (["physical", "social", "mental"] as AttributeCategory[]).every((cat) => {
    const { remaining } = attributeCategoryPool(state, cat);
    return remaining === 0;
  });
}

export function canAdvanceAbilities(state: WizardState): boolean {
  const prios = Object.values(state.abilities.priority);
  if (prios.some((p) => p == null)) return false;
  if (new Set(prios).size !== 3) return false;
  // Tope de 3 por habilidad durante creación.
  const overCap = Object.values(state.abilities.values).some(
    (v) => v > CREATION_ABILITY_MAX,
  );
  if (overCap) return false;
  return (["talents", "skills", "knowledges"] as AbilityCategory[]).every((cat) => {
    const { remaining } = abilityCategoryPool(state, cat);
    return remaining === 0;
  });
}

/**
 * Reglas V20 para disciplinas ramificadas (Taumaturgia, Nigromancia):
 *
 * **Comunes**:
 * - Cada senda entre 1 y 3 niveles (tope de creación, igual que las
 *   disciplinas monolíticas).
 * - Exactamente una senda marcada como primaria.
 * - **Las secundarias deben ser estrictamente menores que la primaria**
 *   hasta que la primaria llegue a 5 (no aplicable en creación, máx 3).
 *
 * **Específicas de Nigromancia**:
 * - La senda primaria debe ser la **Senda del Sepulcro** (la fija el
 *   wizard al añadir la disciplina; el jugador no puede cambiarla).
 * - Para añadir una **segunda senda** (Osario o Cenizas) la primaria
 *   debe estar al menos a nivel 3 — regla canon del manual.
 * - Para añadir una **tercera senda** la primaria debe estar a 5,
 *   imposible en creación (tope 3). Por tanto en creación una
 *   Nigromancia puede tener máximo **2 sendas**.
 *
 * Las validaciones se delegan a `validateDisciplinePicks` que recibe el
 * catálogo (para conocer las keys de las sendas) y devuelve issues
 * legibles. `canAdvanceDisciplines` se queda con el pool y delega.
 */
export function canAdvanceDisciplines(state: WizardState): boolean {
  const { remaining } = disciplinePoolStatus(state);
  if (remaining !== 0) return false;
  for (const d of state.disciplines) {
    if (d.paths && d.paths.length > 0) {
      for (const p of d.paths) {
        if (p.level < 1 || p.level > 3) return false;
      }
      const primaries = d.paths.filter((p) => p.isPrimary);
      if (primaries.length !== 1) return false;
      const primaryLevel = primaries[0].level;
      // En creación no permitimos que la primaria sea menor o igual que
      // ninguna secundaria. Esta regla canon V20 garantiza que la
      // primaria siempre sea estrictamente mayor (al menos un círculo).
      for (const p of d.paths) {
        if (!p.isPrimary && p.level >= primaryLevel) return false;
      }
      // Si la disciplina es Nigromancia y tiene más de 1 senda, la
      // primaria debe estar al menos a 3 para admitir una secundaria.
      // No tenemos acceso aquí al catálogo (necesario para verificar que
      // la primaria es Sepulcro), así que la validación cruzada con el
      // catálogo vive en el step UI y en `validateDisciplinePicks`.
      const secondaries = d.paths.filter((p) => !p.isPrimary);
      if (secondaries.length > 0 && primaryLevel < 3) {
        return false;
      }
    } else if (d.level < 1 || d.level > 3) {
      return false;
    }
  }
  return true;
}

export function canAdvanceBackgrounds(state: WizardState): boolean {
  const { remaining } = backgroundPoolStatus(state);
  if (remaining !== 0) return false;
  return state.backgrounds.every((b) => b.level >= 1 && b.level <= 5);
}

export function canAdvanceVirtues(state: WizardState): boolean {
  const { remaining } = virtuePoolStatus(state);
  if (remaining !== 0) return false;
  return (
    state.virtues.conscience <= VIRTUE_MAX &&
    state.virtues.selfControl <= VIRTUE_MAX &&
    state.virtues.courage <= VIRTUE_MAX
  );
}

export function canFinishFreebies(state: WizardState): boolean {
  const { remaining } = freebiePoolStatus(state);
  if (remaining !== 0) return false;
  return true;
}

/**
 * Lista de razones por las que el paso actual aún no puede avanzar.
 * El wizard la muestra como banner cuando el usuario intenta hacer
 * "Siguiente" sin completar el paso. Devuelve `[]` si el paso es válido.
 */
export function validationIssues(state: WizardState, step: number): string[] {
  switch (step) {
    case 0:
      return conceptIssues(state);
    case 1:
      return attributesIssues(state);
    case 2:
      return abilitiesIssues(state);
    case 3:
      return disciplinesIssues(state);
    case 4:
      return backgroundsIssues(state);
    case 5:
      return virtuesIssues(state);
    case 6:
      return [];
    case 7:
      return freebiesIssues(state);
    case 8:
      return [];
    case 9:
      return [];
    default:
      return [];
  }
}

function conceptIssues(state: WizardState): string[] {
  const issues: string[] = [];
  const c = state.concept;
  if (!c.name.trim()) issues.push("Falta el nombre del personaje.");
  if (!c.concept.trim()) issues.push("Falta una frase de concepto.");
  if (!c.clanId) issues.push("Selecciona un clan.");
  if (!c.natureId) issues.push("Selecciona una Naturaleza.");
  if (!c.demeanorId) issues.push("Selecciona una Conducta.");
  if (!Number.isFinite(c.generation) || c.generation < 4 || c.generation > 15) {
    issues.push("Generación fuera de rango.");
  }
  return issues;
}

const CATEGORY_LABEL_ATTR: Record<AttributeCategory, string> = {
  physical: "Físicos",
  social: "Sociales",
  mental: "Mentales",
};

const CATEGORY_LABEL_ABI: Record<AbilityCategory, string> = {
  talents: "Talentos",
  skills: "Técnicas",
  knowledges: "Conocimientos",
};

function attributesIssues(state: WizardState): string[] {
  const issues: string[] = [];
  const prios = Object.values(state.attributes.priority);
  const missing = prios.filter((p) => p == null).length;
  const unique = new Set(prios.filter((p) => p != null)).size;
  if (missing > 0) {
    issues.push("Asigna prioridad 7 / 5 / 3 a las tres categorías.");
  } else if (unique !== 3) {
    issues.push("Cada prioridad (7, 5, 3) debe usarse una sola vez.");
  }
  for (const cat of ["physical", "social", "mental"] as AttributeCategory[]) {
    if (!state.attributes.priority[cat]) continue;
    const { remaining } = attributeCategoryPool(state, cat);
    if (remaining > 0) {
      issues.push(
        `Te faltan ${remaining} ${pluralPts(remaining)} en ${CATEGORY_LABEL_ATTR[cat]}.`,
      );
    } else if (remaining < 0) {
      issues.push(
        `Te sobran ${-remaining} ${pluralPts(-remaining)} en ${CATEGORY_LABEL_ATTR[cat]}.`,
      );
    }
  }
  return issues;
}

function abilitiesIssues(state: WizardState): string[] {
  const issues: string[] = [];
  const prios = Object.values(state.abilities.priority);
  const missing = prios.filter((p) => p == null).length;
  const unique = new Set(prios.filter((p) => p != null)).size;
  if (missing > 0) {
    issues.push("Asigna prioridad 13 / 9 / 5 a las tres categorías.");
  } else if (unique !== 3) {
    issues.push("Cada prioridad (13, 9, 5) debe usarse una sola vez.");
  }
  const overCap = Object.entries(state.abilities.values).filter(
    ([, v]) => v > CREATION_ABILITY_MAX,
  );
  if (overCap.length > 0) {
    issues.push(
      `Ninguna habilidad puede superar ${CREATION_ABILITY_MAX} en creación (revisa: ${overCap.map(([n]) => n).join(", ")}).`,
    );
  }
  for (const cat of ["talents", "skills", "knowledges"] as AbilityCategory[]) {
    if (!state.abilities.priority[cat]) continue;
    const { remaining } = abilityCategoryPool(state, cat);
    if (remaining > 0) {
      issues.push(
        `Te faltan ${remaining} ${pluralPts(remaining)} en ${CATEGORY_LABEL_ABI[cat]}.`,
      );
    } else if (remaining < 0) {
      issues.push(
        `Te sobran ${-remaining} ${pluralPts(-remaining)} en ${CATEGORY_LABEL_ABI[cat]}.`,
      );
    }
  }
  return issues;
}

function disciplinesIssues(state: WizardState): string[] {
  const issues: string[] = [];
  const { remaining } = disciplinePoolStatus(state);
  if (remaining > 0) {
    issues.push(`Te faltan ${remaining} ${pluralPts(remaining)} de disciplina por repartir.`);
  } else if (remaining < 0) {
    issues.push(`Te sobran ${-remaining} ${pluralPts(-remaining)} de disciplina.`);
  }
  const overCap = state.disciplines.filter((d) => d.level > 3);
  if (overCap.length > 0) {
    issues.push("Ninguna disciplina puede superar 3 en creación.");
  }
  // Reglas específicas de sendas (Taumaturgia, Nigromancia).
  for (const d of state.disciplines) {
    if (!d.paths || d.paths.length === 0) continue;
    const primaries = d.paths.filter((p) => p.isPrimary);
    if (primaries.length === 0) {
      issues.push("Cada disciplina con sendas necesita una senda primaria.");
      continue;
    }
    if (primaries.length > 1) {
      issues.push("Solo puede haber una senda primaria por disciplina.");
    }
    const primaryLevel = primaries[0].level;
    const secs = d.paths.filter((p) => !p.isPrimary);
    const breakingRule = secs.find((p) => p.level >= primaryLevel);
    if (breakingRule) {
      issues.push(
        "Las sendas secundarias deben quedar al menos un círculo por debajo de la primaria.",
      );
    }
    if (secs.length > 0 && primaryLevel < 3) {
      issues.push(
        "Para añadir una segunda senda, la senda primaria debe estar al menos a 3.",
      );
    }
  }
  return issues;
}

function backgroundsIssues(state: WizardState): string[] {
  const issues: string[] = [];
  const { remaining } = backgroundPoolStatus(state);
  if (remaining > 0) {
    issues.push(
      `Te faltan ${remaining} ${pluralPts(remaining)} de trasfondo por repartir.`,
    );
  } else if (remaining < 0) {
    issues.push(
      `Te sobran ${-remaining} ${pluralPts(-remaining)} de trasfondo.`,
    );
  }
  const outOfRange = state.backgrounds.filter((b) => b.level < 1 || b.level > 5);
  if (outOfRange.length > 0) {
    issues.push("Cada trasfondo debe estar entre 1 y 5.");
  }
  return issues;
}

function virtuesIssues(state: WizardState): string[] {
  const issues: string[] = [];
  const { remaining } = virtuePoolStatus(state);
  if (remaining > 0) {
    issues.push(`Te faltan ${remaining} ${pluralPts(remaining)} de virtud por repartir.`);
  } else if (remaining < 0) {
    issues.push(`Te sobran ${-remaining} ${pluralPts(-remaining)} de virtud.`);
  }
  if (state.virtues.conscience > VIRTUE_MAX)
    issues.push(`Conciencia no puede superar ${VIRTUE_MAX}.`);
  if (state.virtues.selfControl > VIRTUE_MAX)
    issues.push(`Autocontrol no puede superar ${VIRTUE_MAX}.`);
  if (state.virtues.courage > VIRTUE_MAX)
    issues.push(`Coraje no puede superar ${VIRTUE_MAX}.`);
  return issues;
}

function freebiesIssues(state: WizardState): string[] {
  const issues: string[] = [];
  const { remaining } = freebiePoolStatus(state);
  if (remaining > 0) {
    issues.push(`Aún te quedan ${remaining} ${pluralPts(remaining)} gratuitos sin gastar.`);
  } else if (remaining < 0) {
    issues.push(`Te has pasado por ${-remaining} ${pluralPts(-remaining)}; baja algo antes de terminar.`);
  }
  return issues;
}

function pluralPts(n: number): string {
  return n === 1 ? "punto" : "puntos";
}

export const WIZARD_STEPS = [
  { id: "concept", title: "Concepto", short: "1" },
  { id: "attributes", title: "Atributos", short: "2" },
  { id: "abilities", title: "Habilidades", short: "3" },
  { id: "disciplines", title: "Disciplinas", short: "4a" },
  { id: "backgrounds", title: "Trasfondos", short: "4b" },
  { id: "virtues", title: "Virtudes", short: "4c" },
  { id: "finishing", title: "Toques finales", short: "5" },
  { id: "freebies", title: "Puntos gratuitos", short: "6" },
  { id: "equipment", title: "Equipo", short: "7" },
  { id: "notes", title: "Notas", short: "8" },
] as const;

export const WIZARD_STEP_COUNT = WIZARD_STEPS.length;
