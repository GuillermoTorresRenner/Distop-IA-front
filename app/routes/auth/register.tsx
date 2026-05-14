import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AuthCard } from "~/components/common/auth-card";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { SubmitButton } from "~/components/common/submit-button";
import { extractAuthError } from "~/components/common/auth-error";
import { register } from "~/lib/api/auth/auth.api";
import { previewInvitation } from "~/lib/api/chronicles/chronicles.api";
import type { InvitationPreview } from "~/lib/api/chronicles/chronicles.types";

export function meta() {
  return [{ title: "Crear cuenta · Distop-IA VTT" }];
}

export default function RegisterRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const nextParam = searchParams.get("next");

  const [invite, setInvite] = useState<InvitationPreview | null>(null);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    previewInvitation(inviteToken)
      .then((p) => {
        setInvite(p);
        setEmail(p.email);
      })
      .catch(() => {
        setError("La invitación no existe o ha expirado.");
      });
  }, [inviteToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(nickname)) {
      setError(
        "El nickname debe tener entre 3 y 30 caracteres y solo puede contener letras, números, guion bajo (_) o guion (-).",
      );
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await register({ email, nickname, password });
      const params = new URLSearchParams();
      params.set("registered", "1");
      params.set("email", email);
      if (inviteToken) {
        params.set("next", `/invitations/${inviteToken}`);
      } else if (nextParam) {
        params.set("next", nextParam);
      }
      navigate(`/login?${params.toString()}`, { replace: true });
    } catch (err) {
      setError(extractAuthError(err, "No se pudo crear la cuenta"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Crear cuenta"
      description={
        invite
          ? `Has sido convocado a "${invite.chronicle.name}". Crea tu cuenta para aceptar.`
          : "Sella tu nombre y comparte la sangre del juego."
      }
      footer={
        <span>
          ¿Ya tienes acceso?{" "}
          <Link
            to={
              inviteToken
                ? `/login?next=${encodeURIComponent(`/invitations/${inviteToken}`)}`
                : nextParam
                  ? `/login?next=${encodeURIComponent(nextParam)}`
                  : "/login"
            }
            className="font-medium text-blood hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </span>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {error ? <FormAlert message={error} /> : null}
        {invite ? (
          <FormAlert
            kind="success"
            message={`Crónica: ${invite.chronicle.name} · Narrador: ${invite.invitedBy.nickname}`}
          />
        ) : null}
        <FormField
          label="Correo"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@dominio.com"
          disabled={!!invite}
          hint={invite ? "Debe coincidir con el correo invitado." : undefined}
        />
        <FormField
          label="Nickname"
          name="nickname"
          type="text"
          autoComplete="username"
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="vlad_dracul"
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_-]{3,30}"
          hint="3-30 caracteres. Letras, números, _ y -."
        />
        <FormField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Mínimo 6 caracteres."
        />
        <FormField
          label="Confirmar contraseña"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <SubmitButton loading={loading} loadingText="Sellando pacto...">
          Crear cuenta
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
