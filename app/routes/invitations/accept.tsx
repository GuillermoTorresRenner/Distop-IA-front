import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import {
  acceptInvitation,
  previewInvitation,
} from "~/lib/api/chronicles/chronicles.api";
import type { InvitationPreview } from "~/lib/api/chronicles/chronicles.types";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Aceptar invitación · Distop-IA VTT" }];
}

export default function AcceptInvitationRoute() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    previewInvitation(token)
      .then(setPreview)
      .catch((err) => setError(extractAuthError(err, "Invitación no encontrada")))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await acceptInvitation(token);
      navigate(`/chronicles/${res.chronicleId}`, { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo aceptar la invitación"));
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return <p className="font-serif italic text-muted-foreground">Validando invitación...</p>;
  }

  if (error || !preview) {
    return (
      <section className="mx-auto max-w-xl">
        <PageHeader eyebrow="Convocatoria" title="Invitación inválida" />
        <FormAlert message={error ?? "La invitación no existe o ha expirado."} />
        <div className="mt-6">
          <Link to="/chronicles">
            <Button variant="outline">Volver a crónicas</Button>
          </Link>
        </div>
      </section>
    );
  }

  const emailMatches =
    user?.email.toLowerCase() === preview.email.toLowerCase();

  return (
    <section className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="Convocatoria"
        title={`Te invitan a "${preview.chronicle.name}"`}
        description={
          preview.chronicle.description ?? "Una nueva crónica espera tu respuesta."
        }
      />

      <article className="rounded-lg border border-border/60 bg-card/70 p-6 shadow-sm shadow-black/30">
        <dl className="space-y-3 font-serif text-sm text-muted-foreground">
          <div>
            <dt className="text-xs uppercase tracking-widest text-blood">Crónica</dt>
            <dd className="font-heading text-lg uppercase tracking-wide text-foreground">
              {preview.chronicle.name}
            </dd>
            {preview.chronicle.setting ? (
              <p className="italic">{preview.chronicle.setting}</p>
            ) : null}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-blood">Narrador</dt>
            <dd className="text-foreground">{preview.invitedBy.nickname}</dd>
            <dd className="font-serif text-xs italic text-muted-foreground">
              {preview.invitedBy.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-blood">Dirigida a</dt>
            <dd className="text-foreground">{preview.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-blood">Estado</dt>
            <dd className="text-foreground">{preview.status}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-blood">Caduca</dt>
            <dd>
              {new Date(preview.expiresAt).toLocaleString("es-CL", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3">
          {preview.status !== "PENDING" ? (
            <FormAlert
              kind={preview.status === "ACCEPTED" ? "success" : "error"}
              message={`Esta invitación está marcada como ${preview.status}.`}
            />
          ) : null}

          {preview.status === "PENDING" && !emailMatches ? (
            <FormAlert
              message={`La invitación está dirigida a ${preview.email}. Tu sesión actual usa ${user?.email}. Inicia sesión con la cuenta correcta.`}
            />
          ) : null}

          <Button
            disabled={
              accepting || preview.status !== "PENDING" || !emailMatches
            }
            onClick={handleAccept}
            className="w-full bg-blood text-blood-foreground hover:bg-blood/90"
          >
            {accepting ? <Loader2 className="size-4 animate-spin" /> : null}
            Aceptar el pacto
          </Button>
        </div>
      </article>
    </section>
  );
}
