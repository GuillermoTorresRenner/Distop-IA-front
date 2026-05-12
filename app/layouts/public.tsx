import { Outlet, redirect } from "react-router";
import { getAuthSession } from "~/lib/api/auth/auth.server";

export async function loader({ request }: { request: Request }) {
  const { user } = await getAuthSession(request);
  if (user) {
    throw redirect("/");
  }
  return null;
}

export default function PublicLayout() {
  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background bg-blood-gradient">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(80,10,15,0.18),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(180,30,30,0.22),transparent_70%)]"
      />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border/40 px-6 py-4 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Distop-IA · La Mascarada VTT
      </footer>
    </div>
  );
}
