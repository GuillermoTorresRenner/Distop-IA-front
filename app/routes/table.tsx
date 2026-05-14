import { Dice5 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "~/components/common/page-header";
import { FormAlert } from "~/components/common/form-alert";
import { extractAuthError } from "~/components/common/auth-error";
import { Button } from "~/components/ui/button";
import { listMyChronicles } from "~/lib/api/chronicles/chronicles.api";
import type { ChronicleListItem } from "~/lib/api/chronicles/chronicles.types";

export function meta() {
  return [{ title: "Mesa Virtual · Distop-IA VTT" }];
}

export default function TableHubRoute() {
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
        if (mounted)
          setError(extractAuthError(err, "No se pudieron cargar las crónicas"));
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
        eyebrow="Tablero"
        title="Mesa Virtual"
        description="Cada crónica tiene su propia mesa. Entra a la que vayas a jugar."
      />

      {error ? <FormAlert message={error} className="mb-6" /> : null}

      {loading ? (
        <p className="font-serif italic text-muted-foreground">
          Convocando crónicas...
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Dice5 className="mx-auto mb-3 size-10 text-blood" />
          <p className="font-serif text-muted-foreground">
            Aún no estás en ninguna crónica. Crea una o acepta una invitación
            primero.
          </p>
          <Link to="/chronicles" className="mt-4 inline-block">
            <Button variant="outline">Ir a Crónicas</Button>
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <h3 className="font-heading text-lg uppercase tracking-wider">
                  {c.name}
                </h3>
                {c.setting ? (
                  <p className="font-serif text-sm italic text-muted-foreground">
                    {c.setting}
                  </p>
                ) : null}
              </div>
              <Link to={`/chronicles/${c.id}/table`} className="mt-auto">
                <Button className="w-full bg-blood text-blood-foreground hover:bg-blood/90">
                  <Dice5 className="size-4" />
                  Entrar a la mesa
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
