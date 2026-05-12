import { createServerClient } from "~/lib/api/client";
import type { User } from "~/lib/api/users/users.types";
import type { AuthEnvelope } from "./auth.types";

export interface ServerAuthSession {
  user: User | null;
  setCookieHeader: string[] | null;
}

function pickSetCookie(headers: unknown): string[] | null {
  if (!headers) return null;
  const anyHeaders = headers as Record<string, unknown>;
  const raw = anyHeaders["set-cookie"] ?? anyHeaders["Set-Cookie"];
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as string[];
  return [String(raw)];
}

export async function getAuthSession(request: Request): Promise<ServerAuthSession> {
  const incomingCookie = request.headers.get("cookie");
  const client = createServerClient(incomingCookie);

  const meResp = await client.get<User>("/auth/me");
  if (meResp.status === 200) {
    return { user: meResp.data, setCookieHeader: null };
  }
  if (meResp.status !== 401) {
    return { user: null, setCookieHeader: null };
  }

  const refreshResp = await client.post<AuthEnvelope>("/auth/refresh");
  if (refreshResp.status !== 200 && refreshResp.status !== 201) {
    return { user: null, setCookieHeader: null };
  }

  const setCookieHeader = pickSetCookie(refreshResp.headers);
  if (!setCookieHeader) {
    return { user: refreshResp.data?.user ?? null, setCookieHeader: null };
  }

  const mergedCookie = setCookieHeader
    .map((c) => c.split(";")[0])
    .join("; ");
  const next = createServerClient(
    incomingCookie ? `${incomingCookie}; ${mergedCookie}` : mergedCookie
  );
  const meRetry = await next.get<User>("/auth/me");
  if (meRetry.status !== 200) {
    return { user: refreshResp.data?.user ?? null, setCookieHeader };
  }
  return { user: meRetry.data, setCookieHeader };
}

export function buildSetCookieHeaders(setCookies: string[] | null | undefined): Headers | undefined {
  if (!setCookies || setCookies.length === 0) return undefined;
  const headers = new Headers();
  for (const c of setCookies) headers.append("Set-Cookie", c);
  return headers;
}
