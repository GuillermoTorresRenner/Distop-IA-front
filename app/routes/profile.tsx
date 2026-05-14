import { Loader2, PencilLine, Save, UserCircle2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { extractAuthError } from "~/components/common/auth-error";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { ImageUploader } from "~/components/common/image-uploader";
import { PageHeader } from "~/components/common/page-header";
import { Button } from "~/components/ui/button";
import {
  deleteUserAvatar,
  updateUser,
  uploadUserAvatar,
} from "~/lib/api/users/users.api";
import { useUserStore } from "~/stores/user.store";

export function meta() {
  return [{ title: "Mi santuario · Distop-IA VTT" }];
}

const NICKNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

export default function ProfileRoute() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user) {
    return (
      <p className="text-muted-foreground">Cargando perfil...</p>
    );
  }

  async function handleUpload(file: File) {
    if (!user) return;
    const updated = await uploadUserAvatar(user.id, file);
    setUser({ ...user, ...updated });
  }

  async function handleRemove() {
    if (!user) return;
    const updated = await deleteUserAvatar(user.id);
    setUser({ ...user, ...updated });
  }

  function startEdit() {
    setNickname(user?.nickname ?? "");
    setError(null);
    setSuccess(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!NICKNAME_REGEX.test(nickname)) {
      setError(
        "El nickname debe tener entre 3 y 30 caracteres y solo puede contener letras, números, guion bajo (_) o guion (-).",
      );
      return;
    }
    if (nickname === user.nickname) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateUser(user.id, { nickname });
      setUser({ ...user, ...updated });
      setSuccess("Nickname actualizado.");
      setEditing(false);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo actualizar el nickname"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Vástago"
        title="Mi santuario"
        description="Gestiona tu presencia en la noche eterna."
      />

      {success ? <FormAlert kind="success" message={success} /> : null}

      <article className="rounded-lg border border-border/60 bg-card/70 p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase tracking-[0.3em] text-blood">
          <UserCircle2 className="size-4" /> Retrato
        </h2>
        <p className="mb-4 font-serif text-sm italic text-muted-foreground">
          Tu avatar aparecerá junto a tu sesión y al lado de tu nombre en las crónicas en las que participes (JPEG, PNG, WebP o GIF, máx. 5 MB).
        </p>
        <ImageUploader
          currentUrl={user.avatar}
          onUpload={handleUpload}
          onRemove={handleRemove}
          shape="circle"
          maxSizeMb={5}
          emptyHint="Sin retrato"
          uploadLabel="Subir retrato"
        />
      </article>

      <article className="rounded-lg border border-border/60 bg-card/70 p-4 sm:p-6">
        <h2 className="mb-4 font-heading text-xs uppercase tracking-[0.3em] text-blood">
          Identidad
        </h2>

        {editing ? (
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {error ? <FormAlert message={error} /> : null}
            <FormField
              label="Nickname"
              name="nickname"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_-]{3,30}"
              hint="3-30 caracteres. Letras, números, _ y -."
            />
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-blood text-blood-foreground hover:bg-blood/90"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Guardar
              </Button>
              <Button type="button" variant="ghost" onClick={cancelEdit}>
                <X className="size-4" /> Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <dl className="space-y-3 font-serif text-sm text-muted-foreground">
            <div>
              <dt className="text-xs uppercase tracking-widest">Nickname</dt>
              <dd className="flex items-center gap-2 text-foreground">
                <span className="font-heading text-base text-foreground">
                  {user.nickname}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEdit}
                  className="ml-1"
                  aria-label="Editar nickname"
                >
                  <PencilLine className="size-4" /> Editar
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest">Correo</dt>
              <dd className="text-foreground">{user.email}</dd>
            </div>
          </dl>
        )}
      </article>
    </section>
  );
}
