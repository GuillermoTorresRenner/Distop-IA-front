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
type ExcalidrawApi = {
  updateScene: (scene: {
    elements?: readonly unknown[];
    appState?: Record<string, unknown>;
  }) => void;
};

export interface WhiteboardCanvasProps {
  initialElements: readonly unknown[];
  initialAppState?: Record<string, unknown> | null;
  viewOnly?: boolean;
  /**
   * Snapshot remoto que el componente debe pisar sobre la escena (solo cuando
   * viewOnly = true y el narrador empuja un update). Se reemplaza por su
   * `version` numérico monotónico (cambia → forzamos updateScene).
   */
  remoteSnapshot?: {
    elements: readonly unknown[];
    appState: Record<string, unknown> | null;
    version: number;
  };
  /**
   * Llamado en cada cambio cuando viewOnly = false. Solo se usa para el
   * narrador, que persiste/empuja por WS desde fuera con debounce.
   */
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: ExcalidrawAppState
  ) => void;
  theme?: "light" | "dark";
}

export default function WhiteboardCanvas({
  initialElements,
  initialAppState,
  viewOnly = false,
  remoteSnapshot,
  onChange,
  theme = "dark",
}: WhiteboardCanvasProps) {
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const lastVersionRef = useRef<number | null>(null);

  // Si llega un snapshot remoto nuevo, pisamos la escena.
  useEffect(() => {
    if (!remoteSnapshot) return;
    if (!apiRef.current) return;
    if (lastVersionRef.current === remoteSnapshot.version) return;
    lastVersionRef.current = remoteSnapshot.version;
    apiRef.current.updateScene({
      elements: remoteSnapshot.elements,
      ...(remoteSnapshot.appState ? { appState: remoteSnapshot.appState } : {}),
    });
  }, [remoteSnapshot]);

  const handleChange = useCallback(
    (elements: readonly unknown[], appState: unknown) => {
      onChange?.(
        elements as readonly ExcalidrawElement[],
        appState as ExcalidrawAppState
      );
    },
    [onChange]
  );

  return (
    <Excalidraw
      // `initialData` solo se lee al montar; cambios posteriores se aplican
      // vía updateScene (ver useEffect arriba).
      initialData={{
        elements: initialElements as unknown as never,
        appState: (initialAppState ?? undefined) as unknown as never,
        scrollToContent: true,
      }}
      onChange={handleChange}
      viewModeEnabled={viewOnly}
      theme={theme}
      // Lo apagamos porque al estar dentro de un modal con overflow no nos
      // sirve que escuche scroll global; además ya manejamos resize manual.
      detectScroll={false}
      excalidrawAPI={(api) => {
        apiRef.current = api as ExcalidrawApi;
      }}
    />
  );
}
