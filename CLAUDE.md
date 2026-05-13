# Distop-IA — Frontend (`front/`)

App **React Router 7** con SSR habilitado para el VTT de Vampiro la Mascarada. Frontend del monorepo Distop-IA; el backend NestJS vive en `back/` y expone API REST en `http://localhost:3000/api`.

## Comandos

```bash
npm install
npm run dev         # vite dev server :5173
npm run build       # SSR build → build/client + build/server
npm run start       # react-router-serve ./build/server/index.js
npm run typecheck   # react-router typegen && tsc
```

## Variables de entorno

| Variable       | Default                     | Scope | Notas                                                                                                     |
| -------------- | --------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:3000/api` | Build | URL base de la API. **Se embebe en el build de Vite** (compile-time). Usada por el cliente browser y SSR. |
| `API_URL`      | (igual a `VITE_API_URL`)    | SSR   | Override server-side (sobrescribe a `VITE_API_URL` en servidor).                                          |

### Setup local

```bash
cd front
npm install
# .env ya contiene VITE_API_URL=http://localhost:3000/api
npm run dev  # vite dev :5173
```

### Build para producción (Docker)

El `Dockerfile` acepta `VITE_API_URL` como argumento build:

```bash
docker build --build-arg VITE_API_URL=https://api.distop-ia.com/api -t vampiros-front .
```

El **workflow de CI/CD** (`.github/workflows/deploy-frontend.yml`) automáticamente:

1. Construye la imagen con `VITE_API_URL=https://api.distop-ia.com/api`
2. Pushea a Docker Hub (`lebateleur/distop-ia-front`)
3. SSH a la VPS y redeploy del contenedor

## Estructura

```
app/
  app.css                          # tokens VtM (paleta sangrienta, Cinzel, Cormorant) + light/dark
  root.tsx                         # html root con clase `dark` por defecto
  routes.ts                        # registro de rutas con layout() público/privado

  layouts/
    public.tsx                     # layout para usuarios no autenticados (redirige a / si ya hay sesión)
    private.tsx                    # layout protegido (redirige a /login si no hay sesión, header con logout)

  routes/
    home.tsx                       # dashboard del santuario (privado)
    characters.tsx                 # /characters (stub)
    social.tsx                     # /social (stub)
    journal.tsx                    # /journal (stub)
    table.tsx                      # /table (stub Mesa Virtual)
    chronicles/
      list.tsx                     # /chronicles
      new.tsx                      # /chronicles/new
      detail.tsx                   # /chronicles/:id  (detalle + invitar + miembros)
    invitations/
      list.tsx                     # /invitations (mis invitaciones pendientes)
      accept.tsx                   # /invitations/:token (aceptación; URL del correo)
    auth/
      login.tsx                    # /login  (soporta ?next= y ?email=&registered=1)
      register.tsx                 # /register  (soporta ?invite=<token>)
      forgot-password.tsx          # /forgot-password
      password-recovery.tsx        # /password-recovery?token=...  ← URL que envía el backend en el correo

  lib/
    utils.ts                       # cn()
    api/
      client.ts                    # axios browser (withCredentials + interceptor de refresh) + createServerClient(cookie) para SSR
      auth/
        auth.api.ts                # login, register, refresh, me, logout, forgotPassword, resetPassword
        auth.types.ts              # tipos de request/response
        auth.server.ts             # getAuthSession(request) + buildSetCookieHeaders() para loaders SSR
      users/
        users.types.ts             # interface User (espejo del modelo del backend, sin password)

  stores/
    user.store.ts                  # zustand: { user, status, setUser, hydrate, clear }

  hooks/
    use-hydrate-user.ts            # sincroniza el user del loader con el store al montar

  components/
    common/
      logo.tsx                     # Logo Distop-IA (gota de sangre + tipografía Cinzel)
      auth-card.tsx                # Card temática para vistas de auth
      form-field.tsx               # Input + Label + hint + error a11y
      submit-button.tsx            # Botón principal con estado loading
      form-alert.tsx               # Alerta de error / éxito
      auth-error.ts                # extractAuthError() — normaliza errores axios → string
    ui/                            # shadcn primitives (no editar a mano)
```

## Autenticación — flujo completo

El backend emite **`accessToken` (15m)** y **`refreshToken` (7d)** como cookies HTTP-only. **Nunca** se leen ni escriben tokens desde JS / `localStorage`.

### SSR (loaders)

Cada layout (`public.tsx`, `private.tsx`) llama `getAuthSession(request)` en su `loader`. La función:

1. Reenvía el header `Cookie` del request entrante al backend.
2. Llama `GET /auth/me`.
3. Si responde 401, intenta `POST /auth/refresh` y, si funciona, repite `/me`.
4. Si el refresh rotó cookies, retorna el header `Set-Cookie` para que el layout lo propague al browser vía `data(..., { headers })`. Ver `private.tsx`: cuando `setCookieHeader` existe usa `data(...)` con `buildSetCookieHeaders(...)` para que el navegador almacene las nuevas cookies.

**Reglas de redirección**:

- Layout público: si hay sesión → `redirect("/")`.
- Layout privado: si no hay sesión → `redirect("/login")`.

### Cliente (axios)

`apiClient` (en `app/lib/api/client.ts`) está configurado con `withCredentials: true` e incluye un interceptor de respuesta:

- En 401 (excepto rutas `/auth/login`, `/auth/refresh`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`) intenta `POST /auth/refresh` y reintenta la petición original.
- Cola interna para evitar refresh paralelos cuando varias requests fallan a la vez.
- Si el refresh también falla, limpia el store de usuario; el siguiente render del layout privado disparará el redirect a `/login`.

### Vistas

- **`/login`** — `POST /auth/login`, guarda user en zustand y navega a `/`.
- **`/register`** — `POST /auth/register` (no auto-login). Al éxito redirige a `/login?registered=1&email=...`.
- **`/forgot-password`** — `POST /auth/forgot-password`. El backend siempre responde 200 (anti-enumeración).
- **`/password-recovery`** — `POST /auth/reset-password` con `{ token, newPassword }`. El **token** llega como query string (`?token=...`). Esta es la ruta que el backend incluye en el correo (`FRONTEND_URL/password-recovery?token=<token>`).

### Store zustand (`user.store.ts`)

```ts
interface UserState {
  user: User | null;
  status: "idle" | "authenticated" | "unauthenticated";
  setUser(user: User): void; // tras login exitoso en el cliente
  hydrate(user: User | null): void; // desde el layout privado con el user del loader
  clear(): void; // tras logout o refresh fallido
}
```

El store es **espejo en memoria** del estado de auth; la fuente de verdad sigue siendo la cookie HTTP-only. Si el browser cierra, al volver el layout SSR repuebla el store vía `/me`.

## Estilos y temas

Toda la paleta vive en `app/app.css`:

- Tokens base shadcn (`--background`, `--foreground`, `--primary`, etc.) en `:root` (light) y `.dark`.
- Tokens VtM adicionales: `--blood`, `--blood-foreground`, `--ash`, `--parchment` → utilidades `bg-blood`, `text-blood`, `bg-parchment`.
- Tipografías: `--font-sans` (Geist), `--font-heading` / `--font-display` (Cinzel), `--font-serif` (Cormorant Garamond).
- El `<html>` arranca con la clase `dark` por defecto (estética nocturna del juego). Para implementar toggle: agregar/quitar `dark` y persistir con cookie.

**Reglas**:

- Nunca usar colores hardcoded en componentes. Si necesitas un color nuevo, agrégalo en `:root` + `.dark` + en `@theme inline` antes de consumirlo.
- **`<select>` nativos**: SIEMPRE aplicar `SELECT_DARK_CLASS` desde `~/lib/select-styles.ts` (admite `cn(SELECT_DARK_CLASS, "h-8")`). La constante estiliza tanto el control (`bg-input/30 dark:bg-input/50`) como las `<option>` y `<optgroup>` del menú desplegado (`bg-popover text-popover-foreground`, que en dark coincide con el fondo de la hoja de personaje). Prohibido un `<select>` con fondo blanco / sin la clase: rompe la paleta. Si necesitas un select estilizado más elaborado, crea un componente shadcn (`npx shadcn@latest add select`) pero no inventes clases nuevas.
- **Confirmaciones**: nunca `window.confirm`, `window.alert` ni `window.prompt`. Usar el hook `useConfirm()` de `~/hooks/use-confirm.tsx` que renderiza `ConfirmDialog` con la paleta sangrienta.

## Crónicas e invitaciones

Capa API en `app/lib/api/chronicles/` (`chronicles.api.ts` + `chronicles.types.ts`). Funciones disponibles:

- `listMyChronicles()`, `getChronicle(id)`, `createChronicle(input)`, `updateChronicle(id, input)`, `deleteChronicle(id)`.
- `inviteToChronicle(chronicleId, email)`, `cancelInvitation(chronicleId, invitationId)`, `removeMember(chronicleId, userId)`.
- `previewInvitation(token)` (público en el backend), `listMyInvitations()`, `acceptInvitation(token)`.

Páginas (todas dentro del layout privado):

- `/chronicles` — lista de crónicas donde participas (`app/routes/chronicles/list.tsx`).
- `/chronicles/new` — formulario de creación (te convierte en narrador).
- `/chronicles/:id` — detalle con miembros, invitaciones pendientes, formulario para invitar (sólo narrador), expulsar miembros, cancelar invitaciones, eliminar crónica.
- `/invitations` — invitaciones pendientes dirigidas a tu correo o tu user id.
- `/invitations/:token` — pantalla de aceptación; URL a la que apunta el correo enviado por el backend cuando el invitado **ya** está registrado.

Flujo de invitación a usuarios nuevos:

1. Narrador invita por email; backend detecta que no existe usuario con ese email.
2. Backend envía correo con `${FRONTEND_URL}/register?invite=<token>`.
3. `/register` consulta `previewInvitation(token)`, pre-rellena el correo (deshabilitado), muestra el nombre de la crónica.
4. Tras `POST /auth/register` (no auto-login), redirige a `/login?registered=1&next=/invitations/<token>&email=...`.
5. Login lee `next` y navega ahí. `/invitations/:token` muestra preview pública y permite aceptar.

Flujo de invitación a usuarios existentes:

1. Narrador invita por email; backend encuentra `Users` con ese email.
2. Backend envía correo con `${FRONTEND_URL}/invitations/<token>`.
3. Si la cookie sigue activa, layout privado deja entrar; si no, redirige a `/login` y luego a la ruta. (Se puede mejorar con `?next=` desde el guard.)
4. `/invitations/:token` muestra preview y permite aceptar. Backend valida que `email del invite === email del user` antes de añadir al `ChronicleMember`.

## Navbar privado

`app/components/common/navbar.tsx` — banda superior roja (logo, notificaciones, badge de invitaciones, menú de usuario con avatar + dropdown) y banda inferior oscura con tabs (`Inicio`, `Mis personajes`, `Crónicas`, `Social`, `Bitácora`, `Mesa Virtual`). El badge consume `invitationCount` del loader del layout privado (que llama `GET /api/invitations`).

`app/components/common/user-menu.tsx` — avatar circular con dot verde de presencia, dropdown con `Mi santuario` y `Salir`. Cierra al clickear fuera; usa `useUserStore.clear()` + `logout()` antes de navegar a `/login`.

## Estado actual

- ✅ Auth completo (login, register, forgot, recovery) con `?next=` y `?invite=` deep-link.
- ✅ Layouts public/private con guard SSR + refresh transparente.
- ✅ Store zustand de usuario.
- ✅ Navbar estilo _nivel20_ con dropdown de usuario, badge de invitaciones y tabs.
- ✅ Crónicas: CRUD + invitar usuarios (existentes y no registrados) + aceptar / cancelar / expulsar.
- ✅ Templates hbs Distop-IA VtM (welcome, password-recovery, chronicle-invite-existing, chronicle-invite-new).
- ⏳ Toggle dark/light (paleta lista, falta UI).
- ⏳ Personajes, Social, Bitácora, Mesa Virtual (stubs visuales con `ComingSoon`).
- ⏳ Avatar uploader (endpoint `POST /api/users/:id/avatar` ya existe en el backend).

## Convenciones (reactender-agent)

- `~/` → `app/` (paths en tsconfig).
- HTTP centralizado bajo `app/lib/api/<entity>/`. **Nunca** llamar `axios` directo desde un componente.
- Componentes genéricos → `app/components/common/`. Específicos de feature → `app/components/<feature>/`.
- shadcn: añadir más con `npx shadcn@latest add <comp>` desde `front/`.
- Sin `console.log` en código final.
- Iconos vía `lucide-react` (ya instalado por shadcn).
