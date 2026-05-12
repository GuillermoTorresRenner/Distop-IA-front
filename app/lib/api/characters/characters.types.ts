import type {
  Archetype,
  Clan,
  Discipline,
  MeritFlaw,
} from "~/lib/api/catalog/catalog.types";

export type AbilityCategory = "TALENT" | "SKILL" | "KNOWLEDGE";
export type VirtueScheme = "HUMANITY" | "PATH";

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

export interface CharacterDiscipline {
  id?: string;
  disciplineId: string;
  level: number;
  discipline?: Discipline;
}

export interface CharacterMeritFlaw {
  id?: string;
  meritFlawId: string;
  notes?: string | null;
  meritFlaw?: MeritFlaw;
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

export interface Character {
  id: string;
  userId: string;
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

  abilities: CharacterAbility[];
  backgrounds: CharacterBackground[];
  disciplines: CharacterDiscipline[];
  meritsFlaws: CharacterMeritFlaw[];
  chronicles: ChronicleCharacterLink[];

  createdAt: string;
  updatedAt: string;
}

export interface CharacterInput {
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

  abilities?: CharacterAbility[];
  backgrounds?: CharacterBackground[];
  disciplines?: CharacterDiscipline[];
  meritsFlaws?: CharacterMeritFlaw[];
}
