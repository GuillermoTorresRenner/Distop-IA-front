/**
 * Dispara la descarga de un blob desde el browser. SSR-safe: usa
 * `URL.createObjectURL` solo si `window` existe.
 */
export function downloadBlob(filename: string, blob: Blob): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberamos la URL en el siguiente tick para no cortarla antes de tiempo.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
