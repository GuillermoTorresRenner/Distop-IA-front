/**
 * Wrapper alrededor de <Excalidraw />.
 *
 * Este módulo IMPORTA Excalidraw (que rompe en SSR porque depende de `window`).
 * Por eso solo debe consumirse vía React.lazy desde un componente que está
 * detrás de un control "open" (modal cerrado en el primer render).
 */
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useRef } from "react";

type ExcalidrawElement = Record<string, unknown> & { id?: string };
type ExcalidrawAppState = Record<string, unknown>;
type ExcalidrawBinaryFiles = Record<
  string,
  {
    id: string;
    mimeType: string;
    dataURL: string;
    created: number;
    [k: string]: unknown;
  }
>;
type ExcalidrawApi = {
  updateScene: (scene: {
    elements?: readonly unknown[];
    appState?: Record<string, unknown>;
  }) => void;
  addFiles?: (files: ExcalidrawBinaryFiles[string][]) => void;
};

/**
 * Quita del `appState` los campos que Excalidraw espera como tipos no
 * serializables (Map, Set, instancias de clase). El más conocido es
 * `collaborators`, que Excalidraw consume con `.forEach()` asumiendo Map.
 *
 * Si dejásemos pasar el `appState` crudo deserializado desde la DB, los Maps
 * vienen como `{}` (objetos planos) y rompen el render.
 *
 * Lo más seguro es:
 *   1. Borrar `collaborators` y dejar que Excalidraw construya su default.
 *   2. Mantener solo el subconjunto de campos serializables que nos importan
 *      (background, zoom, etc.). El resto se pierde, que es aceptable: la
 *      info visual de los elementos vive en `elements`, no en `appState`.
 */
function sanitizeAppState(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  // Whitelist: campos persistibles que no requieren tipos especiales.
  const allowed: ReadonlyArray<string> = [
    "viewBackgroundColor",
    "gridSize",
    "gridStep",
    "zoom",
    "scrollX",
    "scrollY",
    "theme",
    "name",
    "exportBackground",
    "exportEmbedScene",
    "exportWithDarkMode",
    "exportScale",
    "fileHandle",
    "currentItemFontFamily",
    "currentItemFontSize",
    "currentItemStrokeColor",
    "currentItemBackgroundColor",
    "currentItemFillStyle",
    "currentItemStrokeWidth",
    "currentItemStrokeStyle",
    "currentItemRoughness",
    "currentItemOpacity",
    "currentItemTextAlign",
    "currentItemStartArrowhead",
    "currentItemEndArrowhead",
    "currentItemRoundness",
  ];
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in raw) out[key] = raw[key];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export interface WhiteboardCanvasProps {
  initialElements: readonly unknown[];
  initialAppState?: Record<string, unknown> | null;
  /**
   * Mapping `fileId → { url, mimeType }` con las imágenes que ya están
   * persistidas en el back. Al montar, el canvas las descarga, las convierte
   * a dataURL y las inyecta vía `addFiles`.
   */
  initialFileRefs?: Record<string, { url: string; mimeType: string }>;
  viewOnly?: boolean;
  /**
   * Snapshot remoto que el componente debe pisar sobre la escena (solo cuando
   * viewOnly = true y el narrador empuja un update). Se reemplaza por su
   * `version` numérico monotónico (cambia → forzamos updateScene).
   */
  remoteSnapshot?: {
    elements: readonly unknown[];
    appState: Record<string, unknown> | null;
    fileRefs?: Record<string, { url: string; mimeType: string }>;
    version: number;
  };
  /**
   * Llamado en cada cambio cuando viewOnly = false. Solo se usa para el
   * narrador. Incluye `files` con los binarios nuevos para que el modal los
   * suba al back.
   */
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: ExcalidrawAppState,
    files: ExcalidrawBinaryFiles
  ) => void;
  theme?: "light" | "dark";
}

export default function WhiteboardCanvas({
  initialElements,
  initialAppState,
  initialFileRefs,
  viewOnly = false,
  remoteSnapshot,
  onChange,
  theme = "dark",
}: WhiteboardCanvasProps) {
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const lastVersionRef = useRef<number | null>(null);
  /**
   * Ids de archivos que ya cargamos en Excalidraw vía `addFiles`. Sirve para
   * no fetchear dos veces la misma URL si llega varias veces el mismo fileId
   * en updates remotos.
   */
  const loadedFileIdsRef = useRef<Set<string>>(new Set());

  // ── Hidratación de fileRefs iniciales ───────────────────
  // Al montar (o cuando llega `initialFileRefs`), descargamos cada imagen
  // referenciada, la convertimos a dataURL y la registramos en Excalidraw.
  useEffect(() => {
    if (!initialFileRefs) return;
    void hydrateFileRefs(initialFileRefs);
    // initialFileRefs es estable en práctica (solo cambia al re-montar);
    // dejarlo en deps puede causar refetches por ref de identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialFileRefs ?? {})]);

  // Si llega un snapshot remoto nuevo, hidratamos eventuales fileRefs nuevos
  // y luego pisamos la escena.
  useEffect(() => {
    if (!remoteSnapshot) return;
    if (!apiRef.current) return;
    if (lastVersionRef.current === remoteSnapshot.version) return;
    lastVersionRef.current = remoteSnapshot.version;

    const apply = async () => {
      if (remoteSnapshot.fileRefs) {
        await hydrateFileRefs(remoteSnapshot.fileRefs);
      }
      const safeAppState = sanitizeAppState(remoteSnapshot.appState);
      apiRef.current?.updateScene({
        elements: remoteSnapshot.elements,
        ...(safeAppState ? { appState: safeAppState } : {}),
      });
    };
    void apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSnapshot?.version]);

  async function hydrateFileRefs(
    refs: Record<string, { url: string; mimeType: string }>
  ) {
    const api = apiRef.current;
    if (!api?.addFiles) return;
    const pending: ExcalidrawBinaryFiles[string][] = [];
    const entries = Object.entries(refs);
    for (const [fileId, ref] of entries) {
      if (loadedFileIdsRef.current.has(fileId)) continue;
      try {
        const dataURL = await fetchAsDataURL(ref.url);
        pending.push({
          id: fileId,
          mimeType: ref.mimeType,
          dataURL,
          created: Date.now(),
        });
        loadedFileIdsRef.current.add(fileId);
      } catch {
        // si una imagen falla, seguimos con las demás.
      }
    }
    if (pending.length > 0) {
      api.addFiles(pending);
    }
  }

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      onChange?.(
        elements as readonly ExcalidrawElement[],
        appState as ExcalidrawAppState,
        (files ?? {}) as ExcalidrawBinaryFiles
      );
    },
    [onChange]
  );

  const safeInitialAppState = sanitizeAppState(initialAppState);

  return (
    <Excalidraw
      // `initialData` solo se lee al montar; cambios posteriores se aplican
      // vía updateScene (ver useEffect arriba). Los `files` los inyectamos
      // con `addFiles` desde `hydrateFileRefs` para no embeber dataURLs en
      // el initialData (que se vuelve pesado y se duplica con cada update).
      initialData={{
        elements: initialElements as unknown as never,
        appState: (safeInitialAppState ?? undefined) as unknown as never,
        scrollToContent: true,
      }}
      onChange={handleChange}
      viewModeEnabled={viewOnly}
      theme={theme}
      // Lo apagamos porque al estar dentro de un modal con overflow no nos
      // sirve que escuche scroll global; además ya manejamos resize manual.
      detectScroll={false}
      excalidrawAPI={(api) => {
        apiRef.current = api as unknown as ExcalidrawApi;
      }}
    />
  );
}

/**
 * Descarga una URL relativa (servida por el back via NPM) y la convierte a
 * dataURL base64. Excalidraw necesita dataURL para renderizar las imágenes
 * embebidas en la escena.
 */
async function fetchAsDataURL(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
