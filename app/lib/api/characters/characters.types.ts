import type {
  Archetype,
  Armor,
  Clan,
  Discipline,
  MeritFlaw,
  Weapon,
} from "~/lib/api/catalog/catalog.types";

export type AbilityCategory = "TALENT" | "SKILL" | "KNOWLEDGE";
export type VirtueScheme = "HUMANITY" | "PATH";
export type CharacterKind = "PC" | "NPC" | "ANTAGONIST";

export interface CharacterAbility {
  id?: string;
  category: AbilityCategory;
  name: string;
  value: number;
  specialty?: string | null;
}

export interface CharacterBackground {
  id?: string;
  name: string;
  level: number;
  notes?: string | null;
}

/**
 * Senda específica conocida por el personaje dentro de una disciplina
 * ramificada. Solo aplica si la disciplina tiene `hasPaths=true`.
 */
export interface CharacterDisciplinePathPick {
  id?: string;
  pathId: string;
  level: number;
  /** Marca esta senda como primaria del personaje. */
  isPrimary?: boolean;
}

export interface CharacterDiscipline {
  id?: string;
  disciplineId: string;
  level: number;
  discipline?: Discipline;
  /**
   * Sendas conocidas. Solo se llena cuando la disciplina tiene
   * `hasPaths=true`. Cuando viene del back, cada path incluye el
   * `path` con su catálogo embebido.
   */
  paths?: (CharacterDisciplinePathPick & { path?: import("~/lib/api/catalog/catalog.types").DisciplinePath })[];
  /** Lista de ids de rituales aprendidos en esta disciplina. */
  learnedRitualIds?: string[];
}

export interface CharacterMeritFlaw {
  id?: string;
  /**
   * Modo catálogo: id del MeritFlaw del catálogo seedeado. Mutuamente
   * excluyente con los campos `customX`.
   */
  meritFlawId?: string | null;
  /** Modo custom: nombre libre del mérito/defecto. */
  customName?: string | null;
  /** Modo custom: si es mérito o defecto. */
  customKind?: "MERIT" | "FLAW" | null;
  /** Modo custom: coste; positivo para méritos, negativo para defectos. */
  customValue?: number | null;
  /** Modo custom: categoría libre (Físico, Mental, Social, Sobrenatural). */
  customCategory?: string | null;
  notes?: string | null;
  meritFlaw?: MeritFlaw;
}

export interface CharacterWeapon {
  id?: string;
  weaponId: string;
  notes?: string | null;
  order?: number;
  weapon?: Weapon;
}

export interface CharacterArmor {
  id?: string;
  armorId: string;
  notes?: string | null;
  order?: number;
  armor?: Armor;
}

export interface ChronicleSummary {
  id: string;
  name: string;
  setting: string | null;
}

export interface ChronicleCharacterLink {
  id: string;
  chronicleId: string;
  joinedAt: string;
  chronicle: ChronicleSummary;
}

export interface CharacterOwner {
  id: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
}

export interface Character {
  id: string;
  userId: string;
  /**
   * Dueño del personaje (incluido en respuestas del backend). Útil para
   * mostrar el nickname en la hoja sin consultar al user store.
   */
  user?: CharacterOwner;
  kind: CharacterKind;
  name: string;
  concept: string | null;
  chronicleName: string | null;
  generation: number | null;
  haven: string | null;
  clanId: string | null;
  clan: Clan | null;
  natureId: string | null;
  nature: Archetype | null;
  demeanorId: string | null;
  demeanor: Archetype | null;

  strength: number;
  dexterity: number;
  stamina: number;
  charisma: number;
  manipulation: number;
  appearance: number;
  perception: number;
  intelligence: number;
  wits: number;

  virtueScheme: VirtueScheme;
  conscience: number;
  selfControl: number;
  courage: number;

  humanity: number;
  willpowerMax: number;
  willpowerCurrent: number;
  bloodPool: number;

  healthBruised: number;
  healthHurt: number;
  healthInjured: number;
  healthWounded: number;
  healthMauled: number;
  healthCrippled: number;
  healthIncapacitated: number;

  experience: number;

  notes: string | null;
  equipmentNotes: string | null;

  abilities: CharacterAbility[];
  backgrounds: CharacterBackground[];
  disciplines: CharacterDiscipline[];
  /**
   * Rituales aprendidos por el personaje, agrupados al nivel del
   * Character (no de CharacterDiscipline) porque la tabla del back
   * (`character_discipline_rituals`) está enlazada directamente al
   * personaje. La UI los re-agrupa por `disciplineId` para mostrar.
   */
  disciplineRituals?: {
    id: string;
    ritualId: string;
    disciplineId: string;
    ritual?: import("~/lib/api/catalog/catalog.types").DisciplineRitual;
  }[];
  meritsFlaws: CharacterMeritFlaw[];
  weapons: CharacterWeapon[];
  armors: CharacterArmor[];
  chronicles: ChronicleCharacterLink[];

  createdAt: string;
  updatedAt: string;
}

export interface CharacterInput {
  kind?: CharacterKind;
  name: string;
  concept?: string;
  chronicleName?: string;
  generation?: number;
  haven?: string;
  clanId?: string;
  natureId?: string;
  demeanorId?: string;

  strength?: number;
  dexterity?: number;
  stamina?: number;
  charisma?: number;
  manipulation?: number;
  appearance?: number;
  perception?: number;
  intelligence?: number;
  wits?: number;

  virtueScheme?: VirtueScheme;
  conscience?: number;
  selfControl?: number;
  courage?: number;

  humanity?: number;
  willpowerMax?: number;
  willpowerCurrent?: number;
  bloodPool?: number;

  healthBruised?: number;
  healthHurt?: number;
  healthInjured?: number;
  healthWounded?: number;
  healthMauled?: number;
  healthCrippled?: number;
  healthIncapacitated?: number;

  experience?: number;

  notes?: string;
  equipmentNotes?: string;

  abilities?: CharacterAbility[];
  backgrounds?: CharacterBackground[];
  disciplines?: CharacterDiscipline[];
  meritsFlaws?: CharacterMeritFlaw[];
  weapons?: CharacterWeapon[];
  armors?: CharacterArmor[];
}
