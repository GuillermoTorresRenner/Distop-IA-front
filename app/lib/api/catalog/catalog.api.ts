import { apiClient } from "~/lib/api/client";
import type { Archetype, Clan, Discipline, MeritFlaw } from "./catalog.types";

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
