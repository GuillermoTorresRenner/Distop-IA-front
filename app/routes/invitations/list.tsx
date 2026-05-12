import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import {
  acceptInvitation,
  listMyInvitations,
} from "~/lib/api/chronicles/chronicles.api";
import type { MyInvitation } from "~/lib/api/chronicles/chronicles.types";

export function meta() {
  return [{ title: "Invitaciones · Distop-IA VTT" }];
}

export default function InvitationsListRoute() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listMyInvitations()
      .then(setItems)
      .catch((err) =>
        setError(extractAuthError(err, "No se pudieron cargar las invitaciones")),
      )
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAccept(invitation: MyInvitation) {
    setAcceptingId(invitation.id);
    setError(null);
    try {
      const res = await acceptInvitation(invitation.token);
      navigate(`/chronicles/${res.chronicleId}`);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo aceptar la invitación"));
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Convocatorias"
        title="Invitaciones"
        description="Mensajes sellados que aguardan tu respuesta."
      />

      {error ? <FormAlert message={error} className="mb-6" /> : null}

      {loading ? (
        <p className="font-serif italic text-muted-foreground">Revisando los pactos pendientes...</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
          <p className="font-heading text-lg uppercase tracking-widest text-muted-foreground">
            Sin invitaciones
          </p>
          <p className="mt-2 font-serif italic text-muted-foreground">
            Nadie te ha convocado aún. Vuelve más tarde o crea tu propia crónica.
          </p>
          <Link to="/chronicles" className="mt-4 inline-block">
            <Button variant="outline">Volver a crónicas</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-5 shadow-sm shadow-black/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-heading text-xs uppercase tracking-[0.3em] text-blood">
                  {inv.chronicle.setting || "Crónica"}
                </p>
                <h3 className="font-heading text-xl uppercase tracking-wide text-foreground">
                  {inv.chronicle.name}
                </h3>
                <p className="font-serif text-sm italic text-muted-foreground">
                  Invitado por {inv.invitedBy.nickname} · expira{" "}
                  {new Date(inv.expiresAt).toLocaleString("es-CL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <Button
                disabled={acceptingId === inv.id}
                onClick={() => handleAccept(inv)}
                className="bg-blood text-blood-foreground hover:bg-blood/90"
              >
                {acceptingId === inv.id ? "Aceptando..." : "Aceptar"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
