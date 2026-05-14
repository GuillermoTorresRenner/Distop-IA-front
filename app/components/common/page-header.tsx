import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-border/60 pb-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="font-heading text-[0.65rem] uppercase tracking-[0.3em] text-blood sm:text-xs sm:tracking-[0.4em]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-2xl uppercase tracking-wide text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm italic text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
