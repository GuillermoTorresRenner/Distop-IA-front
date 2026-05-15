import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn } from "~/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
}

interface ToastContextValue {
  show: (
    message: string,
    options?: { tone?: ToastTone; duration?: number },
  ) => number;
  success: (message: string, duration?: number) => number;
  error: (message: string, duration?: number) => number;
  info: (message: string, duration?: number) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Toaster global anclado al fondo de la pantalla (centro). Se usa para
 * feedback de acciones (ej. "Hoja guardada") donde un mensaje arriba pasa
 * desapercibido porque el ojo del usuario está en el footer / botón.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    (message, options) => {
      const id = ++seq.current;
      const item: ToastItem = {
        id,
        message,
        tone: options?.tone ?? "info",
        duration: options?.duration ?? 3200,
      };
      setToasts((cur) => [...cur, item]);
      return id;
    },
    [],
  );

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, { tone: "success", duration: d }),
    error: (m, d) => show(m, { tone: "error", duration: d }),
    info: (m, d) => show(m, { tone: "info", duration: d }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <ToastViewport toasts={toasts} onDismiss={dismiss} />,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-2 sm:bottom-6"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), Math.max(item.duration - 250, 0));
    const t2 = setTimeout(() => onDismiss(item.id), item.duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [item.duration, item.id, onDismiss]);

  const toneStyles = TONE_STYLES[item.tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg shadow-black/40 backdrop-blur-sm transition-all duration-200",
        toneStyles.container,
        leaving
          ? "translate-y-2 opacity-0"
          : "translate-y-0 opacity-100",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", toneStyles.icon)}>
        {item.tone === "success" ? (
          <CheckCircle2 className="size-4" />
        ) : item.tone === "error" ? (
          <CircleAlert className="size-4" />
        ) : (
          <Info className="size-4" />
        )}
      </span>
      <p className="flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Cerrar"
        className="-mr-1 -mt-1 ml-1 rounded p-1 text-muted-foreground transition hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

const TONE_STYLES: Record<
  ToastTone,
  { container: string; icon: string }
> = {
  success: {
    container: "border-emerald-500/40 bg-emerald-950/85 text-emerald-50",
    icon: "text-emerald-400",
  },
  error: {
    container: "border-blood/50 bg-card/95 text-foreground",
    icon: "text-blood",
  },
  info: {
    container: "border-border/70 bg-card/95 text-foreground",
    icon: "text-muted-foreground",
  },
};
