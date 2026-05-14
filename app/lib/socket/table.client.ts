/**
 * Cliente Socket.IO para la Mesa de Juego.
 *
 * IMPORTANTE: este módulo SOLO debe importarse desde código que corre en el
 * browser (componentes con hooks, efectos). NUNCA desde loaders/actions SSR.
 */
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./types";

export type TableSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * URL base del backend para websockets, derivada de VITE_API_URL.
 *
 * Caso típico en QA/prod (post-refactor de topología):
 *   VITE_API_URL = https://distopia-qa.guillermotorresdev.com/api
 *   → socket URL = https://distopia-qa.guillermotorresdev.com  (mismo origen)
 *   → namespace  = /table
 *   → path       = /socket.io  (default de socket.io)
 *
 * NPM debe tener una Custom Location `/socket.io` → backend-qa:3000 para
 * que el upgrade WebSocket llegue al back por red interna.
 *
 * En dev local:
 *   VITE_API_URL = http://localhost:3000/api
 *   → socket URL = http://localhost:3000
 */
function getSocketOrigin(): string {
  const apiUrl =
    (import.meta as unknown as { env?: Record<string, string | undefined> })
      .env?.VITE_API_URL ?? "http://localhost:3000/api";
  // Quita el sufijo "/api" si existe.
  try {
    const u = new URL(apiUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://localhost:3000";
  }
}

let singleton: TableSocket | null = null;

export function getTableSocket(): TableSocket {
  if (singleton && singleton.connected) return singleton;
  if (singleton) {
    singleton.connect();
    return singleton;
  }
  singleton = io(`${getSocketOrigin()}/table`, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  }) as TableSocket;
  return singleton;
}

export function disposeTableSocket() {
  if (singleton) {
    singleton.removeAllListeners();
    singleton.disconnect();
    singleton = null;
  }
}
