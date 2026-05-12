import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Logo } from "./logo";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md border-border/60 bg-card/80 backdrop-blur shadow-2xl shadow-black/40">
      <CardHeader className="space-y-4 text-center">
        <Logo showTagline />
        <div className="space-y-1.5">
          <CardTitle className="font-heading text-2xl uppercase tracking-widest">
            {title}
          </CardTitle>
          {description ? (
            <CardDescription className="font-serif text-base italic">
              {description}
            </CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {footer ? (
        <div className="px-6 pb-6 pt-0 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
