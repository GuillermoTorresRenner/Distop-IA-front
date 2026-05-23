/**
 * Resuelve URLs `/images/...` que vienen del backend (avatares de usuarios,
 * portraits de personajes, portadas de crónicas, imágenes de pizarra, etc.).
 *
 * **Por qué existe este helper**: el back devuelve siempre paths relativos
 * (`/images/characters/avatars/abc.webp`). En prod, NPM tiene una Custom
 * Location `/images` que rutea al back por la red interna Docker, así que
 * el browser resuelve la URL contra el dominio del front sin saltos. En dev
 * local, el front corre en `:5173` y el back en `:3000`, así que un GET a
 * `/images/...` cae en React Router y dice "no route matches".
 *
 * Solución: si `VITE_API_URL` apunta a un origen distinto al del front
 * (típico de dev), prefija las URLs `/images/...` con ese origen. En prod
 * (con el back tras NPM en el mismo dominio del front) la rama del prefix
 * se salta porque el origen del back coincide con `window.location.origin`.
 */
function getBackendOrigin(): string | null {
  // SSR: el server-side de React Router corre con `process.env.API_URL` (lo
  // sobrescribimos en docker-compose). Si está, le damos prioridad.
  let apiUrl: string | undefined;
  if (typeof process !== "undefined" && process.env?.API_URL) {
    apiUrl = process.env.API_URL;
  }
  // Browser + SSR de Vite: leemos `import.meta.env.VITE_API_URL` (embebido
  // en build time). El `?.` evita romper si import.meta no existe en algún
  // entorno raro.
  if (!apiUrl && typeof import.meta !== "undefined") {
    apiUrl = import.meta.env?.VITE_API_URL as string | undefined;
  }
  // Default razonable para dev local sin .env.
  if (!apiUrl) apiUrl = "http://localhost:3000/api";

  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
}

export function resolveImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  // Si ya es absoluta (http/https) o un data:/blob: URL la dejamos pasar.
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  // Sólo nos interesan las que vienen del back; cualquier otra path
  // relativa queda como está (e.g. imágenes locales de Vite).
  if (!url.startsWith("/images/")) return url;

  const backendOrigin = getBackendOrigin();
  if (!backendOrigin) return url;

  // En SSR no hay window; devolvemos la URL absoluta para que el HTML
  // generado apunte al back. En el cliente, si el back vive en el mismo
  // origin que la página (caso NPM en prod), preferimos path relativo
  // para que el browser reuse la conexión.
  if (typeof window !== "undefined" && window.location.origin === backendOrigin) {
    return url;
  }
  return `${backendOrigin}${url}`;
}
