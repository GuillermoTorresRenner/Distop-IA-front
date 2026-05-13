import { apiClient } from "~/lib/api/client";
import type {
  Archetype,
  Armor,
  Clan,
  Discipline,
  MeritFlaw,
  Weapon,
  WeaponCategory,
  WeaponDamageBase,
  WeaponKind,
} from "./catalog.types";

export async function listArchetypes(): Promise<Archetype[]> {
  const { data } = await apiClient.get<Archetype[]>("/catalog/archetypes");
  return data;
}

export async function listDisciplines(): Promise<Discipline[]> {
  const { data } = await apiClient.get<Discipline[]>("/catalog/disciplines");
  return data;
}

export async function listMeritsFlaws(): Promise<MeritFlaw[]> {
  const { data } = await apiClient.get<MeritFlaw[]>("/catalog/merits-flaws");
  return data;
}

export async function listClans(): Promise<Clan[]> {
  const { data } = await apiClient.get<Clan[]>("/catalog/clans");
  return data;
}

export async function listWeaponCategories(): Promise<WeaponCategory[]> {
  const { data } = await apiClient.get<WeaponCategory[]>(
    "/catalog/weapon-categories",
  );
  return data;
}

export async function listWeapons(): Promise<Weapon[]> {
  const { data } = await apiClient.get<Weapon[]>("/catalog/weapons");
  return data;
}

export interface WeaponInput {
  name: string;
  kind: WeaponKind;
  categoryId: string;
  damageBase: WeaponDamageBase;
  damageBonus: number;
  lethal?: boolean;
  aggravated?: boolean;
  bluntPlus?: boolean;
  range?: number;
  rate?: string;
  magazine?: number;
  concealment?: string;
  notes?: string;
}

export async function createWeapon(input: WeaponInput): Promise<Weapon> {
  const { data } = await apiClient.post<Weapon>("/catalog/weapons", input);
  return data;
}

export async function updateWeapon(
  id: string,
  input: Partial<WeaponInput>,
): Promise<Weapon> {
  const { data } = await apiClient.patch<Weapon>(`/catalog/weapons/${id}`, input);
  return data;
}

export async function deleteWeapon(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/catalog/weapons/${id}`,
  );
  return data;
}

export async function listArmors(): Promise<Armor[]> {
  const { data } = await apiClient.get<Armor[]>("/catalog/armors");
  return data;
}

export interface ArmorInput {
  name: string;
  rating: number;
  penalty: number;
  description?: string;
}

export async function createArmor(input: ArmorInput): Promise<Armor> {
  const { data } = await apiClient.post<Armor>("/catalog/armors", input);
  return data;
}

export async function updateArmor(
  id: string,
  input: Partial<ArmorInput>,
): Promise<Armor> {
  const { data } = await apiClient.patch<Armor>(`/catalog/armors/${id}`, input);
  return data;
}

export async function deleteArmor(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/catalog/armors/${id}`,
  );
  return data;
}
