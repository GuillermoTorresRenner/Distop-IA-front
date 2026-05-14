import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { logout } from "~/lib/api/auth/auth.api";
import type { User } from "~/lib/api/users/users.types";
import { cn } from "~/lib/utils";
import { useUserStore } from "~/stores/user.store";

interface UserMenuProps {
  user: User;
}

function avatarUrl(user: User): string | null {
  if (!user.avatar) return null;
  if (user.avatar.startsWith("http")) return user.avatar;
  return user.avatar;
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const clearUser = useUserStore((s) => s.clear);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      clearUser();
      navigate("/login", { replace: true });
    }
  }

  const initials = (user.nickname || user.email).charAt(0).toUpperCase();
  const avatar = avatarUrl(user);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-1.5 py-1 pr-3 text-white/90 transition hover:bg-black/50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="relative flex size-7 items-center justify-center overflow-hidden rounded-full bg-blood text-xs font-semibold uppercase text-blood-foreground">
          {avatar ? (
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border border-black bg-emerald-500" />
        </span>
        <span className="hidden text-sm font-medium sm:inline">
          {user.nickname}
        </span>
        <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/60"
        >
          <div className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-heading uppercase tracking-widest text-[0.7rem]">
              {user.nickname}
            </p>
            <p className="mt-0.5 truncate ">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
          >
            <UserIcon className="size-4" />
            Mi santuario
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {loggingOut ? "Saliendo..." : "Salir"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export { Button };
