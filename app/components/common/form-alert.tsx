import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

interface FormAlertProps {
  kind?: "error" | "success";
  message: string;
  className?: string;
}

export function FormAlert({ kind = "error", message, className }: FormAlertProps) {
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <Alert
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        kind === "error"
          ? "border-destructive/60 bg-destructive/10 text-destructive"
          : "border-emerald-700/40 bg-emerald-900/20 text-emerald-300",
        className
      )}
    >
      <Icon className="size-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
