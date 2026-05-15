import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AuthCard } from "~/components/common/auth-card";
import { FormAlert } from "~/components/common/form-alert";
import { PasswordField } from "~/components/common/password-field";
import { SubmitButton } from "~/components/common/submit-button";
import { extractAuthError } from "~/components/common/auth-error";
import { resetPassword } from "~/lib/api/auth/auth.api";

export function meta() {
  return [{ title: "Restablecer contraseña · Distop-IA VTT" }];
}

export default function PasswordRecoveryRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(
        "Falta el token de recuperación en el enlace. Solicita uno nuevo desde el formulario de recuperación."
      );
    }
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
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
      const res = await resetPassword({ token, newPassword: password });
      setSuccess(res.message ?? "Contraseña restablecida correctamente.");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(extractAuthError(err, "No se pudo restablecer la contraseña"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Renovar el vínculo"
      description="Define una nueva contraseña para regresar a la mesa."
      footer={
        <span>
          <Link to="/login" className="font-medium text-blood hover:underline">
            Volver al inicio de sesión
          </Link>
        </span>
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {error ? <FormAlert message={error} /> : null}
        {success ? <FormAlert kind="success" message={success} /> : null}
        <PasswordField
          label="Nueva contraseña"
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Mínimo 6 caracteres."
          disabled={!token}
        />
        <PasswordField
          label="Confirmar contraseña"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={!token}
        />
        <SubmitButton loading={loading} loadingText="Renovando vínculo..." disabled={!token}>
          Restablecer contraseña
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
