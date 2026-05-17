import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface InfoTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Botón visualmente parecido a un texto plano, pero con feedback al hover
 * (subrayado punteado en color blood) para indicar que es clicable y abre
 * el `InfoModal`. Pensado para envolver el nombre de un atributo, habilidad,
 * disciplina, mérito, etc., en la hoja de personaje.
 */
export const InfoTrigger = forwardRef<HTMLButtonElement, InfoTriggerProps>(
  function InfoTrigger({ className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        className={cn(
          "inline-flex items-baseline gap-1 text-left underline decoration-dotted decoration-blood/40 underline-offset-2 transition-colors hover:decoration-blood hover:text-blood focus:outline-none focus:text-blood",
          className,
        )}
      >
        {children}
      </button>
    );
  },
);
