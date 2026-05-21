import { Check } from "lucide-react";
import { cn } from "~/lib/utils";
import { WIZARD_STEPS } from "./wizard-state";

interface WizardStepperProps {
  /** Índice del paso activo. */
  current: number;
}

/**
 * Barra horizontal con los pasos del wizard. Indica visualmente qué
 * pasos quedaron completados (antes del actual) y cuál está activo.
 */
export function WizardStepper({ current }: WizardStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {WIZARD_STEPS.map((step, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs font-display",
                isActive && "border-blood bg-blood text-blood-foreground shadow-md shadow-blood/30",
                isDone && "border-blood/60 bg-blood/15 text-blood",
                !isActive && !isDone && "border-border/60 bg-background/40 text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-3.5" /> : step.short}
            </span>
            <span
              className={cn(
                "hidden font-heading text-xs uppercase tracking-widest sm:inline",
                isActive ? "text-foreground" : isDone ? "text-foreground/70" : "text-muted-foreground",
              )}
            >
              {step.title}
            </span>
            {i < WIZARD_STEPS.length - 1 ? (
              <span
                className={cn(
                  "mx-1 hidden h-px w-6 sm:inline-block",
                  isDone ? "bg-blood/60" : "bg-border/60",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
