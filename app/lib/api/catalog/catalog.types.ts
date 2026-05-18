export interface Archetype {
  id: string;
  name: string;
  description: string | null;
  tooltip: string | null;
  order: number;
}

export type AttributeCategoryInfo = "PHYSICAL" | "SOCIAL" | "MENTAL";
export type AbilityCategoryInfo = "TALENT" | "SKILL" | "KNOWLEDGE";

export interface AttributeInfo {
  id: string;
  key: string;
  name: string;
  category: AttributeCategoryInfo;
  description: string | null;
  tooltip: string | null;
  order: number;
}

export interface AbilityInfo {
  id: string;
  key: string;
  name: string;
  category: AbilityCategoryInfo;
  description: string | null;
  tooltip: string | null;
  order: number;
}

export interface HealthLevelInfo {
  id: string;
  key: string;
  name: string;
  penalty: number;
  description: string | null;
  tooltip: string | null;
  order: number;
}

export interface DisciplinePower {
  id: string;
  disciplineId: string;
  level: number;
  name: string;
  description: string | null;
  /** Resumen corto para el tooltip. */
  summary?: string | null;
  /** Tooltip adicional para catálogo. */
  tooltip?: string | null;
  /** Sangre que cuesta activar. 0 = pasivo / gratuito. */
  bloodCost?: number;
  /** Clave del atributo en la tirada activa (formato Character). */
  rollAttribute?: string | null;
  /** Habilidad de la tirada activa (nombre canónico V20). */
  rollAbility?: string | null;
  /** Dificultad por defecto. Si null, el cliente asume 6. */
  rollDifficulty?: number | null;
}

export interface Discipline {
  id: string;
  name: string;
  description: string | null;
  tooltip: string | null;
  order: number;
  powers: DisciplinePower[];
}

export type MeritFlawKind = "MERIT" | "FLAW";

export interface MeritFlaw {
  id: string;
  name: string;
  kind: MeritFlawKind;
  value: number;
  category: string | null;
  description: string | null;
  tooltip: string | null;
  order: number;
}

/**
 * Trasfondo del catálogo V20. La lista cerrada que ofrece el dropdown en
 * la hoja de personaje. El jugador igualmente puede escribir un trasfondo
 * customizado (texto libre); en ese caso no hay vínculo con este catálogo.
 */
export interface Background {
  id: string;
  /** Slug interno en kebab-case (ej. "aliados"). */
  key: string;
  /** Nombre canónico (ej. "Aliados"). */
  name: string;
  /** Agrupador opcional para la UI (Social, Sobrenatural, Material). */
  category: string | null;
  description: string | null;
  tooltip: string | null;
  order: number;
}

export interface Clan {
  id: string;
  name: string;
  sect: string | null;
  description: string | null;
  tooltip: string | null;
  disciplines: string | null;
  weakness: string | null;
  order: number;
}

export type WeaponKind = "MELEE" | "RANGED";
export type WeaponDamageBase = "STRENGTH" | "FLAT";

export interface WeaponCategory {
  id: string;
  name: string;
  kind: WeaponKind;
  order: number;
}

export interface Weapon {
  id: string;
  name: string;
  kind: WeaponKind;
  categoryId: string;
  category?: WeaponCategory;
  damageBase: WeaponDamageBase;
  damageBonus: number;
  lethal: boolean;
  aggravated: boolean;
  bluntPlus: boolean;
  range: number | null;
  rate: string | null;
  magazine: number | null;
  concealment: string | null;
  description: string | null;
  tooltip: string | null;
  notes: string | null;
  order: number;
  system: boolean;
  userId: string | null;
}

export interface Armor {
  id: string;
  name: string;
  rating: number;
  penalty: number;
  description: string | null;
  tooltip: string | null;
  order: number;
  system: boolean;
  userId: string | null;
}

export interface Virtue {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tooltip: string | null;
  order: number;
}
