export interface Archetype {
  id: string;
  name: string;
  description: string | null;
  order: number;
}

export interface DisciplinePower {
  id: string;
  disciplineId: string;
  level: number;
  name: string;
  description: string | null;
}

export interface Discipline {
  id: string;
  name: string;
  description: string | null;
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
  order: number;
}

export interface Clan {
  id: string;
  name: string;
  sect: string | null;
  description: string | null;
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
  order: number;
  system: boolean;
  userId: string | null;
}
