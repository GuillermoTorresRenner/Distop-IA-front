import {
  BookOpenText,
  Dice5,
  Home,
  Mail,
  ScrollText,
  Skull,
  Users,
  Zap,
} from "lucide-react";
import { NavLink } from "react-router";
import type { User } from "~/lib/api/users/users.types";
import { cn } from "~/lib/utils";
import { UserMenu } from "./user-menu";

interface NavbarProps {
  user: User;
  invitationCount?: number;
}

interface NavTab {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}

const tabs: NavTab[] = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/characters", label: "Mis personajes", icon: Skull },
  { to: "/chronicles", label: "Crónicas", icon: BookOpenText },
  { to: "/social", label: "Social", icon: Users },
  { to: "/journal", label: "Bitácora", icon: ScrollText },
  { to: "/table", label: "Mesa Virtual", icon: Dice5 },
];

export function Navbar({ user, invitationCount = 0 }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full">
      <div className="relative h-14 bg-gradient-to-b from-[#5c0a14] to-[#2a0508] shadow-[0_4px_24px_rgba(160,18,28,0.35)]">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <div className="w-32" />
          <NavLink
            to="/"
            className="font-heading text-2xl uppercase tracking-[0.38em] text-white/95 drop-shadow-[0_0_18px_rgba(255,80,80,0.55)]"
          >
            Distop-IA
          </NavLink>
          <div className="flex w-32 items-center justify-end gap-2">
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative inline-flex size-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
            >
              <Zap className="size-4" />
            </button>
            <NavLink
              to="/invitations"
              aria-label="Invitaciones"
              className="relative inline-flex size-8 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
            >
              <Mail className="size-4" />
              {invitationCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
                  {invitationCount}
                </span>
              ) : null}
            </NavLink>
            <UserMenu user={user} />
          </div>
        </div>
      </div>

      <nav className="border-b border-border/70 bg-[#0a0608]">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 text-sm">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "group inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 font-heading text-[0.78rem] uppercase tracking-[0.22em] text-white/65 transition hover:text-white",
                    isActive && "border-blood text-white",
                  )
                }
              >
                <tab.icon className="size-4 opacity-80 group-hover:opacity-100" />
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
