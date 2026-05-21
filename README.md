# Distop-IA Frontend

**Mesa Virtual gratuita para Vampiro: la Mascarada (V20)**

Frontend SSR con React Router 7 y Tailwind CSS v4. Este repositorio es independiente del backend; clona solo este repo si quieres desarrollar el cliente.

**Demo en vivo:**
- Producción: https://distop-ia.com
- QA/Staging: https://distopia-qa.guillermotorresdev.com

**Backend:** https://github.com/GuillermoTorresRenner/Distop-IA-backend

---

## Stack

- **React Router 7** con Server-Side Rendering (SSR) habilitado.
- **Tailwind CSS v4** vía `@tailwindcss/vite` (sin archivo de config; tokens en `app.css`).
- **shadcn/ui** — primitivos de interfaz con tema dark por defecto.
- **axios** — cliente HTTP con interceptor de refresh transparente.
- **zustand** — state management global (usuario autenticado).
- **TypeScript** estricto; alias `~/*` → `app/*`.
- Ningún linter/formatter configurado aún (ver sección de contribución).

---

## Inicio rápido

### Requisitos

- Node 20+
- npm 10+ (o pnpm/yarn)
- Backend Distop-IA ejecutándose en `http://localhost:3000/api` (por defecto local)

### Setup

```bash
git clone https://github.com/GuillermoTorresRenner/Distop-IA-front.git
cd front
npm install

# .env ya contiene VITE_API_URL=http://localhost:3000/api
npm run dev
```

Abre **http://localhost:5173** en tu navegador.

---

## Comandos disponibles

```bash
npm run dev          # vite dev server :5173 con HMR
npm run build        # SSR build → build/client + build/server
npm run start        # react-router-serve ./build/server/index.js (producción local)
npm run typecheck    # react-router typegen && tsc
```

---

## Variables de entorno

| Variable      | Default                     | Scope | Descripción                                                                                     |
|---------------|-----------------------------|----- -|-------------------------------------------------------------------------------------------------|
| `VITE_API_URL` | `http://localhost:3000/api` | Build | URL base de la API. Se embebe en el bundle de Vite (compile-time). Usada por cliente y SSR. |
| `API_URL`      | (igual a `VITE_API_URL`)    | SSR   | Override server-side (sobrescribe `VITE_API_URL` en runtime del servidor).                     |

Copiar `.env` local desde el repositorio y ajustar si necesitas apuntar a un backend remoto.

---

## Estructura de carpetas

```
app/
  app.css                    # Tokens Tailwind + paleta VtM (sangre, ceniza, pergamino)
  root.tsx                   # HTML root con clase dark
  routes.ts                  # Registro file-based de rutas

  layouts/
    public.tsx              # Layout para no autenticados (redirige a / si hay sesión)
    private.tsx             # Layout protegido (redirige a /login si no hay sesión)

  routes/
    home.tsx                # Dashboard santuario (privado)
    chronicles/             # Crónicas: list, new, detail
    invitations/            # Invitaciones: list, accept
    characters/             # Personajes (en progreso)
    auth/                   # Login, register, password recovery

  lib/
    api/
      client.ts             # axios con withCredentials + refresh interceptor
      auth/                 # Autenticación (login, register, me, logout)
      chronicles/           # CRUD crónicas + invitaciones
      users/                # Datos de usuario
    utils.ts                # Helper cn()
    select-styles.ts        # SELECT_DARK_CLASS para <select> nativos

  stores/
    user.store.ts           # zustand: { user, status, setUser, hydrate, clear }

  hooks/
    use-confirm.tsx         # Dialog de confirmación (sin window.confirm)
    use-hydrate-user.ts     # Sincroniza state del loader con el store

  components/
    common/                 # Logo, navbar, auth-card, form-field, etc.
    ui/                     # shadcn primitives (no editar a mano)
```

---

## Autenticación

El backend emite **accessToken** (15 minutos) y **refreshToken** (7 días) como cookies HTTP-only. Nunca se leen/escriben tokens desde JavaScript ni `localStorage`.

### Flujo SSR (loaders)

Cada layout (`public.tsx`, `private.tsx`) invoca `getAuthSession(request)`:

1. Reenvía header `Cookie` del request al backend.
2. Llama `GET /auth/me`.
3. Si 401, intenta `POST /auth/refresh` (rota tokens) y reintenta `/me`.
4. Retorna usuario o null; el layout propaga `Set-Cookie` si el refresh actualizó cookies.

**Guardias**: layout público redirige a `/` si hay sesión; layout privado redirige a `/login` si no la hay.

### Flujo cliente (axios)

`apiClient` está configurado con `withCredentials: true` e interceptor de respuesta:

- En 401, intenta `POST /auth/refresh` y reintenta automáticamente.
- Cola interna previene refresh paralelos.
- Si falla, limpia el store; el siguiente render privado redirige a `/login`.

### Vistas de autenticación

- **`/login`** — `POST /auth/login`, soporta `?next=` para deep-link.
- **`/register`** — `POST /auth/register`, soporta `?invite=<token>` para pre-llenar email desde invitación de crónica.
- **`/forgot-password`** — `POST /auth/forgot-password` (responde 200 siempre, anti-enumeración).
- **`/password-recovery`** — `POST /auth/reset-password` con `?token=...` (URL enviada en correo del backend).

---

## Crónicas e invitaciones

`app/lib/api/chronicles/` centraliza toda la lógica:

- Crear/listar/actualizar/eliminar crónicas.
- Invitar usuarios por email (existentes o no registrados).
- Aceptar/cancelar/expulsar miembros.

**Flujo de invitación a usuario nuevo:**
1. Narrador invita por email → backend detecta que no existe.
2. Backend envía correo con `${FRONTEND_URL}/register?invite=<token>`.
3. `/register` pre-rellena email, muestran nombre de crónica.
4. Tras registro, redirige a `/login` + `?next=/invitations/:token`.
5. `/invitations/:token` permite aceptar la invitación.

**Flujo de invitación a usuario existente:**
1. Narrador invita → backend encuentra usuario registrado.
2. Backend envía correo con `${FRONTEND_URL}/invitations/:token`.
3. `/invitations/:token` permite aceptar (backend valida email del invitado).

---

## Estilos y paleta

Tokens Tailwind centralizados en `app/app.css`:

- Base shadcn: `--background`, `--foreground`, `--primary`, etc. (light + `.dark`).
- Tokens VtM: `--blood`, `--blood-foreground`, `--ash`, `--parchment`.
- Tipografías: Geist (sans), Cinzel (headings), Cormorant Garamond (serif).
- El `<html>` arranca con clase `dark` (estética nocturna del juego).

### Reglas de estilo obligatorias

1. **Nunca colores hardcoded** en componentes. Agregar nuevos tokens en `app/app.css` antes de consumirlos.
2. **`<select>` nativos**: SIEMPRE usar `SELECT_DARK_CLASS` de `~/lib/select-styles.ts`.
   ```tsx
   <select className={cn(SELECT_DARK_CLASS, "h-8")} ...>
   ```
3. **Confirmaciones**: nunca `window.confirm`, `window.alert` ni `window.prompt`. Usar `useConfirm()` de `~/hooks/use-confirm.tsx`.

---

## Features actuales

- ✅ Autenticación completa: login, register, forgot password, password recovery.
- ✅ Layouts público/privado con guardias SSR y refresh transparente.
- ✅ Store zustand de usuario (espejo de cookie HTTP-only).
- ✅ Navbar estilo nivel20: banda superior roja + banda inferior con tabs.
- ✅ Crónicas: CRUD, invitaciones a usuarios nuevos/existentes, gestión de miembros.
- ✅ Catálogos compartidos: clanes (14), disciplinas (12, incluyendo Taumaturgia y Nigromancia con sus sendas y rituales), atributos (9 con tooltips), habilidades (31 con tooltips y especialidades), arquetipos, méritos/defectos, armas, armaduras, virtudes y trasfondos.
- ✅ Sistema de tooltips + InfoModal: cada rasgo/habilidad/disciplina/clan muestra tooltip al hover (paleta sangrienta) y `InfoModal` al pulsar el botón `i`. El texto largo del modal viene del backend (vault Markdown) y el tooltip corto del campo `tooltip` del catálogo, con fallback hardcoded por seguridad.
- ⏳ Personajes: hoja completa con pestañas (Rasgos, Ventajas, Equipo, Notas).
- ⏳ Toggle dark/light (paleta lista, falta UI).
- ⏳ Social (amistades), Bitácora, Mesa Virtual (stubs en progreso).

---

## Cómo colaborar

### Bienvenida

El proyecto es **independiente y no comercial**. Toda contribución es bienvenida: código, diseño, reportes de bug, traducciones, sugerencias.

**Contacto**: usa el botón de soporte en https://distop-ia.com o crea un Issue en este repositorio.

### Flujo de contribución

1. **Fork** este repositorio en GitHub.
2. **Clone** tu fork: `git clone <tu-fork> && cd front`.
3. **Crea una rama** desde `QA`:
   ```bash
   git fetch origin QA
   git checkout -b feature/mi-feature origin/QA
   ```
   (Usa `feature/`, `fix/`, `docs/` como prefijo.)

4. **Commits** con estilo conventional (sugerido, no obligatorio):
   ```
   feat: agregar toggle dark/light a navbar
   fix: reparar interceptor de refresh en 401
   docs: actualizar guía de estilo de componentes
   ```

5. **Antes de abrir PR**:
   - Correr `npm run typecheck` — sin errores TS.
   - Revisar que no haya `console.log` en código.
   - Probar manualmente en navegador.
   - No subir `.env`, secrets, `.react-router/`, `build/`, `dist/`, `node_modules/`.

6. **Push** a tu rama y abre **PR contra `QA`** (no contra `main`):
   - **Título**: resumen breve (ej. "Agregar toggle dark/light").
   - **Descripción**:
     - Qué: cambio realizado.
     - Por qué: motivación/issue.
     - Cómo probarlo: pasos manuales.
     - Screenshots si es UI.
     - Checklist: typecheck OK, sin colores hardcoded, sin `window.confirm`, migraciones OK (si aplica).

7. **Review**: el mantenedor revisará en 1-7 días hábiles. Cambios solicitados se hacen como nuevos commits (no force-push).

8. **Merge**: tras aprobación, el PR se mergea a `QA`. `main` es solo para releases estables.

### Aportes especialmente bienvenidos

- **Tests**: configurar vitest + React Testing Library; cobertura de componentes.
- **Storybook**: documentación visual de character sheet, formularios, diálogos.
- **Accesibilidad**: revisar ARIA labels, navegación por teclado, ratios de contraste.
- **Traducciones**: soportar EN, PT-BR (mensajes de error, etiquetas, help text).
- **Iconos del Mundo de Tinieblas**: agregar símbolos de clanes, disciplinas, etc.
- **Mobile**: mejoras al navbar y forms para pantallas pequeñas.

### Convenciones de código

- `~/` es alias para `app/` — usar en imports.
- HTTP centralizado bajo `app/lib/api/<entity>/` — nunca axios directo desde componente.
- Componentes genéricos en `app/components/common/`; específicos en `app/components/<feature>/`.
- shadcn: agregar con `npx shadcn@latest add <componente>` desde `front/`.
- Iconos vía `lucide-react`.
- Sin `console.log` en código final.

---

## Despliegue

CI/CD automático via GitHub Actions (ver `.github/workflows/`):

- **Push a `QA`**: build Docker, push a `lebateleur/distop-ia-frontend:qa`, deploy a VPS staging.
- **Push a `main`**: build Docker, push a `lebateleur/distop-ia-frontend:latest`, deploy a VPS producción.

El Dockerfile acepta `VITE_API_URL` como build-arg; los workflows lo extraen del secret `QA_ENV_VARS` o `PROD_ENV_VARS` según rama.

---

## Backend gemelo

Para entender cómo el frontend se integra con el backend, consulta:

https://github.com/GuillermoTorresRenner/Distop-IA-backend

El backend provee:
- Autenticación JWT (cookies HTTP-only).
- CRUD de crónicas, personajes, catálogos.
- Correos transaccionales (handlebars).
- Swagger en `/docs` (dev).

---

## Créditos

**Distop-IA VTT** es un fan-made **no comercial** basado en **Vampiro: la Mascarada (V20)** de White Wolf / Paradox Interactive.

El Mundo de Tinieblas y todos sus personajes, arquetipos y disciplinas son propiedad intelectual de Paradox Interactive.

---

## Licencia

Copyright (C) 2026 Guillermo Torres Renner

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la **GNU General Public License versión 3** (GPL-3.0) publicada por la Free Software Foundation.

Este programa se distribuye con la esperanza de que sea útil, pero **SIN NINGUNA GARANTÍA**; ni siquiera la garantía implícita de COMERCIABILIDAD o IDONEIDAD PARA UN PROPÓSITO PARTICULAR. Consulta la GPL-3.0 para más detalles.

Deberías haber recibido una copia de la GNU General Public License junto con este programa en el archivo [LICENSE](./LICENSE). Si no, visita <https://www.gnu.org/licenses/gpl-3.0.html>.

**Resumen práctico** (no sustituye al texto legal):

- Podés usar, copiar, modificar y redistribuir el código libremente.
- Cualquier obra derivada (fork, fork modificado, integración) **debe publicarse también bajo GPL-3.0** y conservar este aviso de copyright.
- Si distribuís binarios o el servicio compilado, debés ofrecer también el código fuente correspondiente.
- No hay garantía y los autores no se hacen responsables del uso.

El Mundo de Tinieblas, Vampiro: la Mascarada y todos sus elementos son marcas registradas de Paradox Interactive. La licencia GPL-3.0 cubre **solo el código fuente** de Distop-IA VTT, no el material de juego.

---

**¿Preguntas?** Abre un Issue o contacta mediante el sitio web.
