/**
 * URL pública canónica de la plataforma. Hardcoded a producción a propósito:
 * los archivos exportados (PDF/MD/JSON) llevan un enlace que siempre apunta
 * a `https://distop-ia.com`, independientemente del entorno donde se generó.
 * Así un PDF exportado desde QA o dev también guía al lector a la versión
 * oficial.
 */
const PLATFORM_URL = "https://distop-ia.com";

export function getPlatformUrl(): string {
  return PLATFORM_URL;
}

/** Texto + URL para el footer común a todos los formatos de export. */
export function platformAttribution(): { label: string; url: string } {
  return { label: "distop-ia.com", url: PLATFORM_URL };
}
