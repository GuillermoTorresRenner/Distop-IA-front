import { create } from "zustand";
import type { User } from "~/lib/api/users/users.types";

export type AuthStatus = "idle" | "authenticated" | "unauthenticated";

interface UserState {
  user: User | null;
  status: AuthStatus;
  setUser: (user: User) => void;
  hydrate: (user: User | null) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  status: "idle",
  setUser: (user) => set({ user, status: "authenticated" }),
  hydrate: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
    }),
  clear: () => set({ user: null, status: "unauthenticated" }),
}));
