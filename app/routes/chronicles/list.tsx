import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ChronicleCard } from "~/components/chronicles/chronicle-card";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { extractAuthError } from "~/components/common/auth-error";
import { Button } from "~/components/ui/button";
import { listMyChronicles } from "~/lib/api/chronicles/chronicles.api";
import type { ChronicleListItem } from "~/lib/api/chronicles/chronicles.types";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Crónicas · Distop-IA VTT" }];
}

export default function ChroniclesListRoute() {
  const user = useUserStore((s) => s.user);
  const [items, setItems] = useState<ChronicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    listMyChronicles()
      .then((data) => {
        if (mounted) setItems(data);
      })
      .catch((err) => {
        if (mounted) setError(extractAuthError(err, "No se pudieron cargar las crónicas"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section>
      <PageHeader
        eyebrow="Tu manada"
        title="Crónicas"
        description="Historias activas donde participas como Narrador o vástago."
        actions={
          <Link to="/chronicles/new">
            <Button className="bg-blood text-blood-foreground hover:bg-blood/90">
              <Plus className="size-4" />
              Nueva crónica
            </Button>
          </Link>
        }
      />

      {error ? <FormAlert message={error} className="mb-6" /> : null}

      {loading ? (
        <p className="font-serif italic text-muted-foreground">Convocando crónicas...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
          <p className="font-heading text-lg uppercase tracking-widest text-muted-foreground">
            La noche está en silencio
          </p>
          <p className="mt-2 font-serif italic text-muted-foreground">
            Aún no participas en ninguna crónica. Crea una nueva o espera una invitación.
          </p>
          <Link to="/chronicles/new" className="mt-4 inline-block">
            <Button className="bg-blood text-blood-foreground hover:bg-blood/90">
              <Plus className="size-4" />
              Crear primera crónica
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((chronicle) => (
            <ChronicleCard
              key={chronicle.id}
              chronicle={chronicle}
              currentUserId={user?.id ?? ""}
            />
          ))}
        </div>
      )}
    </section>
  );
}
