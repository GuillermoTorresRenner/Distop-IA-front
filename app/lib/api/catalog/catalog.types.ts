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
