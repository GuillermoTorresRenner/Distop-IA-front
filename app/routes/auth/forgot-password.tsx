import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { AuthCard } from "~/components/common/auth-card";
import { FormAlert } from "~/components/common/form-alert";
import { FormField } from "~/components/common/form-field";
import { SubmitButton } from "~/components/common/submit-button";
import { extractAuthError } from "~/components/common/auth-error";
import { forgotPassword } from "~/lib/api/auth/auth.api";

export function meta() {
  return [{ title: "Recuperar contraseña · Distop-IA VTT" }];
}

export default function ForgotPasswordRoute() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      setSuccess(
        res.message ??
          "Si el correo existe en nuestro grimorio, recibirás un enlace para recuperar tu acceso."
      );
    } catch (err) {
      setError(extractAuthError(err, "No se pudo procesar la solicitud"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Sangre olvidada"
      description="Un mensaje sellado llegará a tu correo con instrucciones de recuperación."
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
        <FormField
          label="Correo"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@dominio.com"
        />
        <SubmitButton loading={loading} loadingText="Enviando...">
          Enviar enlace
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
