import {
  BookOpen,
  Crown,
  Image as ImageIcon,
  Loader2,
  Mail,
  Send,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { ImageUploader } from "~/components/common/image-uploader";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import {
  cancelInvitation,
  deleteChronicle,
  deleteChronicleImage,
  getChronicle,
  inviteToChronicle,
  removeMember,
  uploadChronicleImage,
} from "~/lib/api/chronicles/chronicles.api";
import type { Chronicle } from "~/lib/api/chronicles/chronicles.types";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Crónica · Distop-IA VTT" }];
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function ChronicleDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const [chronicle, setChronicle] = useState<Chronicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    try {
      const data = await getChronicle(id);
      setChronicle(data);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo cargar la crónica"));
    }
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getChronicle(id)
      .then(setChronicle)
      .catch((err) => setError(extractAuthError(err, "No se pudo cargar la crónica")))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <p className="font-serif italic text-muted-foreground">Cargando crónica...</p>
    );
  }

  if (error || !chronicle) {
    return <FormAlert message={error ?? "Crónica no disponible"} />;
  }

  const isNarrator = chronicle.narratorId === user?.id;

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);
    try {
      const inv = await inviteToChronicle(id, inviteEmail.trim());
      setInviteSuccess(
        inv.invitedUser
          ? `Invitación enviada a ${inv.email} (usuario registrado).`
          : `Invitación enviada a ${inv.email}. Recibirá un enlace de registro.`,
      );
      setInviteEmail("");
      await reload();
    } catch (err) {
      setInviteError(extractAuthError(err, "No se pudo enviar la invitación"));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCancel(invitationId: string) {
    if (!id) return;
    if (!confirm("¿Cancelar esta invitación?")) return;
    try {
      await cancelInvitation(id, invitationId);
      await reload();
    } catch (err) {
      setInviteError(extractAuthError(err, "No se pudo cancelar la invitación"));
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!id) return;
    if (!confirm("¿Expulsar a este miembro de la crónica?")) return;
    try {
      await removeMember(id, userId);
      await reload();
    } catch (err) {
      setError(extractAuthError(err, "No se pudo expulsar al miembro"));
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm("¿Eliminar la crónica permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      await deleteChronicle(id);
      navigate("/chronicles", { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo eliminar la crónica"));
    }
  }

  async function handleUploadImage(file: File) {
    if (!id) return;
    const updated = await uploadChronicleImage(id, file);
    setChronicle((prev) => (prev ? { ...prev, image: updated.image } : prev));
  }

  async function handleRemoveImage() {
    if (!id) return;
    const updated = await deleteChronicleImage(id);
    setChronicle((prev) => (prev ? { ...prev, image: updated.image } : prev));
  }

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow={chronicle.setting || "Crónica"}
        title={chronicle.name}
        description={chronicle.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={`/chronicles/${chronicle.id}/journal`}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <BookOpen className="size-4" /> Bitácora
            </Link>
            {isNarrator ? (
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                Disolver
              </Button>
            ) : null}
          </div>
        }
      />

      {chronicle.image && !isNarrator ? (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <img
            src={chronicle.image}
            alt={`Cubierta de ${chronicle.name}`}
            className="aspect-video w-full object-cover"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              <Users className="size-4" /> Miembros ({chronicle.members.length})
            </h2>
            <ul className="space-y-2">
              {chronicle.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-blood/20 text-sm font-semibold uppercase text-blood">
                      {member.user.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        member.user.nickname.charAt(0)
                      )}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{member.user.nickname}</p>
                      <p className="font-serif text-xs italic text-muted-foreground">
                        {member.user.email} · se unió el {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === "NARRATOR" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blood/40 bg-blood/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-blood">
                        <Crown className="size-3" /> Narrador
                      </span>
                    ) : (
                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Jugador
                      </span>
                    )}
                    {isNarrator && member.role !== "NARRATOR" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.user.id)}
                        aria-label="Expulsar miembro"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-border/60 bg-card/70 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
              <Mail className="size-4" /> Invitaciones pendientes ({chronicle.invitations.length})
            </h2>
            {chronicle.invitations.length === 0 ? (
              <p className="font-serif italic text-muted-foreground">
                Sin invitaciones pendientes.
              </p>
            ) : (
              <ul className="space-y-2">
                {chronicle.invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">{inv.email}</p>
                      <p className="font-serif text-xs italic text-muted-foreground">
                        {inv.invitedUser
                          ? "Usuario registrado"
                          : "Pendiente de registro"}
                        {" · expira "}
                        {formatDate(inv.expiresAt)}
                      </p>
                    </div>
                    {isNarrator ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(inv.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          {isNarrator ? (
            <article className="rounded-lg border border-border/60 bg-card/70 p-5">
              <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
                <ImageIcon className="size-4" /> Cubierta
              </h2>
              <p className="mb-4 font-serif text-sm italic text-muted-foreground">
                Sube una imagen representativa para la crónica (JPEG, PNG, WebP o GIF, máx. 8 MB).
              </p>
              <ImageUploader
                currentUrl={chronicle.image}
                onUpload={handleUploadImage}
                onRemove={handleRemoveImage}
                shape="rectangle"
                maxSizeMb={8}
                emptyHint="Sin cubierta"
                uploadLabel="Subir cubierta"
              />
            </article>
          ) : null}

          {isNarrator ? (
            <article className="rounded-lg border border-border/60 bg-card/70 p-5">
              <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
                <Send className="size-4" /> Invitar a la mesa
              </h2>
              <p className="mb-4 font-serif text-sm italic text-muted-foreground">
                Si el correo ya existe en el sistema, recibirá un enlace para aceptar. Si no, se enviará una invitación con instrucciones de registro.
              </p>
              <form onSubmit={handleInvite} noValidate className="space-y-3">
                {inviteError ? <FormAlert message={inviteError} /> : null}
                {inviteSuccess ? <FormAlert kind="success" message={inviteSuccess} /> : null}
                <FormField
                  label="Correo del jugador"
                  name="email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="vastago@dominio.com"
                />
                <Button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full bg-blood text-blood-foreground hover:bg-blood/90"
                >
                  {inviteLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Enviar invitación
                </Button>
              </form>
            </article>
          ) : null}

          <article className="rounded-lg border border-border/60 bg-card/70 p-5 text-sm">
            <h2 className="mb-3 font-heading text-xs uppercase tracking-[0.3em] text-blood">
              Datos
            </h2>
            <dl className="space-y-2 font-serif text-sm text-muted-foreground">
              <div>
                <dt className="text-xs uppercase tracking-widest">Narrador</dt>
                <dd className="text-foreground">{chronicle.narrator.nickname}</dd>
                <dd className="font-serif text-xs italic text-muted-foreground">
                  {chronicle.narrator.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest">Creada</dt>
                <dd>{formatDate(chronicle.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest">Actualizada</dt>
                <dd>{formatDate(chronicle.updatedAt)}</dd>
              </div>
            </dl>
          </article>
        </aside>
      </div>
    </section>
  );
}
