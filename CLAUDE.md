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

## Personajes — hoja con pestañas, autocálculos V20 y guard de cambios

**Hoja** (`app/components/character/character-sheet-form.tsx`):

Usa el componente `Tabs` de `~/components/common/tabs.tsx` con cinco pestañas:

1. **Rasgos** — Atributos (Físicos/Sociales/Mentales) + Habilidades (Talentos/Técnicas/Conocimientos). Tooltip sobre cada rasgo/habilidad desde catálogo backend o fallback hardcoded.
2. **Ventajas** — Trasfondos (`BackgroundRow`: select cerrado + personalizado), Disciplinas (`DisciplineRow`: para monolíticas un `DotRating` + lista de poderes; para ramificadas — Taumaturgia/Nigromancia — subpanel de sendas con `DotRating` por senda, radio "primaria" y sección colapsable de rituales aprendidos vía checkbox), Virtudes, Méritos/Defectos (`MeritFlawRow`: select de 3 niveles + personalizado).
3. **Estado y salud** — Humanidad/Senda (auto-calculada = Conciencia + Autocontrol), Voluntad permanente (auto-calculada = Coraje), Voluntad actual (`DotRating` con `slots=10`), Reserva de sangre (`BloodPoolRow`: stepper hasta 50, auto-calculada por Generación), Experiencia, niveles de Salud.
4. **Equipo** — Armas cuerpo a cuerpo, Armas a distancia, Armaduras (con dialogs para crear customs).
5. **Notas** — Textarea libre (max 8000 chars).

Sección **Identidad** fija arriba (fuera de las pestañas). Botones header: **Tablas** (experiencia, maniobras combate, armaduras) y **Guía rápida** (V20).

**Props nuevos**:
- `attributes?: AttributeInfo[]` - catálogo de atributos con tooltips.
- `abilities?: AbilityInfo[]` - catálogo de habilidades con tooltips.
- `virtues?: Virtue[]` - catálogo de virtudes.

**Patrón tooltip con fallback** (helpers internos):
- `tooltipForAttribute(key, catalog)` → busca en catálogo, fallback a `ATTR_TOOLTIPS` de `sheet-tooltips.ts`.
- `tooltipForAbility(name, catalog)` → busca en catálogo, fallback a `ABILITY_TOOLTIPS`.
- `tooltipForVirtue(key, catalog)` → busca en catálogo, fallback a `VIRTUE_TOOLTIPS`.

Esta arquitectura permite que el backend pueble los tooltips (via vault de Obsidian) sin recompilar el frontend; si faltan datos, la UI cae a los hardcoded para que nunca haya regresión.

**Autocálculos V20** (`app/lib/character-sheet.ts`):

Helpers para aplicar reglas canon del V20:
- `bloodPoolForGeneration(gen)` — reserva máxima por Generación (4ª=50, 5ª=40, ..., 13ª+=10).
- `maxTraitForGeneration(gen)` — techo de rasgo permanente.
- `defaultWillpowerMaxFor(courage)` — Voluntad permanente = Coraje.
- `defaultHumanityFor(conscience, selfControl)` — Humanidad = suma.
- `applyAutoStats(prev, patch)` — aplica cálculos **solo si los valores derivados aún coinciden con la fórmula previa** (respeta ediciones manuales). Si nueva generación impone techo menor que sangre actual, recorta.
- `emptyCharacterInput()` arranca con gen 13ª, virtudes 1/1/1 → Humanidad=2, Voluntad=1, Reserva=10.
- `patch()` del form pasa cambios por `applyAutoStats` antes de propagar.

Nuevo componente `BloodPoolRow` (stepper numérico) en lugar de `DotRating` para soportar max 50.
`DotRating` ahora acepta prop `slots?: number` — si > max, renderiza puntos extra deshabilitados con borde punteado (preserva alineación).
Tooltips en `sheet-tooltips.ts` actualizados: Conciencia, Autocontrol, Coraje, Convicción, Instintos, Humanidad, Voluntad permanente, Reserva de Sangre, Generación.

**Guard de cambios sin guardar** (`app/hooks/use-unsaved-changes-guard.tsx`):

Hook que combina:
- `useBlocker` (React Router) — intercepta navegaciones internas.
- `beforeunload` (browser) — intercepta cierre/recarga de pestaña.

Para navegaciones internas muestra `ConfirmDialog` con paleta sangrienta: "Cambios sin guardar — Salir sin guardar / Seguir editando".
Helper `isCharacterInputDirty(a, b)` compara dos `CharacterInput` con orden estable, omitiendo `undefined`.

Integrado en:
- `app/routes/characters/new.tsx` — compara contra snapshot tras aplicar params/template iniciales. Flag `skipGuard` se activa antes de navegar post-create.
- `app/routes/characters/detail.tsx` — compara `value` vs snapshot `pristine` cargado. Pre-navegación, limpian `character` y `value`.

**Componente `BackgroundRow`**:

Select cerrado con 10 trasfondos V20 (Aliados, Contactos, Criados, Fama, Generación, Influencia, Mentor, Posición, Rebaño, Recursos).
Opción `+ Personalizado…` cambia a input libre.
Botón `≡` vuelve al select. Botón `i` abre `InfoModal` cuando hay match en catálogo.

**Componente `MeritFlawRow` y `CustomMeritFlawInputs`**:

Select con 3 niveles visuales diferenciados:
1. **Categoría** (Físico/Mental/Social/Sobrenatural): `<option disabled>` formato `━━━ FÍSICO ━━━` (encabezado de sección, no seleccionable).
2. **Tipo**: `<optgroup label="  ▸ Méritos">` / `<optgroup label="  ▸ Defectos">` (browser renderiza en negrita).
3. **Item**: `    · [+1] Nombre` (indentación 4 espacios, bullet).

Tras todos los grupos aparece separador `━━━━━━━━━━━━━━━` y opción `+ Personalizado…`.

Modo custom: inputs inline para nombre, categoría libre, toggle Mérito/Defecto, stepper coste 1..7 (signo auto-ajustado).
Botón `≡` vuelve al catálogo. Botón `?` abre `InfoModal`.

Orden canónico: Físico → Mental → Social → Sobrenatural → otras. Dentro de cada bucket: méritos ascendentes, defectos descendentes (menos severo primero).

**Catálogos propios** (capa API `app/lib/api/catalog/`):

- Archetypes, Disciplines, Clans, MeritsFlaws (preexistentes).
- **Backgrounds** — `listBackgrounds()`, `listAttributesInfo()`, `listAbilitiesInfo()`, `listVirtues()` en `catalog.api.ts`.
- Tipos: `Background[]`, `AttributeInfo[]`, `AbilityInfo[]`, `Virtue[]` en `catalog.types.ts`.
- **Tooltips**: todos los catálogos ahora incluyen campo `tooltip?: string | null` (excepto items que aún no lo tienen en el vault).
- Cache en `catalog-cache.ts` incluye backgrounds, attributesInfo, abilitiesInfo, virtues. `InfoKind = "background"|"virtue"` etc., con resolver → `{ title, subtitle, body }`.

Routes `/characters/new` y `/characters/detail` cargan todos los catálogos vía loaders SSR y los pasan a `character-sheet-form.tsx`.

## Componente InfoModal y renderizado de catálogo

**`app/components/common/info-modal.tsx`**:

Modal que renderiza descripciones largas del catálogo (atributos, habilidades, disciplinas, virtudes, etc.). Usa la clase CSS `.markdown-content` definida en `app/app.css` para estilar párrafos Markdown con separación correcta.

**Importante**: No se usa `@tailwindcss/typography` (no está instalado). En su lugar, `.markdown-content` aplica estilos manuales:
- `p { margin: 0.5rem 0 }` — crea separación entre párrafos.
- `ul { margin-left: 1rem; list-style: disc; }` — listas con sangría.
- Otros estilos para `h2`, `h3`, `blockquote`, etc.

Esto garantiza que el body Markdown del catálogo (con saltos de línea entre párrafos) se renderice legible sin depender de un plugin CSS que no está disponible.

## Navbar privado

`app/components/common/navbar.tsx` — banda superior roja (logo, notificaciones, badge de invitaciones, menú de usuario con avatar + dropdown) y banda inferior oscura con tabs (`Inicio`, `Mis personajes`, `Crónicas`, `Social`, `Bitácora`, `Mesa Virtual`). El badge consume `invitationCount` del loader del layout privado (que llama `GET /api/invitations`).

`app/components/common/user-menu.tsx` — avatar circular con dot verde de presencia, dropdown con `Mi santuario` y `Salir`. Cierra al clickear fuera; usa `useUserStore.clear()` + `logout()` antes de navegar a `/login`.

## Mesa Virtual — Música en Streaming

**Componente `MusicPlayer`** (`app/components/table/music-player.tsx`):

Panel colapsable integrado en la vista de mesa virtual (`/table`). Características:

- **Input URL**: narrador y jugadores pueden pegar URLs de YouTube.
- **Track actual**: thumbnail del video, título, autor, duración.
- **Controles del narrador**: play/pause/skip/stop (botones deshabilitados para jugadores).
- **Cola de reproducción**: lista de tracks pendientes con botón para remover (solo narrador).
- **Audio oculto**: etiqueta `<audio>` sin UI visible que consume el stream chunked (`GET /api/chronicles/:id/music/stream`).
- **Control de volumen local**: slider de 0-100 que solo afecta al cliente.
- **Indicador de estado**: badge con `"Reproduciendo"`, `"En pausa"` o `"Detenido"`.

**Capa API** (`app/lib/api/music/music.api.ts`):

Funciones axios para comunicarse con los endpoints REST:

- `getMusicState(chronicleId)` — obtener estado actual del player.
- `playMusic(chronicleId, url)` — iniciar reproducción desde URL de YouTube.
- `pauseMusic(chronicleId)` — pausar.
- `resumeMusic(chronicleId)` — reanudar.
- `skipMusic(chronicleId)` — saltar al siguiente track.
- `stopMusic(chronicleId)` — detener y limpiar cola.
- `queueMusic(chronicleId, url)` — agregar track a la cola.
- `removeFromQueue(chronicleId, index)` — remover track de la cola.
- `getMusicStreamUrl(chronicleId)` — obtiene la URL del stream de audio.

**Tipos WebSocket** (`app/lib/socket/types.ts`):

- `TrackInfo` — `{ title, author, duration, thumbnail }`.
- `MusicState` — `{ chronicleId, status, currentTrack?, queue, startedAt?, pausedAt? }`.
- Evento `music:state` agregado a `ServerToClientEvents` para sincronizar estado a toda la sala.

**Hook `useTable`** (actualizado):

Nuevo estado `musicState` y listener para `music:state` vía WebSocket. Función `setInitialMusicState()` carga el estado inicial vía REST al entrar a la mesa.

**Ruta `/table`** (`app/routes/chronicles/table.tsx`):

- Botón "Música" en el header (verde cuando hay reproducción en curso).
- Panel colapsable con `<MusicPlayer>` debajo del header.
- Carga estado inicial del player vía `getMusicState()` en loader.

**Sincronización en tiempo real**:

Todo cliente conectado a una crónica recibe el evento `music:state` cuando narrador toca play/pause/skip/stop o agregar/remover de la cola. El estado se sincroniza automáticamente sin latencia apreciable.

**Restricciones de permisos**:

- Narrador: acceso completo (play, pause, resume, skip, stop, queue, remove).
- Jugadores: solo pueden sugerir tracks vía `queueMusic` (agregar a la cola). No pueden controlar reproducción.

## Mesa Virtual — Tirada de Iniciativa V20

**Componente `DiceRollerVtM`** (`app/components/table/dice-roller-vtm.tsx`):

- Prop opcional `onRollInitiative?` para delegar tirada a consumidor.
- Botón **Iniciativa** ubicado como **primer item** en fila central de toggles (junto a Especialidad, Voluntad, Secreta). Al click despliega panel ámbar con:
  - Stepper de modificador circunstancial `[-20..+20]`.
  - Breakdown: `Base: 1d10 + Destreza (X) + Astucia (Y) + N circunstancial`.
  - Botón `Tirar · 1d10 + N` con icono espadas.
  - Cuando panel está abierto, **se oculta el botón estándar** `Tirar Xd10 vs Y` para evitar duplicidad.
- Modificador se resetea al cambiar personaje y tras tirar.
- Prefill base con `characterId/dexterity/wits/willpowerAvailable` del personaje seleccionado (incluso sin click-to-roll previo).

**Hook `useTable`**:

Expone nueva función `rollInitiative(input)` con la misma firma que `rollVtm`. Envía evento WS `roll:initiative` al gateway backend.

**Tipo `RollInitiativeInput`** (`front/app/lib/socket/types.ts`):

Body `{ characterId, label?, isPublic?, modifier? }`. Agregado a `ClientToServerEvents`. Campo `metadata?: Record<string, unknown> | null` agregado a tipo `DiceRoll`.

**Componente `InitiativeRollCard`** (`roll-history.tsx`):

Cuando `roll.sourceKind === "INITIATIVE"` renderiza con:
- Paleta ámbar destacada.
- Badge "Iniciativa".
- d10 grande en centro.
- Modificadores desglosados: `Dex (X)` verde + `Ast (Y)` verde + `mod (±N)` según signo (verde/sangre).
- Total grande a la derecha.
- Nota: "Inscrito en el orden de turnos con iniciativa N".

**Backend (gateway WebSocket)** (`back/src/table/table.gateway.ts`):

Evento `roll:initiative` (client→server):
- Body: `{ characterId, label?, isPublic?, modifier? }`.
- Valida permisos: PC = dueño O narrador; NPC/Antagonista = solo narrador.
- Tira `1d10` server-side vía `randomInt(1, 10)`.
- Calcula total: d10 + Destreza + Astucia + modificador.
- Persiste en `DiceRoll` con `sourceKind='INITIATIVE'`, `metadata={ d10, dexterity, wits, modifier, total }`.
- Emite `roll:result` (visibilidad: PC público → broadcast; secreta/NPC → autor + narrador).
- Luego inscribe/actualiza personaje en tracker combate vía `CombatService.addOrUpdateForInitiative()` (distinto de `addParticipant`: no requiere narrador, solo dueño legítimo).
- Emite `combat:state` (actualizado tracker).

**DTO `RollInitiativeDto`** (`back/src/table/dto/roll-initiative.dto.ts`):

- `characterId: string` (uuid, requerido).
- `label?: string` (opcional, descripción visual de la tirada).
- `isPublic?: boolean` (optional, por defecto false = secreta).
- `modifier?: number` (rango `-20..+20`, validado).

**DiceService.rollInitiative()**:

Nuevo método. Genera d10, calcula total, retorna `{ d10, total, metadata: { d10, dexterity, wits, modifier, total } }`.

**CombatService.addOrUpdateForInitiative()**:

Nuevo método. A diferencia de `addParticipant`, no requiere ser narrador. Solo valida que personaje pertenece a crónica. Si ya en tracker, actualiza iniciativa; si no, lo añade.

**Migraciones Prisma**:

- `20260518020826_add_dice_roll_metadata` — columna `metadata Json?` en `DiceRoll` para guardar desglose.

## Estado actual

- ✅ Auth completo (login, register, forgot, recovery) con `?next=` y `?invite=` deep-link.
- ✅ Layouts public/private con guard SSR + refresh transparente.
- ✅ Store zustand de usuario.
- ✅ Navbar estilo _nivel20_ con dropdown de usuario, badge de invitaciones y tabs.
- ✅ Crónicas: CRUD + invitar usuarios (existentes y no registrados) + aceptar / cancelar / expulsar.
- ✅ Templates hbs Distop-IA VtM (welcome, password-recovery, chronicle-invite-existing, chronicle-invite-new).
- ✅ Personajes: CRUD con hoja 5 pestañas, autocálculos V20, guard cambios sin guardar, trasfondos catálogo + custom, méritos/defectos 3-niveles + custom.
- ✅ Mesa Virtual: tirada de iniciativa V20 (d10 + Dex + Ast + modificador), inscripción tracker combate.
- ✅ Música en streaming: reproducción de YouTube con ffmpeg→OGG, sincronización WebSocket en tiempo real, control narrador / sugerencias jugadores.
- ⏳ Toggle dark/light (paleta lista, falta UI).
- ⏳ Social, Bitácora (stubs visuales con `ComingSoon`).
- ⏳ Avatar uploader (endpoint `POST /api/users/:id/avatar` ya existe en el backend).

## Convenciones (reactender-agent)

- `~/` → `app/` (paths en tsconfig).
- HTTP centralizado bajo `app/lib/api/<entity>/`. **Nunca** llamar `axios` directo desde un componente.
- Componentes genéricos → `app/components/common/`. Específicos de feature → `app/components/<feature>/`.
- shadcn: añadir más con `npx shadcn@latest add <comp>` desde `front/`.
- Sin `console.log` en código final.
- Iconos vía `lucide-react` (ya instalado por shadcn).
