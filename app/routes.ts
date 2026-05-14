import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  layout("layouts/public.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("password-recovery", "routes/auth/password-recovery.tsx"),
  ]),
  layout("layouts/private.tsx", [
    index("routes/home.tsx"),
    route("profile", "routes/profile.tsx"),
    route("characters", "routes/characters.tsx"),
    route("characters/new", "routes/characters/new.tsx"),
    route("characters/:id", "routes/characters/detail.tsx"),
    route("chronicles", "routes/chronicles/list.tsx"),
    route("chronicles/new", "routes/chronicles/new.tsx"),
    route("chronicles/:id", "routes/chronicles/detail.tsx"),
    route("chronicles/:id/journal", "routes/chronicles/journal.tsx"),
    route("chronicles/:id/table", "routes/chronicles/table.tsx"),
    route("invitations", "routes/invitations/list.tsx"),
    route("invitations/:token", "routes/invitations/accept.tsx"),
    route("social", "routes/social.tsx"),
    route("journal", "routes/journal.tsx"),
    route("table", "routes/table.tsx"),
  ]),
] satisfies RouteConfig;
