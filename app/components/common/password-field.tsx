import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

/**
 * Campo de password con toggle de visibilidad. Mismo contrato visual que
 * <FormField>: label arriba, hint o error abajo, paleta blood en hover/focus
 * del botón del ojito.
 */
interface PasswordFieldProps
  extends Omit<ComponentProps<typeof Input>, "type"> {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
  containerClassName?: string;
}

export function PasswordField({
  label,
  name,
  hint,
  error,
  containerClassName,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const inputId = `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      <Label
        htmlFor={inputId}
        className="font-heading text-xs uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          name={name}
          type={show ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hintId, errorId].filter(Boolean).join(" ") || undefined
          }
          className={cn("h-10 pl-3 pr-10", className)}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={show}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-blood focus:outline-none focus-visible:text-blood"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
