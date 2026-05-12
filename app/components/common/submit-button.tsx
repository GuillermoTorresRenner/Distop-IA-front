import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function SubmitButton({
  loading,
  loadingText,
  children,
  disabled,
  className,
  ...rest
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || loading}
      className={cn(
        "w-full bg-blood text-blood-foreground font-heading uppercase tracking-[0.3em] hover:bg-blood/90",
        className
      )}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingText ?? "Procesando..."}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
