import { Droplet } from "lucide-react";
import { cn } from "~/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
}

export function Logo({ className, iconClassName, textClassName, showTagline }: LogoProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 text-foreground", className)}>
      <div className="flex items-center gap-3">
        <Droplet
          aria-hidden
          className={cn("size-7 fill-blood text-blood drop-shadow-[0_0_12px_var(--blood)]", iconClassName)}
        />
        <span
          className={cn(
            "font-heading text-3xl font-semibold uppercase tracking-[0.32em] text-shadow-blood",
            textClassName
          )}
        >
          Distop-IA
        </span>
      </div>
      {showTagline ? (
        <p className="font-serif text-sm italic tracking-wide text-muted-foreground">
          La Mascarada · Mesa de Sombras
        </p>
      ) : null}
    </div>
  );
}
