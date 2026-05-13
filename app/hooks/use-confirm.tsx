import { useCallback, useState, type ReactNode } from "react";
import {
  ConfirmDialog,
  type ConfirmTone,
} from "~/components/common/confirm-dialog";

interface ConfirmRequest {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface State extends ConfirmRequest {
  open: boolean;
  loading: boolean;
  resolver: ((value: boolean) => void) | null;
}

/**
 * Hook para reemplazar `window.confirm` con un modal estilizado.
 *
 * ```tsx
 * const { confirm, dialog } = useConfirm();
 * const ok = await confirm({ title: "¿Eliminar?", tone: "danger" });
 * if (ok) { ... }
 * return <>{...} {dialog}</>;
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<State>({
    open: false,
    loading: false,
    title: "",
    resolver: null,
  });

  const confirm = useCallback((req: ConfirmRequest): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        ...req,
        open: true,
        loading: false,
        resolver: resolve,
      });
    });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((s) => ({ ...s, loading }));
  }, []);

  const handleCancel = useCallback(() => {
    state.resolver?.(false);
    setState((s) => ({ ...s, open: false, loading: false, resolver: null }));
  }, [state]);

  const handleConfirm = useCallback(() => {
    state.resolver?.(true);
    setState((s) => ({ ...s, open: false, loading: false, resolver: null }));
  }, [state]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      tone={state.tone}
      loading={state.loading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog, setLoading };
}
