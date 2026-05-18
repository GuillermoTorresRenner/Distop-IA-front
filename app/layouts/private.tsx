import { Outlet, data, redirect, useLoaderData } from "react-router";
import { Navbar } from "~/components/common/navbar";
import { useHydrateUser } from "~/hooks/use-hydrate-user";
import { buildSetCookieHeaders, getAuthSession } from "~/lib/api/auth/auth.server";
import { createServerClient } from "~/lib/api/client";
import type { MyInvitation } from "~/lib/api/chronicles/chronicles.types";
import type { User } from "~/lib/api/users/users.types";

interface PrivateLoaderData {
  user: User;
  invitationCount: number;
}

export async function loader({ request }: { request: Request }) {
  const { user, setCookieHeader } = await getAuthSession(request);
  if (!user) {
    throw redirect("/login");
  }

  let invitationCount = 0;
  try {
    const client = createServerClient(request.headers.get("cookie"));
    const resp = await client.get<MyInvitation[]>("/invitations");
    if (resp.status === 200 && Array.isArray(resp.data)) {
      invitationCount = resp.data.length;
    }
  } catch {
    // tolerate
  }

  const headers = buildSetCookieHeaders(setCookieHeader);
  const payload: PrivateLoaderData = { user, invitationCount };
  return headers ? data<PrivateLoaderData>(payload, { headers }) : payload;
}

export default function PrivateLayout() {
  const { user, invitationCount } = useLoaderData() as PrivateLoaderData;
  useHydrateUser(user);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Navbar user={user} invitationCount={invitationCount} />
      {/* Viewport unificado: 90vw útil (padding 5vw a cada lado) en todos
          los anchos. En mobile (<sm) se relaja a `px-3` para no comprimir
          demasiado el contenido. */}
      <main className="w-full flex-1 px-3 py-4 sm:py-8 sm:px-[5vw]">
        <Outlet />
      </main>
    </div>
  );
}
