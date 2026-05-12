import type { ComponentProps, ReactNode } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string;
  containerClassName?: string;
}

export function FormField({
  label,
  name,
  hint,
  error,
  containerClassName,
  className,
  ...inputProps
}: FormFieldProps) {
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
      <Input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn("h-10 px-3", className)}
        {...inputProps}
      />
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
