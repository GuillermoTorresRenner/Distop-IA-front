import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useBlocker, type Location } from "react-router";
import { ConfirmDialog } from "~/components/common/confirm-dialog";

interface Options {
  /**
   * Si `true`, hay cambios sin guardar y se debe interceptar la navegación
   * y el cierre de pestaña. Si `false`, el guard se mantiene inactivo y
   * todas las salidas son inmediatas.
   */
  dirty: boolean;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Intercepta intentos de salida (navegación interna con React Router y
 * `beforeunload` del browser) mientras `dirty=true`. Para navegaciones
 * internas muestra un ConfirmDialog con la paleta del proyecto; para
 * cierres de pestaña o recargas usa el diálogo nativo del navegador (no
 * permite custom UI por seguridad).
 *
 * Uso:
 * ```tsx
 * const { dialog } = useUnsavedChangesGuard({ dirty: hasChanges });
 * return <>{...} {dialog}</>;
 * ```
 *
 * El consumidor puede desactivar el guard temporalmente (ej. justo después
 * de guardar y antes de navegar) seteando `dirty=false` antes del navigate.
 */
export function useUnsavedChangesGuard({
  dirty,
  title = "Cambios sin guardar",
  description = "Tienes cambios en la hoja del personaje que aún no se guardaron. Si sales ahora se perderán.",
  confirmLabel = "Salir sin guardar",
  cancelLabel = "Seguir editando",
}: Options) {
  const blocker = useBlocker(
    useCallback(
      ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: Location;
        nextLocation: Location;
      }) => dirty && currentLocation.pathname !== nextLocation.pathname,
      [dirty],
    ),
  );

  // Aviso nativo del browser (cerrar pestaña / recargar / cambiar URL).
  // No se puede personalizar el texto; el navegador muestra el suyo.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Algunos navegadores aún esperan que `returnValue` se asigne.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const [loading] = useState(false);
  const open = blocker.state === "blocked";

  const dialog = (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone="danger"
      loading={loading}
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );

  return { dialog };
}
