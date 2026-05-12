import { useEffect } from "react";
import type { User } from "~/lib/api/users/users.types";
import { useUserStore } from "~/stores/user.store";

export function useHydrateUser(user: User | null) {
  useEffect(() => {
    useUserStore.getState().hydrate(user);
  }, [user]);
}
