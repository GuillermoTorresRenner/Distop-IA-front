import type { AxiosInstance } from "axios";
import { apiClient } from "~/lib/api/client";
import type {
  AdminOverviewStats,
  OnlineSnapshot,
  TimeSeriesPoint,
} from "./admin.types";

/**
 * API admin. Todas las llamadas exigen sesión con `user.isAdmin === true`
 * (backend valida con `AdminGuard`).
 *
 * Cada función acepta un `client?` opcional para uso desde loaders SSR
 * (vía `createServerClient(cookie)`); si se omite cae al `apiClient` browser.
 */

export async function getAdminOverview(
  client: AxiosInstance = apiClient,
): Promise<AdminOverviewStats> {
  const { data } = await client.get<AdminOverviewStats>("/admin/stats");
  return data;
}

export async function getRegistrationsSeries(
  days = 30,
  client: AxiosInstance = apiClient,
): Promise<TimeSeriesPoint[]> {
  const { data } = await client.get<TimeSeriesPoint[]>(
    "/admin/stats/registrations",
    { params: { days } },
  );
  return data;
}

export async function getDiceRollsSeries(
  days = 30,
  client: AxiosInstance = apiClient,
): Promise<TimeSeriesPoint[]> {
  const { data } = await client.get<TimeSeriesPoint[]>(
    "/admin/stats/dice-rolls",
    { params: { days } },
  );
  return data;
}

export async function getOnlineSnapshot(
  client: AxiosInstance = apiClient,
): Promise<OnlineSnapshot> {
  const { data } = await client.get<OnlineSnapshot>("/admin/stats/online");
  return data;
}
