import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const DEFAULT_API_URL = "http://localhost:3000/api";

export function getApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.API_URL) {
    return process.env.API_URL;
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  return DEFAULT_API_URL;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function flushQueue(error: unknown) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(null);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _skipAuthRefresh?: boolean;
    };
    const status = error?.response?.status;
    const url: string = original?.url ?? "";

    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/register") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    if (status !== 401 || original._retry || isAuthRoute || original._skipAuthRefresh) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then(() => {
          original._retry = true;
          return apiClient(original);
        })
        .catch((err) => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      await apiClient.post("/auth/refresh");
      flushQueue(null);
      return apiClient(original);
    } catch (refreshError) {
      flushQueue(refreshError);
      if (typeof window !== "undefined") {
        const { useUserStore } = await import("~/stores/user.store");
        useUserStore.getState().clear();
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export function createServerClient(cookieHeader: string | null | undefined): AxiosInstance {
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    validateStatus: () => true,
  });
  return instance;
}
