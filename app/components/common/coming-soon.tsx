import type { LucideIcon } from "lucide-react";
import { PageHeader } from "./page-header";

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  features?: string[];
}

export function ComingSoon({
  eyebrow,
  title,
  description,
  icon: Icon,
  features = [],
}: ComingSoonProps) {
  return (
    <section>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
        {Icon ? <Icon className="mx-auto mb-3 size-10 text-blood" /> : null}
        <p className="font-heading text-lg uppercase tracking-widest text-muted-foreground">
          La sangre todavía no fluye por aquí
        </p>
        <p className="mt-2 font-serif italic text-muted-foreground">
          Esta sala del santuario está en construcción. Vuelve en una próxima noche.
        </p>
        {features.length ? (
          <ul className="mx-auto mt-6 inline-block space-y-1 text-left font-serif text-sm italic text-muted-foreground">
            {features.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
