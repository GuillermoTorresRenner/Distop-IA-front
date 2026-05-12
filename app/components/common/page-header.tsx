import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="font-heading text-xs uppercase tracking-[0.4em] text-blood">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-3xl uppercase tracking-wide text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="font-serif text-base italic text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
